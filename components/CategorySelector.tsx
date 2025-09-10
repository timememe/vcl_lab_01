import React from 'react';
import type { Category } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { Card, CardContent } from './ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CategorySelectorProps {
  categories: Category[];
  onSelect: (category: Category) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, onSelect }) => {
  const { t } = useLocalization();

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((category, index) => (
          <Card 
            key={category.id}
            className="group cursor-pointer border-2 border-transparent hover:border-red-200 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden"
            onClick={() => onSelect(category)}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryBg(category.id)} opacity-60 group-hover:opacity-80 transition-opacity duration-300`}></div>
            
            <CardContent className="relative p-8 text-center h-full flex flex-col">
              {/* Icon with animated background */}
              <div className="relative mb-6">
                <div className={`absolute inset-0 bg-gradient-to-r ${getCategoryGradient(category.id)} rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 transform scale-110`}></div>
                <div className={`relative p-4 bg-gradient-to-br ${getCategoryGradient(category.id)} rounded-2xl shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <div className="text-white">
                    {category.icon}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-red-700 transition-colors duration-300">
                    {t(category.nameKey)}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {t(category.descriptionKey)}
                  </p>
                </div>

                {/* Action indicator */}
                <div className="flex items-center justify-center gap-2 text-red-600 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-sm">Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-2 right-2 w-16 h-16 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-2 left-2 w-8 h-8 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </CardContent>
          </Card>
        ))}
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