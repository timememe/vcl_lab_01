import React, { useState } from 'react';
import { Video, Loader2, Download as DownloadIcon } from 'lucide-react';
import { useLocalization } from '@/i18n/LocalizationContext';
import { generateVideoFromImage } from '@/features/video/veoService';
import { galleryService } from '@/features/gallery/galleryService';

interface ImageResultProps {
  images: string[];
  onBack: () => void;
  onGenerateAgain: () => void;
  onGoHome: () => void;
  categoryId?: string;
  formData?: Record<string, any>;
}

const ImageResult: React.FC<ImageResultProps> = ({ images, onBack, onGenerateAgain, onGoHome, categoryId, formData }) => {
  const { t } = useLocalization();
  const [generatedVideos, setGeneratedVideos] = useState<Record<number, string>>({});
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<Record<number, boolean>>({});

  const handleDownload = (imageUrl: string, index: number) => {
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = imageUrl;
      a.download = `product_photo_${index + 1}.jpeg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Download failed:", e);
      alert(t('alert_download_failed'));
    }
  };

  const handleGenerateVideo = async (imageIndex: number) => {
    const imageBase64 = images[imageIndex];
    if (!imageBase64) return;

    setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: true }));

    try {
      const videoPrompt = `Create a dynamic product video showcasing the item. ${formData?.customRequest || ''}. Use smooth camera movements and professional lighting to highlight the product features.`;

      const { video, duration } = await generateVideoFromImage(
        imageBase64,
        videoPrompt,
        formData?.aspectRatio || '9:16'
      );

      setGeneratedVideos(prev => ({ ...prev, [imageIndex]: video }));

      // Save to gallery
      if (categoryId) {
        try {
          await galleryService.saveImage({
            category_id: categoryId,
            image_url: video,
            prompt: videoPrompt,
            metadata: {
              sourceImage: imageBase64.substring(0, 100),
              formData: formData
            },
            ai_model: 'veo',
            media_type: 'video',
            duration: duration || undefined
          });
        } catch (saveError) {
          console.error('Failed to save video to gallery:', saveError);
        }
      }
    } catch (error) {
      console.error('Video generation failed:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: false }));
    }
  };


  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{t('result_title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {images.map((image, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col">
            {/* Image or Video */}
            {generatedVideos[index] ? (
              <video
                src={generatedVideos[index]}
                controls
                autoPlay
                loop
                muted
                className="w-full h-auto object-cover aspect-square bg-black"
              />
            ) : (
              <img src={image} alt={`${t('result_image_alt_prefix')} ${index + 1}`} className="w-full h-auto object-cover aspect-square" />
            )}

            {/* Placeholder Buttons */}
            <div className="grid grid-cols-2 gap-2 p-2 border-t border-gray-200">
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-200">
                    {t('placeholder_button_1')}
                </button>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-200">
                    {t('placeholder_button_2')}
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 p-2">
              {!generatedVideos[index] && (
                <button
                  onClick={() => handleGenerateVideo(index)}
                  disabled={isGeneratingVideo[index]}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2.5 px-4 text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isGeneratingVideo[index] ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Generate Video (Veo 3.1)
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleDownload(generatedVideos[index] || image, index)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" />
                {generatedVideos[index] ? 'Download Video' : t('button_download')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
         <button
          onClick={onGoHome}
          className="w-full sm:w-auto bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition"
        >
          {t('button_back_to_home')}
        </button>
        <button
          onClick={onBack}
          className="w-full sm:w-auto bg-white text-gray-800 font-semibold py-2 px-6 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
        >
          {t('button_edit_options')}
        </button>
        <button
          onClick={onGenerateAgain}
          className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
        >
          {t('button_regenerate')}
        </button>
      </div>
    </div>
  );
};

export default ImageResult;