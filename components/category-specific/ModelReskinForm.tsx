import React from 'react';
import { User, Palette, RefreshCw, Sparkles, Users, Calendar, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useLocalization } from '../../contexts/LocalizationContext';
import type { Category, FormField } from '../../types';

interface ModelReskinFormProps {
  category: Category;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error: string | null;
  initialData?: Record<string, string | File> | null;
}

const ModelReskinForm: React.FC<ModelReskinFormProps> = ({ 
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
    if (fieldName.includes('gender')) return Users;
    if (fieldName.includes('age')) return Calendar;
    if (fieldName.includes('ethnicity')) return Globe;
    if (fieldName.includes('face')) return User;
    if (fieldName.includes('transform')) return RefreshCw;
    return Palette;
  };

  const renderField = (field: FormField) => {
    if (field.condition && formData[field.condition.field] !== field.condition.value) {
      return null;
    }

    const Icon = getFieldIcon(field.name);
    const commonClasses = "transition-all duration-300 transform hover:scale-[1.01]";

    switch (field.type) {
      case 'file':
        return (
          <div key={field.name} className="space-y-3">
            <Label htmlFor={field.name} className="flex items-center gap-2 text-red-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300"></div>
              <Input
                id={field.name}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData(prev => ({ ...prev, [field.name]: file }));
                }}
                className={`${commonClasses} relative border-red-300 focus:border-red-500 focus:ring-red-200 bg-white/80 backdrop-blur-sm`}
                required={field.required}
              />
            </div>
            {field.infoKey && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md border-l-4 border-red-300">{t(field.infoKey)}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-3">
            <Label className="flex items-center gap-2 text-red-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-300 to-pink-300 rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300"></div>
              <Select
                value={formData[field.name] as string || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                required={field.required}
              >
                <SelectTrigger className={`${commonClasses} relative border-red-300 focus:border-red-500 focus:ring-red-200 bg-white/80 backdrop-blur-sm`}>
                  <SelectValue placeholder={field.placeholderKey ? t(field.placeholderKey) : `Select ${t(field.labelKey)}`} />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-red-300 shadow-lg">
                  {field.optionKeys?.map((optionKey) => (
                    <SelectItem key={optionKey} value={optionKey} className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50">
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
            <Label className="flex items-center gap-2 text-red-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-300 to-pink-300 rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300"></div>
              <Textarea
                value={formData[field.name] as string || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
                className={`${commonClasses} relative border-red-300 focus:border-red-500 focus:ring-red-200 min-h-[120px] bg-white/80 backdrop-blur-sm`}
                required={field.required}
              />
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-3">
            <Label className="flex items-center gap-2 text-red-800 font-medium">
              <Icon className="w-4 h-4" />
              {t(field.labelKey)}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-300 to-pink-300 rounded-lg opacity-20 blur-sm group-hover:opacity-30 transition-opacity duration-300"></div>
              <Input
                type="text"
                value={formData[field.name] as string || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                placeholder={field.placeholderKey ? t(field.placeholderKey) : ''}
                className={`${commonClasses} relative border-red-300 focus:border-red-500 focus:ring-red-200 bg-white/80 backdrop-blur-sm`}
                required={field.required}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="border-red-200 shadow-xl bg-gradient-to-br from-red-50 via-pink-50 to-white overflow-hidden">
        <CardHeader className="border-b border-red-100 bg-gradient-to-r from-red-700 via-red-600 to-pink-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <User className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {t(category.nameKey)}
                <RefreshCw className="w-5 h-5 opacity-80" />
              </CardTitle>
              <CardDescription className="text-red-100 text-base">
                {t(category.descriptionKey)}
              </CardDescription>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        </CardHeader>
        
        <CardContent className="p-8 relative">
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-100 to-pink-100 border border-red-300 rounded-xl text-red-700 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {category.fields.map(renderField)}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-red-200">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 border-red-300 text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-300"
              >
                ← {t('button_back_to_categories') || 'Back to Categories'}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 via-red-700 to-pink-600 hover:from-red-700 hover:via-red-800 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('button_generate') || 'Transform Model'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelReskinForm;