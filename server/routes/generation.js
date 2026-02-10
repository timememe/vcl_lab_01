import { Router } from 'express';
import { Blob } from 'buffer';
import { authMiddleware } from '../middleware/auth.js';
import { parseBase64ImagePayload } from '../services/imageProcessing.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const router = Router();

// Write GOOGLE_APPLICATION_CREDENTIALS_JSON to a temp file for ADC auth
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = path.join(os.tmpdir(), 'gcp-credentials.json');
  fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

// Gemini image generation
router.post('/api/gemini/generate', authMiddleware, async (req, res) => {
  const { parts, aspectRatio } = req.body || {};

  if (!parts || !Array.isArray(parts)) {
    return res.status(400).json({ message: 'Parts array is required.' });
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  if (!project) {
    return res.status(500).json({ message: 'GOOGLE_CLOUD_PROJECT_ID must be configured.' });
  }

  try {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const ai = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });

    const contents = { parts };
    const config = {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      ...(aspectRatio && { imageConfig: { aspectRatio } })
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents,
        config
      });
    } catch (_modelError) {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents,
        config
      });
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

  const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  if (!project) {
    return res.status(500).json({ message: 'GOOGLE_CLOUD_PROJECT_ID must be configured.' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });

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
          const videoResponse = await fetch(videoData.video.uri);
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

export default router;
