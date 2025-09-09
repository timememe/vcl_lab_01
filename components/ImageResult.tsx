import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface ImageResultProps {
  images: string[];
  onBack: () => void;
  onGenerateAgain: () => void;
  onGoHome: () => void;
}

const ImageResult: React.FC<ImageResultProps> = ({ images, onBack, onGenerateAgain, onGoHome }) => {
  const { t } = useLocalization();

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


  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{t('result_title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {images.map((image, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col">
            <img src={image} alt={`${t('result_image_alt_prefix')} ${index + 1}`} className="w-full h-auto object-cover aspect-square" />
            <button
              onClick={() => handleDownload(image, index)}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 px-4 text-sm font-semibold transition-colors duration-200 mt-auto"
            >
              {t('button_download')}
            </button>
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