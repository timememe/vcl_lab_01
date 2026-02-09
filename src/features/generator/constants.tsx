import React from 'react';
import type { Category } from '@/types';

const ProductPhotoIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg> );

const getConceptInstructions = (data: Record<string, string>, presetInstructions: Record<string, string>) => {
  if (data.conceptPreset === 'option_custom') {
    const customConcept = data.customConcept || 'The user has provided a custom concept, please interpret it creatively.';
    return `The user has provided a custom concept: "${customConcept}". Interpret this creative direction to generate a professional and fitting photograph.`;
  }
  const preset = data.conceptPreset;
  return presetInstructions[preset] || '';
};

const getConsistencyReferenceInstruction = (data: Record<string, any>) => {
    return data.consistencyReferenceImage
        ? "CRITICAL STYLISTIC GUIDANCE: A 'Consistency Reference Image' has been provided. This image is the master style guide. The generated photo MUST match the aesthetic of this reference image in terms of lighting (softness, direction, color), color grading, mood, and overall tone. Do NOT copy the content or subject of the reference image, but replicate its visual style precisely to ensure a consistent look across a series of photos."
        : "";
}

export const CATEGORIES: Category[] = [
  {
    id: 'product_photo',
    nameKey: 'category_product_photo_name',
    descriptionKey: 'category_product_photo_desc',
    icon: <ProductPhotoIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'productName', labelKey: 'field_productName_label', type: 'text', placeholderKey: 'field_productName_placeholder', required: true },
      { name: 'cameraAngle', labelKey: 'field_cameraAngle_label', type: 'select', optionKeys: ['option_camera_default', 'option_camera_top', 'option_camera_45', 'option_camera_closeup'], required: true },
      { name: 'conceptPreset', labelKey: 'field_conceptPreset_label', type: 'select', optionKeys: ['option_concept_warm', 'option_concept_modern', 'option_concept_isolated', 'option_concept_lifestyle', 'option_custom'], required: true },
      { name: 'customConcept', labelKey: 'field_customConcept_label', type: 'textarea', placeholderKey: 'field_customConcept_placeholder', required: true, condition: { field: 'conceptPreset', value: 'option_custom' }},
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const conceptInstructions = getConceptInstructions(data, {
        'option_concept_warm': 'Use soft, natural lighting, possibly with a warm wooden or rustic background. Create a cozy and inviting atmosphere.',
        'option_concept_modern': 'Use bright, even studio lighting with a clean, minimalist background (like light gray, white, or a solid color). The composition should be neat and organized.',
        'option_concept_isolated': 'Isolate the product on a pure white or transparent background. Enhance the product\'s texture and details, adding a subtle, realistic shadow.',
        'option_concept_lifestyle': 'Create a more dynamic scene with complementary props and lifestyle elements around the product.'
      });
      return `Transform the uploaded image of a product named "${data.productName}".
      The core concept is "${data.conceptPreset}".
      The camera angle should be: "${data.cameraAngle}".
      ${conceptInstructions}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      The final image must be a hyper-realistic, high-resolution, and professional product photograph. Keep the product itself unchanged but recompose the entire scene around it.`;
    },
  },
];
