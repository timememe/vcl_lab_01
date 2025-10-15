import React from 'react';
import type { Category } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { Card, CardContent } from './ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface CategorySelectorProps {
  categories: Category[];
  onSelect: (category: Category) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, onSelect }) => {
  const { t } = useLocalization();
  const { user } = useAuth();

  const getCategoryGradient = (categoryId: string) => {
    const gradients: Record<string, string> = {
      product_photo: 'from-red-500 to-pink-500',
      model_product: 'from-red-600 to-red-700',
      concept_art: 'from-purple-600 to-pink-600',
      storyboard: 'from-orange-500 to-red-500',
      angle_change: 'from-red-500 to-orange-500',
      model_reskin: 'from-pink-600 to-red-600',
    };
    return gradients[categoryId] || 'from-red-600 to-red-700';
  };

  const getCategoryBg = (categoryId: string) => {
    const backgrounds: Record<string, string> = {
      product_photo: 'from-red-50 to-pink-50',
      model_product: 'from-red-50 to-orange-50',
      concept_art: 'from-purple-50 to-pink-50',
      storyboard: 'from-orange-50 to-red-50',
      angle_change: 'from-red-50 to-yellow-50',
      model_reskin: 'from-pink-50 to-red-50',
    };
    return backgrounds[categoryId] || 'from-red-50 to-pink-50';
  };

  return (
    <div className="w-full max-w-7xl p-6">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-red-600" />
          <h2 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
            {t('category_selector_title')}
          </h2>
          <Sparkles className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-lg text-red-600/80 font-medium max-w-2xl mx-auto">
          {t('category_selector_subtitle')}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        {categories.map((category, index) => {
          const isEnabled = user?.role === 'admin' || category.id === 'product_photo';
          return (
            <Card 
              key={category.id}
              className={cn(
                'border-2 border-transparent transition-all duration-300 transform overflow-hidden',
                getCategoryBg(category.id),
                isEnabled 
                  ? 'group cursor-pointer hover:border-red-200 hover:scale-[1.02] hover:shadow-2xl hover:opacity-90' 
                  : 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => isEnabled && onSelect(category)}
            >
              <CardContent className="relative p-4 text-center h-full flex flex-col min-h-[200px]">
                {/* Icon with animated background */}
                <div className="relative mb-4">
                  <div className={cn(
                    'relative p-3 rounded-xl shadow-lg transform transition-transform duration-300 mx-auto w-fit',
                    getCategoryGradient(category.id),
                    isEnabled && 'group-hover:scale-105'
                  )}>
                    <div className="text-white">
                      {category.icon}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={cn(
                      'text-lg font-bold text-gray-800 mb-2 transition-colors duration-300',
                      isEnabled && 'group-hover:text-red-700'
                    )}>
                      {t(category.nameKey)}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {t(category.descriptionKey)}
                    </p>
                  </div>

                  {/* Action indicator */}
                  {isEnabled && (
                    <div className="flex items-center justify-center gap-1 text-red-600 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <span className="text-xs">Get Started</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Decorative elements */}
                {isEnabled && (
                  <>
                    <div className="absolute top-1 right-1 w-6 h-6 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-1 left-1 w-4 h-4 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </>
                )}
              </CardContent>
            </Card> 
          )
        })}
      </div>

      {/* Bottom decoration */}
      <div className="text-center mt-16">
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-100 to-pink-100 rounded-full text-red-700 font-medium border border-red-200">
          <Sparkles className="w-4 h-4" />
          <span>Choose a category to begin your AI transformation</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;