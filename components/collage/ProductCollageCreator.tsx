import React, { useState, useCallback } from 'react';
import { Upload, Download, Wand2, Settings, Image as ImageIcon, ToggleLeft, ToggleRight, Camera } from 'lucide-react';
import { CollageElement, CollageState } from '../../types/collage';
import { AIModel, Category } from '../../types';
import { PRODUCT_COLLAGE_PRESETS, getDefaultProductPreset } from '../../services/productCollagePresets';
import { collageAiService, CollageAiRequest } from '../../services/collageAiService';
import { collageExportService } from '../../services/collageExport';
import { useAuth } from '../../contexts/AuthContext';

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

  // Collage mode toggle
  const [isCollageMode, setIsCollageMode] = useState(false);

  // Traditional single product form state
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

  // Background reference image state
  const [backgroundReference, setBackgroundReference] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  // Collage state
  const [collageState, setCollageState] = useState<CollageState>(() => ({
    preset: getDefaultProductPreset(),
    elements: [],
    labels: {}
  }));

  const [activeTab, setActiveTab] = useState<'canvas' | 'background' | 'labels' | 'settings'>('canvas');
  const [customPrompt, setCustomPrompt] = useState('');

  // Traditional form handlers
  const handleTraditionalGenerate = () => {
    if (selectedMode === 'preset' && !selectedPreset) {
      return;
    }

    // Build modular prompt structure:
    // 1. promptTemplate (from preset or default)
    // 2. Background Settings
    // 3. Additional Requests (optional)
    // 4. Style Settings (static: advertising packshot style)

    let promptParts: string[] = [];

    // 1. Prompt Template - base description
    let basePrompt = 'Place this product packshot';

    if (selectedMode === 'preset' && selectedPreset) {
      // Use preset template if available
      basePrompt = selectedPreset.promptTemplate || basePrompt;

      // Replace {productName} placeholder with actual product name
      if (basePrompt.includes('{productName}')) {
        basePrompt = basePrompt.replace(/{productName}/g, selectedPreset.name);
      }
    }

    promptParts.push(basePrompt);

    // 2. Background Settings - use reference image OR text description
    if (!backgroundReference) {
      // Only add text-based background description if NO reference image is uploaded
      let backgroundDescription = '';

      if (selectedMode === 'preset' && selectedPreset && selectedPreset.presets?.background) {
        // Use background from preset
        const presetBgMap: Record<string, string> = {
          'white': 'on a clean white background',
          'black': 'on an elegant black background',
          'gradient': 'on a gradient background',
          'studio': 'in a professional studio setup',
          'natural': 'in a natural environment background',
          'minimalist': 'in a minimalist scene'
        };
        backgroundDescription = presetBgMap[selectedPreset.presets.background] || 'on a clean background';
      } else if (formData.backgroundType) {
        // Use background from form
        const backgroundMap: Record<string, string> = {
          'white': 'on a clean white background',
          'black': 'on an elegant black background',
          'gradient': 'on a gradient background',
          'studio': 'in a professional studio setup',
          'natural': 'in a natural environment background',
          'minimalist': 'in a minimalist scene'
        };
        backgroundDescription = backgroundMap[formData.backgroundType as string] || 'on a clean background';
      }

      if (backgroundDescription) {
        promptParts.push(`which is placed ${backgroundDescription}`);
      }
    } else {
      // When background reference is provided, mention it in prompt
      promptParts.push('with background matching the provided reference image');
    }

    // 3. Additional Requests (optional)
    if (formData.customRequest) {
      promptParts.push(formData.customRequest as string);
    }

    // 4. Style Settings (static - always advertising packshot)
    promptParts.push('Advertising packshot style, high-resolution, professional quality, commercial photography.');

    // 5. Aspect Ratio
    if (aspectRatio) {
      promptParts.push(`Generated image must have an aspect ratio of ${aspectRatio}.`);
    }

    const enhancedPrompt = promptParts.join('. ') + '.';

    // Create form data for AI generation
    // Note: This is text-to-image generation, not image editing
    // We need to handle this differently than image editing
    const aiFormData = {
      ...formData,
      customRequest: enhancedPrompt,
      // For text-to-image, we don't need a productImage
      // The OpenAI service needs to be modified to handle text-to-image generation
      generationType: 'text-to-image',
      prompt: enhancedPrompt,
      aspectRatio: aspectRatio, // Add aspect ratio to form data
    };

    // Add preset data if preset mode is selected
    if (selectedMode === 'preset' && selectedPreset) {
      aiFormData.selectedPreset = selectedPreset.id;
      aiFormData.presetImage = selectedPreset.image;
      aiFormData.productName = selectedPreset.name;
      // Don't set presetPrompt here - we already have the full prompt in customRequest/prompt
    }

    // Add background reference image if uploaded
    if (backgroundReference) {
      aiFormData.backgroundReferenceImage = backgroundReference;
    }

    onGenerate(aiFormData);
  };


  // Collage handlers
  const handlePresetChange = (presetId: string) => {
    const preset = PRODUCT_COLLAGE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setCollageState(prev => ({
      ...prev,
      preset,
      elements: preset.defaultElements.map((template, index) => ({
        id: `element-${Date.now()}-${index}`,
        type: template.type || 'image',
        position: template.position || { x: 0, y: 0, width: 0.3, height: 0.3 },
        zIndex: template.zIndex || index + 1,
        ...(template.type === 'image' && { file: undefined, url: undefined })
      } as CollageElement))
    }));
  };


  const handleElementUpdate = useCallback((elementId: string, updates: Partial<CollageElement>) => {
    setCollageState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      )
    }));
  }, []);

  const handleElementRemove = useCallback((elementId: string) => {
    setCollageState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId),
      labels: Object.fromEntries(
        Object.entries(prev.labels).filter(([id]) => id !== elementId)
      )
    }));
  }, []);

  const handleLabelChange = useCallback((elementId: string, label: string) => {
    setCollageState(prev => ({
      ...prev,
      labels: { ...prev.labels, [elementId]: label }
    }));
  }, []);

  const handleBackgroundChange = useCallback((background: { type: 'color' | 'image'; value: string; label?: string }) => {
    setCollageState(prev => ({ ...prev, background }));
  }, []);

  const handleCollageGenerate = async () => {
    if (collageState.elements.length === 0) {
      return;
    }

    try {
      // Export collage first
      const exportResult = await collageExportService.exportCollage(collageState, {
        format: 'png',
        quality: 0.95,
        includeLabels: true,
        backgroundColor: '#ffffff'
      });

      // Create enhanced prompt combining traditional fields with collage data
      let enhancedPrompt = '';

      if (formData.productName) {
        enhancedPrompt += `Product composition featuring: ${formData.productName}. `;
      }

      // Add concept preset information
      const conceptMap: Record<string, string> = {
        'option_concept_warm': 'Warm, natural lighting with cozy atmosphere',
        'option_concept_modern': 'Clean, modern studio lighting with minimalist background',
        'option_concept_isolated': 'Isolated on clean background with enhanced details',
        'option_concept_lifestyle': 'Dynamic lifestyle scene with natural environment'
      };

      if (formData.conceptPreset && conceptMap[formData.conceptPreset as string]) {
        enhancedPrompt += `Style: ${conceptMap[formData.conceptPreset as string]}. `;
      }

      // Add camera angle
      const angleMap: Record<string, string> = {
        'option_camera_default': 'Standard product photography angle',
        'option_camera_top': 'Top-down view',
        'option_camera_45': '45-degree angle view',
        'option_camera_closeup': 'Close-up detail shot'
      };

      if (formData.cameraAngle && angleMap[formData.cameraAngle as string]) {
        enhancedPrompt += `Camera angle: ${angleMap[formData.cameraAngle as string]}. `;
      }

      if (customPrompt.trim()) {
        enhancedPrompt += `Additional requirements: ${customPrompt.trim()}. `;
      }

      if (formData.customRequest) {
        enhancedPrompt += `Custom request: ${formData.customRequest}. `;
      }

      enhancedPrompt += 'Create a professional, high-quality product photography composition.';

      // Use traditional form generation with collage image
      const enhancedFormData = {
        ...formData,
        productImage: exportResult.blob,
        customRequest: enhancedPrompt,
        collageData: exportResult.promptData
      };

      onGenerate(enhancedFormData);
    } catch (err) {
      console.error('Collage generation error:', err);
    }
  };

  const handleExport = async () => {
    try {
      const result = await collageExportService.exportCollage(collageState);

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `product-collage-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (!isCollageMode) {
    // Traditional single product form
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t(category.nameKey)}</h1>
            <p className="text-gray-600">{t(category.descriptionKey)}</p>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <button
                onClick={() => setIsCollageMode(true)}
                className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Switch to Collage Mode
              </button>
            )}
            <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              ← Back to Categories
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-4">
            {/* Product Selection */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Product Selection</h3>
              <PresetSelector
                categoryId={category.id}
                onPresetSelect={setSelectedPreset}
                onUploadSelect={() => setSelectedMode('upload')}
                selectedPreset={selectedPreset}
                selectedMode={selectedMode}
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Aspect Ratio</h3>
              <div className="flex space-x-2">
                {('9:16', '1:1', '16:9').map(ratio => (
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

            {/* Background Settings */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Background Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Background Type and Lighting Style */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Type</label>
                    <select
                      value={formData.backgroundType as string || 'white'}
                      onChange={(e) => setFormData(prev => ({ ...prev, backgroundType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="white">Clean White</option>
                      <option value="black">Elegant Black</option>
                      <option value="gradient">Gradient Background</option>
                      <option value="studio">Studio Setup</option>
                      <option value="natural">Natural Environment</option>
                      <option value="minimalist">Minimalist Scene</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lighting Style</label>
                    <select
                      value={formData.lightingStyle as string || 'soft'}
                      onChange={(e) => setFormData(prev => ({ ...prev, lightingStyle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="soft">Soft & Even</option>
                      <option value="dramatic">Dramatic Shadows</option>
                      <option value="bright">Bright & Airy</option>
                      <option value="golden">Golden Hour</option>
                      <option value="studio">Professional Studio</option>
                    </select>
                  </div>
                </div>

                {/* Right column: Background Reference Upload */}
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
              onClick={handleTraditionalGenerate}
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
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col">
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
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <img key={index} src={image} alt={`Generated ${index + 1}`} className="rounded-lg shadow-md" />
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
                      <p>Style: {formData.conceptPreset?.replace('option_concept_', '').replace('_', ' & ')}</p>
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
  }

  // Collage mode
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Collage Creator</h1>
          <p className="text-gray-600">Create multi-product compositions with AI enhancement</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsCollageMode(false)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Camera className="w-4 h-4 mr-2" />
            Single Product Mode
          </button>
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            ← Back to Categories
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold mb-3">Choose Product Layout</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRODUCT_COLLAGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                collageState.preset.id === preset.id
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="mb-1">{preset.name}</div>
              <div className="text-xs text-gray-500">
                {preset.aspectRatio.width}:{preset.aspectRatio.height}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-350px)]">
        {/* Left Column - Controls */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-350px)]">
          {/* Interactive Upload Grid */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <InteractiveUploadGrid
              maxSlots={collageState.preset.maxElements}
              onSlotsChange={(slots) => {
                // Update labels when slots change
                const newLabels: { [key: string]: string } = {};
                collageState.elements.forEach((element, index) => {
                  if (slots[index]) {
                    newLabels[element.id] = slots[index].text;
                  }
                });
                setCollageState(prev => ({ ...prev, labels: newLabels }));
              }}
              onUpload={(files, texts) => {
                // Clear existing elements
                setCollageState(prev => ({ ...prev, elements: [] }));

                // Create new elements with texts
                const newElements: CollageElement[] = files.map((file, index) => {
                  const position = collageState.preset.defaultElements[index]?.position || {
                    x: 0.1 + (index % 2) * 0.45,
                    y: 0.1 + Math.floor(index / 2) * 0.4,
                    width: 0.35,
                    height: 0.35
                  };

                  return {
                    id: `element-${Date.now()}-${index}`,
                    type: 'image',
                    file,
                    position,
                    zIndex: index + 1
                  };
                });

                // Create labels mapping
                const newLabels: { [key: string]: string } = {};
                newElements.forEach((element, index) => {
                  if (texts[index]) {
                    newLabels[element.id] = texts[index];
                  }
                });

                setCollageState(prev => ({
                  ...prev,
                  elements: newElements,
                  labels: newLabels
                }));
              }}
            />
          </div>
          {/* Background Manager */}
          <BackgroundManager
            currentBackground={collageState.background}
            onBackgroundChange={handleBackgroundChange}
            allowLabels={collageState.preset.allowLabels}
          />

          {/* Product Settings */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Product Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.productName as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Enter product name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style Concept</label>
                <select
                  value={formData.conceptPreset as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, conceptPreset: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="option_concept_warm">Warm & Natural</option>
                  <option value="option_concept_modern">Modern & Clean</option>
                  <option value="option_concept_isolated">Isolated Background</option>
                  <option value="option_concept_lifestyle">Lifestyle Scene</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">AI Enhancement</h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              rows={3}
              placeholder="Describe how you want the AI to enhance your product collage..."
            />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleCollageGenerate}
              disabled={isGenerating || collageState.elements.length === 0}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>

            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              <Download className="w-5 h-5 mr-2" />
              Export PNG
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column - Canvas Preview */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Canvas Preview</h3>
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            {collageState.elements.length > 0 ? (
              <CollageCanvas
                collageState={collageState}
                onElementUpdate={handleElementUpdate}
                onElementRemove={handleElementRemove}
                className="w-full max-w-full"
                interactive={true}
              />
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  Upload images to see your collage preview
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Layout: {collageState.preset.name} ({collageState.preset.aspectRatio.width}:{collageState.preset.aspectRatio.height})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCollageCreator;