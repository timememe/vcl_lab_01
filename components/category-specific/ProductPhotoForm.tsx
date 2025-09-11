import React from 'react';
import { Camera, Upload, Sparkles, Play, Home, Zap, Image, Type, Settings } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
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

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Gaming Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-2xl shadow-xl">
          <Camera className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">{t(category.nameKey)}</h1>
            <p className="text-red-100 text-sm">{t(category.descriptionKey)}</p>
          </div>
          <Zap className="w-8 h-8 animate-pulse" />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 rounded-xl text-red-700 text-center font-semibold animate-shake">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Block 1: Product & Template Setup */}
        <BlockContainer 
          isActive={activeBlock === 1} 
          number={1} 
          title="Product & Template Setup" 
          icon={Image}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Upload */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Product Image *
              </Label>
              <div className="border-2 border-dashed border-red-300 rounded-xl p-8 text-center hover:border-red-500 transition-colors group">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFormData(prev => ({ ...prev, productImage: file }));
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
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.aspectRatio === ratio.id
                        ? 'border-red-500 bg-red-50 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{ratio.icon}</span>
                      <div>
                        <div className="font-bold text-lg">{ratio.label}</div>
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
                    if (file) setFormData(prev => ({ ...prev, referenceImage: file }));
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
              className="min-h-[120px] border-2 border-gray-200 focus:border-red-400 rounded-xl text-lg p-4"
              rows={5}
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
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 py-4 text-lg font-semibold rounded-xl"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Menu
            </Button>
            
            <Button
              type="submit"
              disabled={!canProceed}
              className={`flex-1 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                canProceed 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] animate-pulse'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              {canProceed ? 'Generate AI Photo!' : 'Complete Setup First'}
            </Button>
          </div>

          {canProceed && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
              <p className="text-green-700 font-semibold">🎉 Ready to generate your awesome product photo!</p>
              <p className="text-sm text-green-600 mt-1">This will create 3 high-quality images</p>
            </div>
          )}
        </BlockContainer>
      </form>
    </div>
  );
};

export default ProductPhotoForm;