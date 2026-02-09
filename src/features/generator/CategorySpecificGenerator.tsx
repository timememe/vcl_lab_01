import React from 'react';
import type { Category, AIModel } from '@/types';
import ProductCollageCreator from '@/features/collage/ProductCollageCreator';

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
  return (
    <ProductCollageCreator
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
};

export default CategorySpecificGenerator;
