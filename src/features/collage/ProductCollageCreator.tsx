import React, { useState, useEffect } from 'react';
import { Download, Video, Loader2, ChevronLeft, Smartphone, LayoutGrid, Monitor, Settings2, RefreshCw, RotateCcw } from 'lucide-react';
import type { AIModel, Category, Product } from '@/types';
import { useLocalization } from '@/i18n/LocalizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import PresetSelector from '@/components/shared/PresetSelector';
import LoadingIndicator from '@/components/shared/LoadingIndicator';
import { settingsService } from '@/features/admin/services/settingsService';
import type { Setting } from '@/types/settings';
import { generateVideoFromImage } from '@/features/video/veoService';
import { galleryService } from '@/features/gallery/galleryService';
import { GENERATION_GOALS, type GenerationGoal } from '@/features/generator/constants';

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

type Step = 'product' | 'goal' | 'result';

const GOAL_ICONS: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="w-8 h-8" />,
  layout: <LayoutGrid className="w-8 h-8" />,
  monitor: <Monitor className="w-8 h-8" />,
};

const STEPS: Step[] = ['product', 'goal', 'result'];

const ProductCollageCreator: React.FC<ProductCollageCreatorProps> = ({
  category,
  selectedModel,
  onGenerate,
  onBack,
  error,
  isGenerating,
  generatedImages,
  initialData,
}) => {
  const { t } = useLocalization();
  const { user } = useAuth();

  // Stepper state
  const [step, setStep] = useState<Step>('product');
  const [selectedPreset, setSelectedPreset] = useState<Product | null>(null);
  const [selectedMode, setSelectedMode] = useState<'upload' | 'preset'>('preset');
  const [selectedGoal, setSelectedGoal] = useState<GenerationGoal | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lightingOverride, setLightingOverride] = useState<string>('');
  const [backgroundOverride, setBackgroundOverride] = useState<string>('');
  const [cameraOverride, setCameraOverride] = useState<string>('');
  const [customRequest, setCustomRequest] = useState('');

  // Settings from server
  const [lightingSettings, setLightingSettings] = useState<Setting[]>([]);
  const [backgroundSettings, setBackgroundSettings] = useState<Setting[]>([]);
  const [cameraAngleSettings, setCameraAngleSettings] = useState<Setting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Video generation state
  const [generatedVideos, setGeneratedVideos] = useState<Record<number, string>>({});
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<Record<number, boolean>>({});

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [lighting, background, camera] = await Promise.all([
          settingsService.getActiveSettings('lighting'),
          settingsService.getActiveSettings('background'),
          settingsService.getActiveSettings('camera_angle'),
        ]);
        setLightingSettings(lighting);
        setBackgroundSettings(background);
        setCameraAngleSettings(camera);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Move to result step when generation completes
  useEffect(() => {
    if (generatedImages.length > 0 && !isGenerating) {
      setStep('result');
    }
  }, [generatedImages, isGenerating]);

  // Move to result step when generating starts
  useEffect(() => {
    if (isGenerating) {
      setStep('result');
    }
  }, [isGenerating]);

  const handleGoalSelect = (goal: GenerationGoal) => {
    setSelectedGoal(goal);
    triggerGeneration(goal);
  };

  const triggerGeneration = (goal: GenerationGoal) => {
    if (!selectedPreset) return;

    const lighting = lightingOverride || goal.defaults.lighting;
    const background = backgroundOverride || goal.defaults.background;
    const camera = cameraOverride || goal.defaults.camera;

    const lightingMap: Record<string, string> = {
      soft: 'soft and even lighting',
      dramatic: 'dramatic shadows',
      bright: 'bright and airy lighting',
      golden: 'golden hour lighting',
      studio: 'professional studio lighting',
    };
    lightingSettings.forEach(s => {
      lightingMap[s.value] = s.description || s.label.toLowerCase();
    });

    const backgroundMap: Record<string, string> = {
      white: 'a clean white background',
      black: 'an elegant black background',
      gradient: 'a smooth gradient background',
      studio: 'a professional studio setting',
      natural: 'a natural, outdoor environment',
      minimalist: 'a minimalist scene',
    };
    backgroundSettings.forEach(s => {
      backgroundMap[s.value] = s.description || s.label.toLowerCase();
    });

    const cameraAngleMap: Record<string, string> = {
      default: 'a standard product photography angle',
      closeup: 'a detailed close-up shot',
      dutch_angle: 'a dynamic dutch angle shot',
      top_down: 'a top-down, flat-lay perspective',
      top: 'a top-down, flat-lay perspective',
      '45deg': 'a 45-degree angled view',
      side: 'a side profile view',
    };
    cameraAngleSettings.forEach(s => {
      cameraAngleMap[s.value] = s.description || s.label.toLowerCase();
    });

    const lightingDesc = lightingMap[lighting] || 'professional studio lighting';
    const backgroundDesc = backgroundMap[background] || 'a clean background';
    const cameraDesc = cameraAngleMap[camera] || 'a standard product photography angle';

    let prompt = `Transform the uploaded image of a product named "${selectedPreset.name}".\n`;
    prompt += `Camera angle: ${cameraDesc}.\n`;
    prompt += `Lighting: ${lightingDesc}.\n`;
    prompt += `Background: ${backgroundDesc}.\n`;
    prompt += `The composition should be neat and organized.\n`;

    if (customRequest.trim()) {
      prompt += `\nAdditional requirements: ${customRequest}\n`;
    }

    prompt += `\nThe final image must be a hyper-realistic, high-resolution, and professional product photograph. Keep the product itself unchanged but recompose the entire scene around it.`;

    onGenerate({
      generationType: 'text-to-image',
      prompt,
      customRequest: prompt,
      aspectRatio: goal.aspectRatio,
      cameraAngle: camera,
      lightingStyle: lighting,
      backgroundType: background,
      selectedPreset: selectedPreset.id,
      presetImage: selectedPreset.image,
      productName: selectedPreset.name,
    });
  };

  const handleGenerateVideo = async (imageIndex: number) => {
    const imageBase64 = generatedImages[imageIndex];
    if (!imageBase64) return;

    setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: true }));

    try {
      const videoPrompt = `Create a dynamic product video showcasing the item. ${customRequest || ''}. Use smooth camera movements and professional lighting to highlight the product features.`;

      const { video, duration } = await generateVideoFromImage(
        imageBase64,
        videoPrompt,
        selectedGoal?.aspectRatio || '9:16'
      );

      setGeneratedVideos(prev => ({ ...prev, [imageIndex]: video }));

      try {
        await galleryService.saveImage({
          category_id: category.id,
          image_url: video,
          prompt: videoPrompt,
          metadata: {
            sourceImage: imageBase64.substring(0, 100),
            goal: selectedGoal?.id,
          },
          ai_model: 'veo',
          media_type: 'video',
          duration: duration || undefined,
        });
      } catch (saveError) {
        console.error('Failed to save video to gallery:', saveError);
      }
    } catch (err) {
      console.error('Video generation failed:', err);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(prev => ({ ...prev, [imageIndex]: false }));
    }
  };

  const handleStartOver = () => {
    setStep('product');
    setSelectedPreset(null);
    setSelectedGoal(null);
    setShowAdvanced(false);
    setLightingOverride('');
    setBackgroundOverride('');
    setCameraOverride('');
    setCustomRequest('');
    setGeneratedVideos({});
    onBack();
  };

  const handleRegenerate = () => {
    if (selectedGoal) {
      triggerGeneration(selectedGoal);
    }
  };

  const currentStepIndex = STEPS.indexOf(step);
  const stepLabels = [t('stepper_step_product'), t('stepper_step_goal'), t('stepper_step_result')];

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i <= currentStepIndex
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className={`mt-1 text-xs font-medium ${i <= currentStepIndex ? 'text-red-600' : 'text-gray-400'}`}>
                {stepLabels[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 ${i < currentStepIndex ? 'bg-red-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Product selection */}
      {step === 'product' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('stepper_select_product')}</h2>
          <p className="text-gray-500 mb-6">{t('category_product_photo_desc')}</p>

          <PresetSelector
            onPresetSelect={(preset) => {
              setSelectedPreset(preset);
              setSelectedMode('preset');
            }}
            onUploadSelect={() => setSelectedMode('upload')}
            selectedPreset={selectedPreset}
            selectedMode={selectedMode}
          />

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep('goal')}
              disabled={!selectedPreset}
              className="px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('stepper_next')}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Goal selection */}
      {step === 'goal' && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setStep('product')}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{t('stepper_select_goal')}</h2>
          </div>

          {selectedPreset && (
            <p className="text-gray-500 mb-6 ml-9">
              {selectedPreset.name}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {GENERATION_GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleGoalSelect(goal)}
                disabled={settingsLoading}
                className="group flex flex-col items-center p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-red-500 hover:shadow-lg transition-all text-center disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-100 transition-colors">
                  {GOAL_ICONS[goal.icon]}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{t(goal.nameKey)}</h3>
                <p className="text-sm text-gray-500">{t(goal.descKey)}</p>
                <span className="mt-3 text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {goal.aspectRatio}
                </span>
              </button>
            ))}
          </div>

          {/* Advanced settings toggle */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              {t('stepper_advanced')}
            </button>

            {showAdvanced && !settingsLoading && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lighting</label>
                  <select
                    value={lightingOverride}
                    onChange={(e) => setLightingOverride(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Auto (by goal)</option>
                    {lightingSettings.map(s => (
                      <option key={s.id} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
                  <select
                    value={backgroundOverride}
                    onChange={(e) => setBackgroundOverride(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Auto (by goal)</option>
                    {backgroundSettings.map(s => (
                      <option key={s.id} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camera</label>
                  <select
                    value={cameraOverride}
                    onChange={(e) => setCameraOverride(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Auto (by goal)</option>
                    {cameraAngleSettings.map(s => (
                      <option key={s.id} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('field_customRequest_label')}</label>
                  <textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm"
                    rows={2}
                    placeholder={t('field_customRequest_placeholder')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('stepper_step_result')}</h2>
            {selectedGoal && (
              <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded font-mono">
                {t(selectedGoal.nameKey)} · {selectedGoal.aspectRatio}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center min-h-[400px]">
            {isGenerating ? (
              <LoadingIndicator />
            ) : error ? (
              <div className="text-center">
                <p className="font-bold text-red-600 mb-2">{t('error_generation_failed')}</p>
                <p className="text-sm text-red-500 mb-4">{error}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('stepper_regenerate')}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('stepper_start_over')}
                  </button>
                </div>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="w-full flex flex-col gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="flex flex-col gap-3 bg-white rounded-xl shadow-md p-4">
                    {generatedVideos[index] ? (
                      <video
                        src={generatedVideos[index]}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-auto object-contain max-h-[60vh] rounded-lg bg-black"
                      />
                    ) : (
                      <img
                        src={image}
                        alt={`Generated ${index + 1}`}
                        className="rounded-lg object-contain max-w-full max-h-[60vh] mx-auto"
                      />
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {!generatedVideos[index] && (
                        <button
                          onClick={() => handleGenerateVideo(index)}
                          disabled={isGeneratingVideo[index]}
                          className="flex-1 min-w-[140px] bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {isGeneratingVideo[index] ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />{t('stepper_generating')}</>
                          ) : (
                            <><Video className="w-4 h-4" />Generate Video (Veo)</>
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
                        className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {generatedVideos[index] ? t('button_download') + ' Video' : t('button_download')}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Action buttons below results */}
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('stepper_regenerate')}
                  </button>
                  <button
                    onClick={() => setStep('goal')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('stepper_step_goal')}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('stepper_start_over')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>{t('stepper_generating')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCollageCreator;
