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
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

  // Traditional form handlers
  const handleTraditionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productImage) {
      return;
    }
    onGenerate(formData);
  };

  const handleTraditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setProductImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setFormData(prev => ({ ...prev, productImage: file }));
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

  const handleCollageImageUpload = useCallback((files: FileList | null, elementIndex?: number) => {
    if (!files || files.length === 0) return;

    const newElements: CollageElement[] = [];
    const { preset } = collageState;

    Array.from(files).slice(0, preset.maxElements - collageState.elements.length).forEach((file, index) => {
      const actualIndex = elementIndex !== undefined ? elementIndex : collageState.elements.length + index;

      let position = preset.defaultElements[actualIndex]?.position;
      if (!position) {
        const cols = Math.ceil(Math.sqrt(preset.maxElements));
        const row = Math.floor(actualIndex / cols);
        const col = actualIndex % cols;
        position = {
          x: (col / cols) + 0.1,
          y: (row / cols) + 0.1,
          width: 0.3,
          height: 0.3
        };
      }

      newElements.push({
        id: `element-${Date.now()}-${index}`,
        type: 'image',
        file,
        position,
        zIndex: actualIndex + 1
      });
    });

    setCollageState(prev => ({
      ...prev,
      elements: elementIndex !== undefined
        ? prev.elements.map((el, i) => i === elementIndex ? newElements[0] : el)
        : [...prev.elements, ...newElements]
    }));
  }, [collageState]);

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

        <form onSubmit={handleTraditionalSubmit} className="space-y-6">
          {/* Product Image Upload */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Product Image</h3>
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {productImagePreview ? (
                    <img src={productImagePreview} alt="Product preview" className="max-h-48 max-w-full object-contain" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload product image</span>
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or JPEG</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleTraditionalImageUpload}
                  required
                />
              </label>
            </div>
          </div>

          {/* Traditional form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Product Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    value={formData.productName as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter product name..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Camera Angle</label>
                  <select
                    value={formData.cameraAngle as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, cameraAngle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="option_camera_default">Default View</option>
                    <option value="option_camera_top">Top View</option>
                    <option value="option_camera_45">45° Angle</option>
                    <option value="option_camera_closeup">Close-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Concept Style</label>
                  <select
                    value={formData.conceptPreset as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, conceptPreset: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="option_concept_warm">Warm & Natural</option>
                    <option value="option_concept_modern">Modern & Clean</option>
                    <option value="option_concept_isolated">Isolated Background</option>
                    <option value="option_concept_lifestyle">Lifestyle Scene</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Additional Requests</h3>
            <textarea
              value={formData.customRequest as string}
              onChange={(e) => setFormData(prev => ({ ...prev, customRequest: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              rows={3}
              placeholder="Any additional requirements or style preferences..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!formData.productImage}
            className="w-full flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5 mr-2" />
            Generate Product Photo
          </button>
        </form>
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
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Choose Product Layout</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PRODUCT_COLLAGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                collageState.preset.id === preset.id
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="mb-1">{preset.name}</div>
              <div className="text-xs text-gray-500">
                {preset.aspectRatio.width}:{preset.aspectRatio.height} • {preset.maxElements} items
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image Upload */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Upload product images</span>
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG or JPEG (max {collageState.preset.maxElements} images)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleCollageImageUpload(e.target.files)}
              />
            </label>
          </div>

          {/* Canvas */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <CollageCanvas
              collageState={collageState}
              onElementUpdate={handleElementUpdate}
              onElementRemove={handleElementRemove}
              className="w-full"
            />
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'canvas', label: 'Settings', icon: Settings },
              { id: 'background', label: 'Background', icon: ImageIcon },
              { id: 'labels', label: 'Labels', icon: Upload }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'background' && (
              <BackgroundManager
                currentBackground={collageState.background}
                onBackgroundChange={handleBackgroundChange}
                allowLabels={collageState.preset.allowLabels}
              />
            )}

            {activeTab === 'labels' && (
              <ElementLabels
                elements={collageState.elements}
                labels={collageState.labels}
                onLabelChange={handleLabelChange}
                onElementRemove={handleElementRemove}
              />
            )}

            {activeTab === 'canvas' && (
              <div className="space-y-4">
                {/* Product Details */}
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

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
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