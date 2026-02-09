import React, { useState, useEffect } from 'react';
import { Download, Camera, Video, Loader2 } from 'lucide-react';
import { AIModel, Category, Product } from '@/types';
import { useLocalization } from '@/i18n/LocalizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import PresetSelector from '@/components/shared/PresetSelector';
import LoadingIndicator from '@/components/shared/LoadingIndicator';
import { settingsService } from '@/features/admin/services/settingsService';
import type { Setting } from '@/types/settings';
import { generateVideoFromImage } from '@/features/video/veoService';
import { galleryService } from '@/features/gallery/galleryService';

interface ProductCollageCreatorProps {
  category: Category;
  selectedModel: AIModel;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error?: string | null;
  isGenerating: boolean;
  generatedImages: string[];
  initialData?: Record<string, string | File> | null;
}

const ProductCollageCreator: React.FC<ProductCollageCreatorProps> = ({
  category,
  selectedModel,
  onGenerate,
  onBack,
  error,
  isGenerating,
  generatedImages,
  initialData
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Settings state
  const [lightingSettings, setLightingSettings] = useState<Setting[]>([]);
  const [backgroundSettings, setBackgroundSettings] = useState<Setting[]>([]);
  const [cameraAngleSettings, setCameraAngleSettings] = useState<Setting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [lighting, background, camera] = await Promise.all([
          settingsService.getActiveSettings('lighting'),
          settingsService.getActiveSettings('background'),
          settingsService.getActiveSettings('camera_angle')
        ]);
        setLightingSettings(lighting);
        setBackgroundSettings(background);
        setCameraAngleSettings(camera);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Set default values from loaded settings
  useEffect(() => {
    if (!settingsLoading && lightingSettings.length > 0 && backgroundSettings.length > 0) {
      setFormData(prev => ({
        ...prev,
        lightingStyle: prev.lightingStyle || lightingSettings[0]?.value,
        backgroundType: prev.backgroundType || backgroundSettings[0]?.value
      }));
    }
  }, [settingsLoading, lightingSettings, backgroundSettings]);

  // Form state
  const [formData, setFormData] = useState<Record<string, string | File>>(
    initialData || {
      cameraAngle: 'option_camera_default',
      conceptPreset: 'option_concept_modern',
      customRequest: ''
    }
  );

  // Preset selection state
  const [selectedMode, setSelectedMode] = useState<'upload' | 'preset'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<Product | null>(null);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [cameraAngle, setCameraAngle] = useState('default');

  // Background reference image state
  const [backgroundReference, setBackgroundReference] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Video generation state
  const [generatedVideos, setGeneratedVideos] = useState<Record<number, string>>({});
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<Record<number, boolean>>({});

  const handleGenerateVideo = async (imageIndex: number) => {
    const imageBase64 = generatedImages[imageIndex];
    if (!imageBase64) return;

    setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: true }));

    try {
      const videoPrompt = `Create a dynamic product video showcasing the item. ${formData.customRequest || ''}. Use smooth camera movements and professional lighting to highlight the product features.`;

      const { video, duration } = await generateVideoFromImage(
        imageBase64,
        videoPrompt,
        aspectRatio || '9:16'
      );

      setGeneratedVideos(prev => ({ ...prev, [imageIndex]: video }));

      try {
        await galleryService.saveImage({
          category_id: category.id,
          image_url: video,
          prompt: videoPrompt,
          metadata: {
            sourceImage: imageBase64.substring(0, 100),
            formData: Object.fromEntries(
              Object.entries(formData).filter(([_, v]) => typeof v === 'string')
            )
          },
          ai_model: 'veo',
          media_type: 'video',
          duration: duration || undefined
        });
      } catch (saveError) {
        console.error('Failed to save video to gallery:', saveError);
      }
    } catch (error) {
      console.error('Video generation failed:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: false }));
    }
  };

  const handleGenerate = () => {
    if (selectedMode === 'preset' && !selectedPreset) {
      return;
    }

    const productName = selectedMode === 'preset' && selectedPreset ? selectedPreset.name : (formData.productName as string || 'the product');

    const lightingMap: Record<string, string> = {
      'soft': 'soft and even lighting',
      'dramatic': 'dramatic shadows',
      'bright': 'bright and airy lighting',
      'golden': 'golden hour lighting',
      'studio': 'professional studio lighting',
    };
    lightingSettings.forEach(s => {
      lightingMap[s.value] = s.description || s.label.toLowerCase();
    });

    const backgroundMap: Record<string, string> = {
      'white': 'a clean white background',
      'black': 'an elegant black background',
      'gradient': 'a smooth gradient background',
      'studio': 'a professional studio setting',
      'natural': 'a natural, outdoor environment',
      'minimalist': 'a minimalist scene',
    };
    backgroundSettings.forEach(s => {
      backgroundMap[s.value] = s.description || s.label.toLowerCase();
    });

    const cameraAngleMap: Record<string, string> = {
      'default': 'a standard product photography angle',
      'closeup': 'a detailed close-up shot',
      'dutch_angle': 'a dynamic dutch angle shot',
      'top_down': 'a top-down, flat-lay perspective',
      'top': 'a top-down, flat-lay perspective',
      '45deg': 'a 45-degree angled view',
      'side': 'a side profile view',
    };
    cameraAngleSettings.forEach(s => {
      cameraAngleMap[s.value] = s.description || s.label.toLowerCase();
    });

    const lightingValue = (formData.lightingStyle as string) || lightingSettings[0]?.value || 'soft';
    const backgroundValue = (formData.backgroundType as string) || backgroundSettings[0]?.value || 'white';
    const lightingDesc = lightingMap[lightingValue] || 'professional studio lighting';
    const backgroundDesc = backgroundMap[backgroundValue] || 'a clean background';
    const cameraAngleDesc = cameraAngleMap[cameraAngle] || cameraAngleMap['default'] || 'a standard product photography angle';

    let prompt = `Transform the uploaded image of a product named "${productName}".\n`;
    prompt += `Camera angle: ${cameraAngleDesc}.\n`;

    if (backgroundReference) {
      prompt += `Take the product from the first image and place it in a new scene. The new scene\'s background, lighting, and overall style should be inspired by the second (reference) image.\n`;
    } else {
      prompt += `Lighting: ${lightingDesc}.\n`;
      prompt += `Background: ${backgroundDesc}.\n`;
      prompt += `The composition should be neat and organized.\n`;
    }

    if (formData.customRequest && (formData.customRequest as string).trim()) {
      prompt += `\nAdditional requirements: ${formData.customRequest as string}\n`;
    }

    prompt += `\nThe final image must be a hyper-realistic, high-resolution, and professional product photograph. Keep the product itself unchanged but recompose the entire scene around it.`;

    const aiFormData = {
      ...formData,
      generationType: 'text-to-image',
      prompt: prompt,
      customRequest: prompt,
      aspectRatio: aspectRatio,
      cameraAngle: cameraAngle,
    };

    if (selectedMode === 'preset' && selectedPreset) {
      aiFormData.selectedPreset = selectedPreset.id;
      aiFormData.presetImage = selectedPreset.image;
      aiFormData.productName = selectedPreset.name;
    }

    if (backgroundReference) {
      aiFormData.backgroundReferenceImage = backgroundReference;
    }

    onGenerate(aiFormData);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t(category.nameKey)}</h1>
          <p className="text-gray-600">{t(category.descriptionKey)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Settings */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:col-span-2 self-start">
          {/* Product Selection */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 xl:col-span-2">
            <h3 className="text-lg font-semibold mb-3">Product Selection</h3>
            <PresetSelector
              categoryId={category.id}
              onPresetSelect={setSelectedPreset}
              onUploadSelect={() => setSelectedMode('upload')}
              selectedPreset={selectedPreset}
              selectedMode={selectedMode}
            />
          </div>

          {/* Composition Settings */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Composition Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                <div className="flex space-x-2">
                  {['9:16', '1:1', '16:9'].map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 py-2 px-4 rounded-md border text-sm font-semibold transition-colors ${
                        aspectRatio === ratio
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lighting Style</label>
                {settingsLoading ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <select
                    value={formData.lightingStyle as string || (lightingSettings[0]?.value || 'soft')}
                    onChange={(e) => setFormData(prev => ({ ...prev, lightingStyle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {lightingSettings.map(setting => (
                      <option key={setting.id} value={setting.value}>
                        {setting.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camera Angle</label>
                {settingsLoading ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <select
                    value={cameraAngle}
                    onChange={(e) => setCameraAngle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {cameraAngleSettings.map(setting => (
                      <option key={setting.id} value={setting.value}>
                        {setting.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Background Settings */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Background Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Type</label>
                  {settingsLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-400">
                      Loading...
                    </div>
                  ) : (
                    <select
                      value={formData.backgroundType as string || (backgroundSettings[0]?.value || 'white')}
                      onChange={(e) => setFormData(prev => ({ ...prev, backgroundType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {backgroundSettings.map(setting => (
                        <option key={setting.id} value={setting.value}>
                          {setting.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background Reference</label>
                {backgroundPreview ? (
                  <div className="relative">
                    <img
                      src={backgroundPreview}
                      alt="Background reference"
                      className="w-full h-40 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBackgroundReference(null);
                        setBackgroundPreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full h-7 w-7 flex items-center justify-center text-xl font-bold hover:bg-red-700"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="backgroundReference"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBackgroundReference(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBackgroundPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label htmlFor="backgroundReference" className="cursor-pointer">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Upload background reference</p>
                      <p className="text-xs text-gray-400 mt-1">Click to browse</p>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Requests */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Additional Requests</h3>
            <textarea
              value={formData.customRequest as string}
              onChange={(e) => setFormData(prev => ({ ...prev, customRequest: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm"
              rows={3}
              placeholder="Any additional requirements or style preferences..."
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={selectedMode === 'preset' ? !selectedPreset : false}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5 mr-2" />
            Generate Product Photo
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col lg:col-span-3">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Preview</h3>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            {isGenerating ? (
              <LoadingIndicator />
            ) : error ? (
              <div className="text-center text-red-500">
                <p className="font-bold">Generation Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="w-full h-full flex flex-col gap-4 p-4 overflow-y-auto">
                {generatedImages.map((image, index) => (
                  <div key={index} className="flex flex-col gap-3 bg-white rounded-lg shadow-md p-4">
                    {generatedVideos[index] ? (
                      <video
                        src={generatedVideos[index]}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-auto object-contain max-h-[calc(100vh-500px)] rounded-lg bg-black"
                      />
                    ) : (
                      <img
                        src={image}
                        alt={`Generated ${index + 1}`}
                        className="rounded-lg object-contain max-w-full max-h-[calc(100vh-500px)]"
                      />
                    )}

                    <div className="flex gap-2">
                      {!generatedVideos[index] && (
                        <button
                          onClick={() => handleGenerateVideo(index)}
                          disabled={isGeneratingVideo[index]}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
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
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = generatedVideos[index] || image;
                          a.download = `product_${generatedVideos[index] ? 'video' : 'photo'}_${index + 1}.${generatedVideos[index] ? 'mp4' : 'jpeg'}`;
                          a.click();
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {generatedVideos[index] ? 'Download Video' : 'Download Image'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {selectedMode === 'preset'
                    ? (selectedPreset ? `Ready to generate ${selectedPreset.nameKey} photo` : 'Select a product preset to see preview')
                    : 'Upload mode selected'
                  }
                </p>
                {selectedPreset && (
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <p>Background: {formData.backgroundType || 'white'}</p>
                    <p>Lighting: {formData.lightingStyle || 'soft'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCollageCreator;
