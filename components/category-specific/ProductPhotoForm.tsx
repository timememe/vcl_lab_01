import React from 'react';
import { Camera, Palette, Upload, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { Category, FormField } from '../../types';

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
    initialData || {}
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  const renderField = (field: FormField) => {
    if (field.condition && formData[field.condition.field] !== field.condition.value) {
      return null;
    }

    const commonClasses = "transition-all duration-200";

    switch (field.type) {
      case 'file':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="flex items-center gap-2 text-red-700">
              <Upload className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
              <Input
                id={field.name}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData(prev => ({ ...prev, [field.name]: file }));
                }}
                className={`${commonClasses} border-red-200 focus:border-red-400 focus:ring-red-100 group-hover:border-red-300`}
                required={field.required}
              />
              {field.infoKey && (
                <p className="text-xs text-red-600 mt-1 opacity-70">{t(field.infoKey)}</p>
              )}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-red-700">
              <Camera className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={formData[field.name] as string || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
              required={field.required}
            >
              <SelectTrigger className={`${commonClasses} border-red-200 focus:border-red-400 focus:ring-red-100`}>
                <SelectValue placeholder={field.placeholderKey ? t(field.placeholderKey) : `Select ${t(field.labelKey)}`} />
              </SelectTrigger>
              <SelectContent className="bg-white border-red-200">
                {field.optionKeys?.map((optionKey) => (
                  <SelectItem key={optionKey} value={optionKey} className="hover:bg-red-50">
                    {t(optionKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-red-700">
              <Palette className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={formData[field.name] as string || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
              className={`${commonClasses} border-red-200 focus:border-red-400 focus:ring-red-100 min-h-[100px]`}
              required={field.required}
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center gap-2 text-red-700">
              <Sparkles className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="text"
              value={formData[field.name] as string || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
              className={`${commonClasses} border-red-200 focus:border-red-400 focus:ring-red-100`}
              required={field.required}
            />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-red-200 shadow-lg bg-gradient-to-br from-red-50 to-white">
        <CardHeader className="border-b border-red-100 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">{t(category.nameKey)}</CardTitle>
              <CardDescription className="text-red-100">
                {t(category.descriptionKey)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {category.fields.map(renderField)}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-red-100">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                ← {t('button_back_to_categories') || 'Back to Categories'}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('button_generate') || 'Generate Images'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductPhotoForm;