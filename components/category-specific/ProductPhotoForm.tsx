import React from 'react';
import { Camera, Upload, Sparkles, Play, Home, Zap, Image, Type, Settings, Monitor, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { Category } from '../../types';

interface ProductPhotoFormProps {
  category: Category;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error: string | null;
  initialData?: Record<string, string | File> | null;
}

type PreviewState = 'empty' | 'preview' | 'loading' | 'result' | 'error';

const ProductPhotoForm: React.FC<ProductPhotoFormProps> = ({ 
  category, 
  onGenerate, 
  onBack, 
  error, 
  initialData 
}) => {
  const { t } = useLocalization();
  const [formData, setFormData] = React.useState<Record<string, string | File>>(
    initialData || { aspectRatio: '1:1' }
  );
  const [activeBlock, setActiveBlock] = React.useState<number>(1);
  const [previewState, setPreviewState] = React.useState<PreviewState>('empty');
  const [productImagePreview, setProductImagePreview] = React.useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = React.useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = React.useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPreviewState('loading');
    onGenerate(formData);
  };

  const handleImageUpload = (file: File, type: 'product' | 'reference') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'product') {
        setProductImagePreview(result);
        setFormData(prev => ({ ...prev, productImage: file }));
      } else {
        setReferenceImagePreview(result);
        setFormData(prev => ({ ...prev, referenceImage: file }));
      }
      setPreviewState('preview');
    };
    reader.readAsDataURL(file);
  };

  const aspectRatios = [
    { id: '9:16', label: '9:16', icon: '📱', desc: 'Stories, TikTok' },
    { id: '1:1', label: '1:1', icon: '⬜', desc: 'Instagram, Square' },
    { id: '16:9', label: '16:9', icon: '📺', desc: 'YouTube, Landscape' },
  ];

  const canProceed = formData.productImage && formData.productName;

  const BlockContainer = ({ children, isActive, number, title, icon: Icon }: any) => (
    <Card 
      className={`relative border-2 transition-all duration-300 ${
        isActive ? 'border-red-500 shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-red-300'
      } cursor-pointer`}
      onClick={() => setActiveBlock(number)}
    >
      {/* Block Number Badge */}
      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm z-10 ${
        isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
      }`}>
        {number}
      </div>
      
      <CardHeader className={`pb-4 ${isActive ? 'bg-gradient-to-r from-red-50 to-pink-50' : 'bg-gray-50'}`}>
        <CardTitle className="flex items-center gap-3 text-lg">
          <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );

  const PreviewScreen = () => {
    const getAspectRatioClass = () => {
      switch (formData.aspectRatio) {
        case '9:16': return 'aspect-[9/16] max-h-96';
        case '16:9': return 'aspect-[16/9] max-w-96';
        case '1:1': 
        default: return 'aspect-square max-w-80';
      }
    };

    switch (previewState) {
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Monitor className="w-24 h-24 mb-4" />
            <p className="text-xl font-semibold mb-2">Preview Screen</p>
            <p className="text-sm text-center">Upload your product image to see preview</p>
          </div>
        );

      case 'preview':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Preview</h3>
              <p className="text-sm text-gray-600 text-center">Format: {formData.aspectRatio}</p>
            </div>
            
            <div className="space-y-4">
              {productImagePreview && (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">Product Image</p>
                  <div className={`${getAspectRatioClass()} mx-auto border-2 border-gray-200 rounded-lg overflow-hidden`}>
                    <img 
                      src={productImagePreview} 
                      alt="Product preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {referenceImagePreview && (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">Reference Style</p>
                  <div className="w-32 h-32 mx-auto border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={referenceImagePreview} 
                      alt="Reference preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-full text-red-600">
            <div className="relative mb-6">
              <Loader2 className="w-16 h-16 animate-spin" />
              <Zap className="w-8 h-8 absolute top-4 left-4 animate-ping" />
            </div>
            <p className="text-xl font-bold mb-2">Generating...</p>
            <p className="text-sm text-gray-600 text-center mb-4">AI is creating your product photo</p>
            
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">This may take 1-2 minutes</p>
          </div>
        );

      case 'result':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="mb-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-800">Generated Results</h3>
              <p className="text-sm text-gray-600">Your AI product photos are ready!</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 max-w-sm">
              {generatedImages.map((image, index) => (
                <div key={index} className={`${getAspectRatioClass()} border-2 border-green-200 rounded-lg overflow-hidden`}>
                  <img 
                    src={image} 
                    alt={`Generated result ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <XCircle className="w-16 h-16 mb-4" />
            <p className="text-xl font-bold mb-2">Generation Failed</p>
            <p className="text-sm text-gray-600 text-center">Please try again</p>
          </div>
        );

      default:
        return null;
    }
  };

  // Update error handling
  React.useEffect(() => {
    if (error) {
      setPreviewState('error');
    }
  }, [error]);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Gaming Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <Camera className="w-8 h-8" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t(category.nameKey)}</h1>
            <p className="text-red-100 text-sm">{t(category.descriptionKey)}</p>
          </div>
          <Zap className="w-8 h-8 animate-pulse" />
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex">
        {/* Left Panel - Controls */}
        <div className="w-1/2 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 h-full">
            {/* Block 1: Product & Template Setup */}
            <BlockContainer 
              isActive={activeBlock === 1} 
              number={1} 
              title="Product & Template Setup" 
              icon={Image}
            >
              <div className="space-y-6">
                {/* Product Upload */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Product Image *
                  </Label>
                  <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center hover:border-red-500 transition-colors group">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'product');
                      }}
                      className="hidden"
                      id="productImage"
                      required
                    />
                    <label htmlFor="productImage" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-red-400 group-hover:text-red-600" />
                      <p className="text-gray-600 group-hover:text-red-600 font-medium">
                        {formData.productImage ? '✅ Image uploaded!' : 'Click to upload product image'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">Max 10MB • PNG, JPG, JPEG</p>
                    </label>
                  </div>
                  
                  {/* Product Name */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Product Name *</Label>
                    <Input
                      type="text"
                      value={formData.productName as string || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                      placeholder="e.g., Premium Smartphone"
                      className="mt-2 border-2 border-gray-200 focus:border-red-400 rounded-lg"
                      required
                    />
                  </div>
                </div>

                {/* Aspect Ratio Selection */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Aspect Ratio Template
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, aspectRatio: ratio.id }))}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                          formData.aspectRatio === ratio.id
                            ? 'border-red-500 bg-red-50 shadow-lg scale-[1.02]'
                            : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{ratio.icon}</span>
                          <div>
                            <div className="font-bold">{ratio.label}</div>
                            <div className="text-sm text-gray-600">{ratio.desc}</div>
                          </div>
                          {formData.aspectRatio === ratio.id && (
                            <span className="ml-auto text-red-500 text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Reference Image Upload */}
                  <div className="pt-4 border-t border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Reference Image (Optional)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'reference');
                      }}
                      className="border-2 border-gray-200 focus:border-red-400 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload a style reference image</p>
                  </div>
                </div>
              </div>
            </BlockContainer>

            {/* Block 2: Custom Prompt */}
            <BlockContainer 
              isActive={activeBlock === 2} 
              number={2} 
              title="Custom Prompt & Style" 
              icon={Type}
            >
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Describe your vision
                </Label>
                <Textarea
                  value={formData.customPrompt as string || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                  placeholder="Describe the style, mood, lighting, and setting you want for your product photo..."
                  className="min-h-[100px] border-2 border-gray-200 focus:border-red-400 rounded-xl text-base p-4"
                  rows={4}
                />
                <div className="flex flex-wrap gap-2">
                  {['Modern & Clean', 'Luxury & Premium', 'Natural & Organic', 'Vibrant & Colorful', 'Minimalist & Simple'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        const currentPrompt = formData.customPrompt as string || '';
                        setFormData(prev => ({ 
                          ...prev, 
                          customPrompt: currentPrompt ? `${currentPrompt}, ${suggestion}` : suggestion 
                        }));
                      }}
                      className="px-3 py-1 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-full text-sm transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </BlockContainer>

            {/* Block 3: Action Buttons */}
            <BlockContainer 
              isActive={activeBlock === 3} 
              number={3} 
              title="Generate & Actions" 
              icon={Play}
            >
              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 py-3 text-base font-semibold rounded-xl"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Back to Menu
                </Button>
                
                <Button
                  type="submit"
                  disabled={!canProceed}
                  className={`py-4 text-base font-bold rounded-xl transition-all duration-300 ${
                    canProceed 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] animate-pulse'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {canProceed ? 'Generate AI Photo!' : 'Complete Setup First'}
                </Button>

                {canProceed && (
                  <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                    <p className="text-green-700 font-semibold text-sm">🎉 Ready to generate!</p>
                    <p className="text-xs text-green-600 mt-1">This will create 3 high-quality images</p>
                  </div>
                )}
              </div>
            </BlockContainer>
          </form>
        </div>

        {/* Right Panel - Preview Screen */}
        <div className="w-1/2 bg-white border-l border-gray-200 flex">
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-100 p-4 border-b border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <Monitor className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Preview Screen</h3>
              </div>
            </div>
            <div className="flex-1">
              <PreviewScreen />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoForm;