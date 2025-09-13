import React, { useState, useCallback } from 'react';
import { Upload, Download, Wand2, Settings, Image as ImageIcon, ToggleLeft, ToggleRight, Camera } from 'lucide-react';
import { CollageElement, CollageState } from '../../types/collage';
import { AIModel, Category } from '../../types';
import { PRODUCT_COLLAGE_PRESETS, getDefaultProductPreset } from '../../services/productCollagePresets';
import { collageAiService, CollageAiRequest } from '../../services/collageAiService';
import { collageExportService } from '../../services/collageExport';
import { useLocalization } from '../../contexts/LocalizationContext';
import CollageCanvas from './CollageCanvas';
import BackgroundManager from './BackgroundManager';
import ElementLabels from './ElementLabels';
import InteractiveUploadGrid from './InteractiveUploadGrid';

interface ProductCollageCreatorProps {
  category: Category;
  selectedModel: AIModel;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error?: string | null;
  initialData?: Record<string, string | File> | null;
}

const ProductCollageCreator: React.FC<ProductCollageCreatorProps> = ({
  category,
  selectedModel,
  onGenerate,
  onBack,
  error,
  initialData
}) => {
  const { t } = useLocalization();

  // Collage mode toggle
  const [isCollageMode, setIsCollageMode] = useState(false);

  // Traditional single product form state
  const [formData, setFormData] = useState<Record<string, string | File>>(
    initialData || {
      productName: '',
      cameraAngle: 'option_camera_default',
      conceptPreset: 'option_concept_modern',
      customRequest: ''
    }
  );

  // Collage state
  const [collageState, setCollageState] = useState<CollageState>(() => ({
    preset: getDefaultProductPreset(),
    elements: [],
    labels: {}
  }));

  const [activeTab, setActiveTab] = useState<'canvas' | 'background' | 'labels' | 'settings'>('canvas');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Traditional form handlers
  const handleTraditionalGenerate = () => {
    if (!formData.productName) {
      return;
    }

    // Build enhanced prompt from form data
    const productName = formData.productName === 'custom'
      ? (formData.customProductName as string || 'product')
      : formData.productName;

    let enhancedPrompt = `Create a professional product photography image of a ${productName}. `;

    // Add style settings
    const angleMap: Record<string, string> = {
      'option_camera_default': 'standard product photography angle',
      'option_camera_top': 'top-down view',
      'option_camera_45': '45-degree angle view',
      'option_camera_closeup': 'close-up detail shot'
    };

    const conceptMap: Record<string, string> = {
      'option_concept_warm': 'warm, natural lighting with cozy atmosphere',
      'option_concept_modern': 'clean, modern studio lighting with minimalist background',
      'option_concept_isolated': 'isolated on clean background with enhanced details',
      'option_concept_lifestyle': 'dynamic lifestyle scene with natural environment'
    };

    if (formData.cameraAngle && angleMap[formData.cameraAngle as string]) {
      enhancedPrompt += `Camera angle: ${angleMap[formData.cameraAngle as string]}. `;
    }

    if (formData.conceptPreset && conceptMap[formData.conceptPreset as string]) {
      enhancedPrompt += `Style: ${conceptMap[formData.conceptPreset as string]}. `;
    }

    // Add background settings
    if (formData.backgroundType) {
      const backgroundMap: Record<string, string> = {
        'white': 'clean white background',
        'black': 'elegant black background',
        'gradient': 'gradient background',
        'studio': 'professional studio setup',
        'natural': 'natural environment background',
        'minimalist': 'minimalist scene'
      };
      enhancedPrompt += `Background: ${backgroundMap[formData.backgroundType as string] || 'clean background'}. `;
    }

    // Add lighting settings
    if (formData.lightingStyle) {
      const lightingMap: Record<string, string> = {
        'soft': 'soft and even lighting',
        'dramatic': 'dramatic shadows and lighting',
        'bright': 'bright and airy lighting',
        'golden': 'golden hour lighting',
        'studio': 'professional studio lighting'
      };
      enhancedPrompt += `Lighting: ${lightingMap[formData.lightingStyle as string] || 'soft lighting'}. `;
    }

    if (formData.customRequest) {
      enhancedPrompt += `Additional requirements: ${formData.customRequest}. `;
    }

    enhancedPrompt += 'High-resolution, professional quality, commercial photography style.';

    // Create form data for AI generation
    const aiFormData = {
      ...formData,
      productName,
      customRequest: enhancedPrompt,
      productImage: new Blob(), // Empty blob since we're generating from text
    };

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

    setIsGenerating(true);

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
    } finally {
      setIsGenerating(false);
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
            <button
              onClick={() => setIsCollageMode(true)}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Switch to Collage Mode
            </button>
            <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              ← Back to Categories
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-250px)]">
          {/* Left Column - Settings */}
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)]">
            {/* Product Selection */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Product Selection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
                <select
                  value={formData.productName as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a product type...</option>
                  <option value="smartphone">Smartphone</option>
                  <option value="laptop">Laptop</option>
                  <option value="headphones">Headphones</option>
                  <option value="watch">Watch</option>
                  <option value="camera">Camera</option>
                  <option value="shoes">Shoes</option>
                  <option value="clothing">Clothing</option>
                  <option value="accessories">Accessories</option>
                  <option value="home_decor">Home Decor</option>
                  <option value="furniture">Furniture</option>
                  <option value="cosmetics">Cosmetics</option>
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="sports_equipment">Sports Equipment</option>
                  <option value="automotive">Automotive</option>
                  <option value="books">Books</option>
                  <option value="toys">Toys</option>
                  <option value="jewelry">Jewelry</option>
                  <option value="electronics">Electronics</option>
                  <option value="custom">Custom Product</option>
                </select>
              </div>

              {formData.productName === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Product Name</label>
                  <input
                    type="text"
                    value={formData.customProductName as string || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customProductName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter custom product name..."
                  />
                </div>
              )}
            </div>
          </div>

            {/* Style Settings */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Style Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Camera Angle</label>
                  <select
                    value={formData.cameraAngle as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, cameraAngle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="option_camera_default">Default View</option>
                    <option value="option_camera_top">Top View</option>
                    <option value="option_camera_45">45° Angle</option>
                    <option value="option_camera_closeup">Close-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concept Style</label>
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

            {/* Background Settings */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Background Settings</h3>
              <div className="space-y-3">
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
              disabled={!formData.productName}
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
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  {formData.productName
                    ? `Ready to generate ${formData.productName === 'custom' ? formData.customProductName || 'custom product' : formData.productName} photo`
                    : 'Select a product type to see preview'
                  }
                </p>
                {formData.productName && (
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <p>Style: {formData.conceptPreset?.replace('option_concept_', '').replace('_', ' & ')}</p>
                    <p>Background: {formData.backgroundType || 'white'}</p>
                    <p>Lighting: {formData.lightingStyle || 'soft'}</p>
                  </div>
                )}
              </div>
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