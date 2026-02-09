import { Router } from 'express';
import { Blob } from 'buffer';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { parseBase64ImagePayload, parseSize, resizeImageToAspectRatio } from '../services/imageProcessing.js';

const router = Router();

const DEFAULT_VIDEO_SIZE = '720x1280';

const SORA_API_BASE = 'https://api.openai.com/v1/videos';

const normalizeSoraResponse = (data) => {
  const metadata = {
    id: data?.id ?? null,
    status: data?.status ?? data?.data?.[0]?.status ?? null,
    created: data?.created ?? data?.created_at ?? null
  };

  let errorDetails = null;
  if (metadata.status === 'failed') {
    errorDetails = data?.error?.message || data?.failure_reason || 'Unknown error';
    console.error('Sora video generation failed:', { id: metadata.id, error: errorDetails });
  }

  let videoUrl = null;
  let videoBase64 = null;

  const candidates = Array.isArray(data?.data) ? data.data : [];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      if (!videoUrl) {
        videoUrl = candidate.url || candidate?.data?.url || candidate?.asset_url || null;
      }
      if (!videoBase64) {
        videoBase64 = candidate?.b64_json || candidate?.data?.b64_json || null;
      }
    }
  }

  if (!videoUrl && data?.video?.url) {
    videoUrl = data.video.url;
  }
  if (!videoUrl && videoBase64) {
    videoUrl = `data:video/mp4;base64,${videoBase64}`;
  }

  let statusMessage = null;
  if (metadata.status === 'failed') {
    statusMessage = `Video generation failed: ${errorDetails}`;
  } else if (!videoUrl) {
    statusMessage = metadata.status
      ? `Video status: ${metadata.status}. Request ID: ${metadata.id ?? 'unknown'}. Try again in a few seconds.`
      : 'Video is still processing. Try again shortly.';
  }

  return { videoUrl, videoBase64, metadata, statusMessage, error: errorDetails };
};

// Gemini image generation
router.post('/api/gemini/generate', authMiddleware, async (req, res) => {
  const { parts, aspectRatio } = req.body || {};

  if (!parts || !Array.isArray(parts)) {
    return res.status(400).json({ message: 'Parts array is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const contents = { parts };
    const config = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      ...(aspectRatio && { imageConfig: { aspectRatio } })
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config
      });
    } catch (_modelError) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents,
          config
        });
      } catch (_fallbackError) {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-preview-image-generation',
          contents,
          config
        });
      }
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        });
      }
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason !== 'STOP' && candidate.safetyRatings) {
      const blockedRating = candidate.safetyRatings.find(rating => rating.blocked);
      if (blockedRating) {
        return res.status(400).json({
          message: `Image generation blocked due to safety settings: ${blockedRating.category}`
        });
      }
    }

    return res.status(500).json({ message: 'API did not return an image.' });
  } catch (error) {
    console.error('Gemini generation error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Veo video generation
router.post('/api/veo/generate', authMiddleware, async (req, res) => {
  const { prompt, imageBase64, aspectRatio } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'Prompt is required.' });
  }
  if (!imageBase64) {
    return res.status(400).json({ message: 'Image is required for video generation.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.match(/data:(image\/\w+);base64/)?.[1] || 'image/jpeg';

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt,
      image: { imageBytes: imageData, mimeType },
      config: { aspectRatio: aspectRatio || '9:16' }
    });

    let attempts = 0;
    const maxAttempts = 72;

    while (!operation.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
      operation = await ai.operations.getVideosOperation({ operation });
      if (operation.done) break;
    }

    if (!operation.done) {
      return res.status(500).json({ message: 'Video generation timed out after 12 minutes.' });
    }

    if (operation.response?.raiMediaFilteredCount > 0) {
      const reasons = operation.response.raiMediaFilteredReasons || ['Content filtered by safety system'];
      return res.status(400).json({ message: 'Video generation blocked by content filter', reasons });
    }

    if (operation.response?.generatedVideos?.length > 0) {
      const videoData = operation.response.generatedVideos[0];
      if (videoData.video) {
        const videoMimeType = videoData.video.mimeType || 'video/mp4';
        let videoBase64;

        if (videoData.video.videoBytes?.length > 0) {
          videoBase64 = `data:${videoMimeType};base64,${videoData.video.videoBytes}`;
        } else if (videoData.video.uri) {
          const fetch = (await import('node-fetch')).default;
          const videoResponse = await fetch(videoData.video.uri, {
            headers: { 'x-goog-api-key': apiKey }
          });
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.status}`);
          }
          const videoBuffer = await videoResponse.buffer();
          videoBase64 = `data:${videoMimeType};base64,${videoBuffer.toString('base64')}`;
        }

        if (videoBase64) {
          return res.json({ video: videoBase64, duration: videoData.duration || null });
        }
      }
    }

    return res.status(500).json({ message: 'API did not return a video in expected format.' });
  } catch (error) {
    console.error('Veo generation error:', error);
    const errorMessage = error.message || '';
    if (errorMessage.includes('person/face generation') || errorMessage.includes('safety settings') || errorMessage.includes('blocked')) {
      return res.status(400).json({
        message: 'Image blocked by safety filter: faces/people detected.',
        isSafetyFilter: true
      });
    }
    res.status(500).json({ message: error.message || 'Video generation failed' });
  }
});

// OpenAI image generation
router.post('/api/openai/generate', authMiddleware, async (req, res) => {
  const { prompt, imageBase64, mode = 'edit' } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    let response;

    if (mode === 'edit' && imageBase64) {
      const parsed = parseBase64ImagePayload(imageBase64);
      if (!parsed) {
        return res.status(400).json({ message: 'Invalid image data.' });
      }

      const formData = new FormData();
      const blob = new Blob([parsed.buffer], { type: 'image/png' });
      formData.append('image', blob, 'image.png');
      formData.append('prompt', prompt);
      formData.append('model', 'gpt-image-1');
      formData.append('n', '1');
      formData.append('size', '1024x1024');

      response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      });
    } else {
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024'
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      let errorMessage = 'Failed to generate image';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) errorMessage = parsed.error.message;
      } catch (_) {}
      return res.status(response.status).json({ message: errorMessage });
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(500).json({ message: 'OpenAI API did not return any images.' });
    }

    const imageData = data.data[0];
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(imageBuffer).toString('base64');
      return res.json({ image: `data:image/png;base64,${base64}` });
    } else if (imageData.b64_json) {
      return res.json({ image: `data:image/png;base64,${imageData.b64_json}` });
    }

    return res.status(500).json({ message: 'No image data found in response.' });
  } catch (error) {
    console.error('OpenAI generation error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Sora video generation
router.post('/api/sora/generate', authMiddleware, adminMiddleware, async (req, res) => {
  const { prompt, imageBase64, imageName, size, seconds } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const sizeValue = typeof size === 'string' ? size.trim() : '';
  const resolvedSize = sizeValue || DEFAULT_VIDEO_SIZE;
  const parsedSize = parseSize(resolvedSize);
  const secondsNumber = Number(seconds);
  const resolvedSeconds = Number.isFinite(secondsNumber) && secondsNumber > 0
    ? Math.min(Math.floor(secondsNumber), 60)
    : 4;

  let referenceBlob = null;
  let mimeType = 'image/png';
  let referenceFilename = (typeof imageName === 'string' && imageName.trim()) ? imageName.trim() : null;

  if (imageBase64) {
    let base64Data = imageBase64;

    const dataUrlMatch = typeof imageBase64 === 'string'
      ? imageBase64.match(/^data:([^;]+);base64,(.+)$/)
      : null;

    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    try {
      const buffer = Buffer.from(base64Data, 'base64');

      if (parsedSize) {
        try {
          const resizedBuffer = await resizeImageToAspectRatio(buffer, parsedSize.width, parsedSize.height);
          referenceBlob = new Blob([resizedBuffer], { type: 'image/png' });
          mimeType = 'image/png';
          const baseName = referenceFilename ? referenceFilename.replace(/\.[^.]+$/, '') : `reference-${Date.now()}`;
          referenceFilename = `${baseName}.png`;
        } catch (_resizeError) {
          referenceBlob = new Blob([buffer], { type: mimeType });
        }
      } else {
        referenceBlob = new Blob([buffer], { type: mimeType });
      }

      if (!referenceFilename) {
        const extension = mimeType.split('/')[1] || 'png';
        referenceFilename = `reference-${Date.now()}.${extension}`;
      }
    } catch (error) {
      return res.status(400).json({ message: 'Invalid base64 image payload.' });
    }
  }

  const formData = new FormData();
  formData.append('model', 'sora-2');
  formData.append('prompt', prompt.trim());
  formData.append('size', resolvedSize);
  formData.append('seconds', resolvedSeconds.toString());

  if (referenceBlob && referenceFilename) {
    formData.append('input_reference', referenceBlob, referenceFilename);
  }

  try {
    const response = await fetch(SORA_API_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sora generation failed:', errorText);
      let errorMessage = 'Failed to generate video';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) errorMessage = parsed.error.message;
      } catch (_) {}
      return res.status(response.status).json({ message: errorMessage, details: errorText });
    }

    const data = await response.json();
    const normalized = normalizeSoraResponse(data);

    res.json({ ...normalized, raw: data, requestId: data?.id ?? null });
  } catch (error) {
    console.error('Sora generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/api/sora/status/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const videoId = req.params.id?.trim();
  if (!videoId) {
    return res.status(400).json({ message: 'Video id is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    const statusResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return res.status(statusResponse.status).json({ message: 'Failed to retrieve video status', details: errorText });
    }

    const data = await statusResponse.json();
    let normalized = normalizeSoraResponse(data);

    if (data.status === 'completed' && !normalized.videoUrl) {
      try {
        const contentResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}/content`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` }
        });

        if (contentResponse.ok) {
          const videoBuffer = await contentResponse.arrayBuffer();
          const base64Video = Buffer.from(videoBuffer).toString('base64');
          normalized.videoBase64 = base64Video;
          normalized.videoUrl = `data:video/mp4;base64,${base64Video}`;
        }
      } catch (downloadError) {
        console.error('Error downloading video content:', downloadError);
      }
    }

    res.json({ ...normalized, raw: data, requestId: videoId });
  } catch (error) {
    console.error('Sora status check error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/api/sora/download/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const videoId = req.params.id?.trim();
  if (!videoId) {
    return res.status(400).json({ message: 'Video id is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    const contentResponse = await fetch(`${SORA_API_BASE}/${encodeURIComponent(videoId)}/content`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      return res.status(contentResponse.status).json({ message: 'Failed to download video', details: errorText });
    }

    const videoBuffer = await contentResponse.arrayBuffer();

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="sora-${videoId}.mp4"`);
    res.setHeader('Content-Length', videoBuffer.byteLength);

    res.send(Buffer.from(videoBuffer));
  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
