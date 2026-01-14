import React, { useState } from 'react';
import { apiFetch } from '../services/apiClient';

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const data = result.split(',')[1];
      resolve({ data, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const AiPipeTestPage: React.FC = () => {
  // Panel 1: Reference image
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  // Panel 2: Animated image
  const [animatedImage, setAnimatedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState(`Transform this child's drawing into a photorealistic scene while strictly preserving the original naive composition, proportions, and contours:

Maintain the exact shapes and silhouettes from the child's drawing (the handprint lion, handprint giraffe, simplified trees)
Keep the simplified, childlike anatomy - don't correct proportions or make animals anatomically accurate
Preserve the flat, frontal composition and naive perspective
Add photorealistic textures, lighting, and details ONLY within the existing shapes (realistic fur, skin texture, grass blades, tree bark)
Keep the warm, vibrant color palette from the original
Maintain the whimsical, innocent charm - this should feel like a child's imagination come to life, not a nature documentary

The result should look like someone brought a child's drawing into the real world exactly as they drew it - with all its charming imperfections and simplified forms - but with realistic materials and lighting.`);

  // Panel 3: Video
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('Animate this illustration with gentle, playful movements. Add subtle animations like floating elements, swaying motion, and soft breathing effects to bring the scene to life.');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceFile(file);
    setAnimatedImage(null);
    setVideoUrl(null);
    setImageError(null);
    setVideoError(null);

    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!referenceFile) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setAnimatedImage(null);
    setVideoUrl(null);

    try {
      const imagePart = await fileToBase64(referenceFile);

      const parts = [
        { inlineData: imagePart },
        { text: imagePrompt }
      ];

      const response = await apiFetch('/api/gemini/generate', {
        method: 'POST',
        body: JSON.stringify({ parts })
      }) as { image: string };

      if (!response.image) {
        throw new Error('API did not return an image');
      }

      setAnimatedImage(response.image);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!animatedImage) return;

    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoUrl(null);

    try {
      // Extract base64 from data URL
      const base64Data = animatedImage.startsWith('data:')
        ? animatedImage.split(',')[1]
        : animatedImage;

      const response = await apiFetch('/api/veo/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: videoPrompt,
          imageBase64: base64Data,
          aspectRatio: '16:9'
        })
      }) as { video: string; duration: number | null };

      if (!response.video) {
        throw new Error('API did not return a video');
      }

      // Handle video response
      const videoData = response.video.startsWith('data:')
        ? response.video
        : `data:video/mp4;base64,${response.video}`;

      console.log('Video received, length:', videoData.length);
      console.log('Video prefix:', videoData.substring(0, 50));

      setVideoUrl(videoData);
    } catch (err: any) {
      const errorMsg = err?.reasons
        ? `Content filtered: ${err.reasons.join(', ')}`
        : err instanceof Error
          ? err.message
          : 'Failed to generate video';
      setVideoError(errorMsg);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 p-4">
      <div className="grid grid-cols-3 gap-4 h-full">
        {/* Panel 1: Reference Upload */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
          <h2 className="text-white text-lg font-semibold mb-4">1. Reference Image</h2>

          <div className="flex-1 flex flex-col">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="mb-4 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
            />

            {referencePreview && (
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )}

            {!referencePreview && (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                <p className="text-gray-500">Upload a child's drawing</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Animated Image */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
          <h2 className="text-white text-lg font-semibold mb-4">2. Animated Image (Gemini)</h2>

          <div className="mb-4">
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Prompt for image generation..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none"
              rows={3}
            />
            <button
              onClick={handleGenerateImage}
              disabled={!referenceFile || isGeneratingImage}
              className="mt-2 w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition"
            >
              {isGeneratingImage ? 'Generating...' : 'Generate Image'}
            </button>
          </div>

          {imageError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {imageError}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {isGeneratingImage && (
              <div className="text-gray-400">Processing...</div>
            )}
            {animatedImage && !isGeneratingImage && (
              <img
                src={animatedImage}
                alt="Animated"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            {!animatedImage && !isGeneratingImage && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg w-full h-full flex items-center justify-center">
                <p className="text-gray-500">Animated result will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Video */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
          <h2 className="text-white text-lg font-semibold mb-4">3. Video (Veo 3.1)</h2>

          <div className="mb-4">
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Prompt for video generation..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm resize-none"
              rows={3}
            />
            <button
              onClick={handleGenerateVideo}
              disabled={!animatedImage || isGeneratingVideo}
              className="mt-2 w-full py-2 px-4 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition"
            >
              {isGeneratingVideo ? 'Generating...' : 'Generate Video'}
            </button>
          </div>

          {videoError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {videoError}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {isGeneratingVideo && (
              <div className="text-gray-400">Processing video...</div>
            )}
            {videoUrl && !isGeneratingVideo && (
              <video
                key={videoUrl.substring(0, 100)}
                src={videoUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
                onLoadedData={() => console.log('Video loaded successfully')}
                onError={(e) => {
                  const video = e.target as HTMLVideoElement;
                  console.error('Video error:', e);
                  console.error('Video error code:', video.error?.code);
                  console.error('Video error message:', video.error?.message);
                  console.error('Video src length:', video.src?.length);
                  console.error('Video src prefix:', video.src?.substring(0, 100));
                }}
              />
            )}
            {!videoUrl && !isGeneratingVideo && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg w-full h-full flex items-center justify-center">
                <p className="text-gray-500">Video will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPipeTestPage;
