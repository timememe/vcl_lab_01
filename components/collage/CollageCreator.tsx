import React, { useState, useCallback } from 'react';
import { Upload, Download, Wand2, Settings, Image as ImageIcon } from 'lucide-react';
import { CollageElement, CollageState, CollagePreset } from '../../types/collage';
import { AIModel } from '../../types';
import { COLLAGE_PRESETS, getDefaultPreset } from '../../services/collagePresets';
import { collageAiService, CollageAiRequest } from '../../services/collageAiService';
import { collageExportService } from '../../services/collageExport';
import CollageCanvas from './CollageCanvas';
import BackgroundManager from './BackgroundManager';
import ElementLabels from './ElementLabels';

interface CollageCreatorProps {
  selectedModel: AIModel;
  onGenerate: (images: string[]) => void;
  onBack: () => void;
}

const CollageCreator: React.FC<CollageCreatorProps> = ({
  selectedModel,
  onGenerate,
  onBack
}) => {
  const [collageState, setCollageState] = useState<CollageState>(() => ({
    preset: getDefaultPreset(),
    elements: [],
    labels: {}
  }));

  const [activeTab, setActiveTab] = useState<'canvas' | 'background' | 'labels' | 'settings'>('canvas');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (presetId: string) => {
    const preset = COLLAGE_PRESETS.find(p => p.id === presetId);
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

  const handleImageUpload = useCallback((files: FileList | null, elementIndex?: number) => {
    if (!files || files.length === 0) return;

    const newElements: CollageElement[] = [];
    const { preset } = collageState;

    Array.from(files).slice(0, preset.maxElements - collageState.elements.length).forEach((file, index) => {
      const actualIndex = elementIndex !== undefined ? elementIndex : collageState.elements.length + index;

      let position = preset.defaultElements[actualIndex]?.position;
      if (!position) {
        // Auto-position new elements
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

  const handleBackgroundLabelChange = useCallback((label: string) => {
    setCollageState(prev => ({
      ...prev,
      background: prev.background ? { ...prev.background, label } : undefined
    }));
  }, []);

  const handleGenerate = async () => {
    if (collageState.elements.length === 0) {
      setError('Please add at least one image to the collage');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const request: CollageAiRequest = {
        collageState,
        customPrompt,
        enhancePrompt: true,
        generateVariations: false
      };

      const result = await collageAiService.generateFromCollage(selectedModel, request);
      onGenerate(result.images);
    } catch (err) {
      console.error('Collage generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate collage');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const result = await collageExportService.exportCollage(collageState);

      // Download the PNG
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = `collage-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export collage');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collage Creator</h1>
          <p className="text-gray-600">Create and enhance collages with AI</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Back to Categories
        </button>
      </div>

      {/* Preset Selector */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Choose Layout Preset</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {COLLAGE_PRESETS.map((preset) => (
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
                  <span className="font-semibold">Click to upload images</span>
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
                onChange={(e) => handleImageUpload(e.target.files)}
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
              { id: 'canvas', label: 'Canvas', icon: ImageIcon },
              { id: 'background', label: 'Background', icon: Settings },
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
                onLabelChange={handleBackgroundLabelChange}
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
                {/* Custom Prompt */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">AI Enhancement Prompt</h3>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                    rows={4}
                    placeholder="Describe how you want the AI to enhance your collage..."
                  />
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleGenerate}
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

export default CollageCreator;