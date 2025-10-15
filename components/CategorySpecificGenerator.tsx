import React from 'react';
import type { Category, AIModel } from '../types';
import ProductPhotoForm from './category-specific/ProductPhotoForm';
import ModelReskinForm from './category-specific/ModelReskinForm';
import ConceptArtForm from './category-specific/ConceptArtForm';
import ProductCollageCreator from './collage/ProductCollageCreator';
import ImageGenerator from './ImageGenerator'; // Fallback for categories without specific forms

interface CategorySpecificGeneratorProps {
  category: Category;
  selectedModel: AIModel;
  onGenerate: (formData: Record<string, string | File>) => void;
  onBack: () => void;
  error: string | null;
  isGenerating: boolean;
  generatedImages: string[];
  initialData?: Record<string, string | File> | null;
}

const CategorySpecificGenerator: React.FC<CategorySpecificGeneratorProps> = ({
  category,
  selectedModel,
  onGenerate,
  onBack,
  error,
  isGenerating,
  generatedImages,
  initialData,
}) => {
  // Map category IDs to their specific form components
  const categoryForms: Record<string, React.ComponentType<any>> = {
    product_photo: ProductCollageCreator,
    model_reskin: ModelReskinForm,
    concept_art: ConceptArtForm,
    // Add more category-specific forms here
  };

  // Get the specific form component for this category
  const SpecificForm = categoryForms[category.id];

  // If we have a specific form, use it; otherwise, fall back to the generic form
  if (SpecificForm) {
    return (
      <SpecificForm
        category={category}
        selectedModel={selectedModel}
        onGenerate={onGenerate}
        onBack={onBack}
        error={error}
        isGenerating={isGenerating}
        generatedImages={generatedImages}
        initialData={initialData}
      />
    );
  }

  // Fallback to the original generic form with enhanced styling
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-lg p-6 border border-red-100">
        <ImageGenerator
          category={category}
          onGenerate={onGenerate}
          onBack={onBack}
          error={error}
          isGenerating={isGenerating}
          generatedImages={generatedImages}
          initialData={initialData}
        />
      </div>
    </div>
  );
};

export default CategorySpecificGenerator;