import React from 'react';
import { Palette, Wand2, Zap, Sparkles, Brush, Stars } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { Category, FormField } from '../../types';

interface ConceptArtFormProps {
  category: Category;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error: string | null;
  initialData?: Record<string, string | File> | null;
}

const ConceptArtForm: React.FC<ConceptArtFormProps> = ({ 
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

  const getFieldIcon = (fieldName: string) => {
    if (fieldName.includes('style')) return Brush;
    if (fieldName.includes('concept')) return Wand2;
    if (fieldName.includes('description')) return Stars;
    return Palette;
  };

  const renderField = (field: FormField) => {
    if (field.condition && formData[field.condition.field] !== field.condition.value) {
      return null;
    }

    const Icon = getFieldIcon(field.name);
    const commonClasses = "transition-all duration-300";

    switch (field.type) {
      case 'file':
        return (
          <div key={field.name} className="space-y-3">
            <Label htmlFor={field.name} className="flex items-center gap-2 text-purple-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-purple-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <Input
                id={field.name}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData(prev => ({ ...prev, [field.name]: file }));
                }}
                className={`${commonClasses} relative bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-200`}
                required={field.required}
              />
            </div>
            {field.infoKey && (
              <p className="text-xs text-purple-600 bg-purple-50 p-2 rounded-md border border-purple-200">{t(field.infoKey)}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-3">
            <Label className="flex items-center gap-2 text-purple-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-purple-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <Select
                value={formData[field.name] as string || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                required={field.required}
              >
                <SelectTrigger className={`${commonClasses} relative bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-200`}>
                  <SelectValue placeholder={field.placeholderKey ? t(field.placeholderKey) : `Select ${t(field.labelKey)}`} />
                </SelectTrigger>
                <SelectContent className="bg-white border-purple-300 shadow-lg">
                  {field.optionKeys?.map((optionKey) => (
                    <SelectItem key={optionKey} value={optionKey} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50">
                      {t(optionKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-3">
            <Label className="flex items-center gap-2 text-purple-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-purple-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <Textarea
                value={formData[field.name] as string || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
                className={`${commonClasses} relative bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-200 min-h-[120px]`}
                required={field.required}
              />
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-3">
            <Label className="flex items-center gap-2 text-purple-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-purple-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <Input
                type="text"
                value={formData[field.name] as string || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
                className={`${commonClasses} relative bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-200`}
                required={field.required}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-purple-200 shadow-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 overflow-hidden">
        <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 text-white relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-24 translate-y-24 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Palette className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {t(category.nameKey)}
                <Stars className="w-5 h-5 opacity-80" />
              </CardTitle>
              <CardDescription className="text-purple-100 text-base">
                {t(category.descriptionKey)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 relative">
          {/* Decorative gradient orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full -ml-12 -mb-12 opacity-50"></div>

          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-xl text-red-700 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {category.fields.map(renderField)}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-purple-200">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 border-purple-300 text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300"
              >
                ← {t('button_back_to_categories') || 'Back to Categories'}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <Wand2 className="w-5 h-5 mr-2" />
                {t('button_generate') || 'Create Concept Art'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConceptArtForm;