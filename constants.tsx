import React from 'react';
import type { Category } from './types';

// Icons for new categories
const ProductPhotoIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg> );
const ModelProductIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg> );
const ConceptArtIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-700" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> );
const StoryboardIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 6H5V5h14v4zm0 4H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zm0 6H5v-4h14v4z"/></svg> );
const AngleChangeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const ModelReskinIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M20.26 8.13l-4.21-5.9c-.31-.44-.82-.73-1.39-.73H9.34c-.57 0-1.08.29-1.39.73L3.74 8.13c-.22.31-.34.68-.34 1.07v.51c0 1.1.9 2 2 2h13.2c1.1 0 2-.9 2-2v-.51c0-.39-.12-.76-.34-1.07zM12 14c-2.76 0-5 2.24-5 5v1h10v-1c0-2.76-2.24-5-5-5z"/></svg> );

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

const getModelReferenceInstruction = (data: Record<string, any>) => {
    return data.modelImage 
        ? "IMPORTANT: A model photograph has also been uploaded. The primary task is to seamlessly and realistically place the uploaded product onto the person in this model photo. Pay close attention to the model's pose, body shape, and the existing lighting to ensure the product fits naturally with correct perspective, wrinkles, shadows, and highlights. Do not change the model's face or body."
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
  {
    id: 'model_product',
    nameKey: 'category_model_product_name',
    descriptionKey: 'category_model_product_desc',
    icon: <ModelProductIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'modelImage', labelKey: 'field_modelImage_label', type: 'file', required: true, infoKey: 'field_modelImage_info' },
      { name: 'productName', labelKey: 'field_productName_label', type: 'text', placeholderKey: 'field_productName_placeholder', required: true },
      { name: 'shotType', labelKey: 'field_shotType_label', type: 'select', optionKeys: ['option_shot_full', 'option_shot_upper', 'option_shot_closeup'], required: true },
      { name: 'conceptPreset', labelKey: 'field_conceptPreset_label', type: 'select', optionKeys: ['option_concept_warm', 'option_concept_modern', 'option_concept_isolated', 'option_concept_lifestyle', 'option_custom'], required: true },
      { name: 'customConcept', labelKey: 'field_customConcept_label', type: 'textarea', placeholderKey: 'field_customConcept_placeholder', required: true, condition: { field: 'conceptPreset', value: 'option_custom' }},
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const conceptInstructions = getConceptInstructions(data, {
        'option_concept_warm': 'Use soft, natural lighting with warm tones and comfortable atmosphere.',
        'option_concept_modern': 'Use bright, clean lighting with minimalist background.',
        'option_concept_isolated': 'Isolate the model and product on clean background.',
        'option_concept_lifestyle': 'Create dynamic lifestyle scene with natural environment.'
      });
      return `Transform the uploaded product image to be worn by the model in the provided model photo.
      Product: "${data.productName}"
      Shot type: "${data.shotType}"
      Concept: "${data.conceptPreset}"
      ${conceptInstructions}
      ${getModelReferenceInstruction(data)}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Place the product naturally on the model while maintaining realistic lighting, shadows, and fit.`;
    },
  },
  {
    id: 'concept_art',
    nameKey: 'category_concept_art_name',
    descriptionKey: 'category_concept_art_desc',
    icon: <ConceptArtIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'conceptDescription', labelKey: 'field_concept_description_label', type: 'textarea', placeholderKey: 'field_concept_description_placeholder', required: true },
      { name: 'artStyle', labelKey: 'field_art_style_label', type: 'select', optionKeys: ['option_style_realistic', 'option_style_artistic', 'option_style_fantasy', 'option_style_scifi', 'option_custom'], required: true },
      { name: 'customStyle', labelKey: 'field_custom_style_label', type: 'textarea', placeholderKey: 'field_custom_style_placeholder', required: true, condition: { field: 'artStyle', value: 'option_custom' }},
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const styleInstructions = {
        'option_style_realistic': 'Create a highly realistic concept art with photographic quality.',
        'option_style_artistic': 'Create artistic concept art with creative interpretation and stylized elements.',
        'option_style_fantasy': 'Create fantasy-themed concept art with magical or fantastical elements.',
        'option_style_scifi': 'Create science fiction themed concept art with futuristic elements.',
        'option_custom': data.customStyle || 'Use the specified custom artistic style.'
      };
      return `Create concept art based on the uploaded image with the following concept: "${data.conceptDescription}"
      Art style: ${styleInstructions[data.artStyle as keyof typeof styleInstructions]}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Transform the image into compelling concept art while maintaining the essence of the original subject.`;
    },
  },
  {
    id: 'storyboard',
    nameKey: 'category_storyboard_name', 
    descriptionKey: 'category_storyboard_desc',
    icon: <StoryboardIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'storyDescription', labelKey: 'field_story_description_label', type: 'textarea', placeholderKey: 'field_story_description_placeholder', required: true },
      { name: 'frameType', labelKey: 'field_frame_type_label', type: 'select', optionKeys: ['option_frame_sequence', 'option_frame_before_after', 'option_frame_process', 'option_frame_usage'], required: true },
      { name: 'frameCount', labelKey: 'field_frame_count_label', type: 'select', optionKeys: ['option_count_3', 'option_count_4', 'option_count_6'], required: true },
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const frameInstructions = {
        'option_frame_sequence': 'Create a sequential story showing the product in different scenarios.',
        'option_frame_before_after': 'Create before and after scenes showing the product\'s impact.',
        'option_frame_process': 'Create frames showing the product creation or usage process.',
        'option_frame_usage': 'Create frames showing different ways to use the product.'
      };
      return `Create a storyboard with ${data.frameCount} frames based on: "${data.storyDescription}"
      Frame type: ${frameInstructions[data.frameType as keyof typeof frameInstructions]}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Generate ${data.frameCount} connected scenes that tell a cohesive visual story featuring the uploaded subject.`;
    },
  },
  {
    id: 'angle_change',
    nameKey: 'category_angle_change_name',
    descriptionKey: 'category_angle_change_desc', 
    icon: <AngleChangeIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'targetAngle', labelKey: 'field_target_angle_label', type: 'select', optionKeys: ['option_angle_front', 'option_angle_back', 'option_angle_left', 'option_angle_right', 'option_angle_top', 'option_angle_bottom', 'option_angle_45'], required: true },
      { name: 'maintainBackground', labelKey: 'field_maintain_background_label', type: 'select', optionKeys: ['option_maintain_yes', 'option_maintain_no'], required: true },
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const backgroundInstruction = data.maintainBackground === 'option_maintain_yes' ? 
        'Maintain the same background and lighting as the original image.' :
        'You may change the background if needed to better showcase the new angle.';
      
      return `Change the viewing angle of the subject in the uploaded image to: "${data.targetAngle}"
      Background handling: ${backgroundInstruction}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Recreate the subject from the new angle while maintaining all original details, textures, and characteristics.`;
    },
  },
  {
    id: 'model_reskin',
    nameKey: 'category_model_reskin_name',
    descriptionKey: 'category_model_reskin_desc',
    icon: <ModelReskinIcon />,
    fields: [
      { name: 'productImage', labelKey: 'field_productImage_label', type: 'file', required: true, infoKey: 'field_productImage_info' },
      { name: 'modelImage', labelKey: 'field_modelImage_label', type: 'file', required: true, infoKey: 'field_modelImage_info' },
      { name: 'outfitDescription', labelKey: 'field_outfit_description_label', type: 'textarea', placeholderKey: 'field_outfit_description_placeholder', required: true },
      { name: 'stylePreset', labelKey: 'field_style_preset_label', type: 'select', optionKeys: ['option_style_casual', 'option_style_formal', 'option_style_sporty', 'option_style_trendy', 'option_custom'], required: true },
      { name: 'customStyle', labelKey: 'field_custom_style_label', type: 'textarea', placeholderKey: 'field_custom_style_placeholder', required: true, condition: { field: 'stylePreset', value: 'option_custom' }},
      { name: 'consistencyReferenceImage', labelKey: 'field_consistencyReferenceImage_label', type: 'file', required: false, infoKey: 'field_consistencyReferenceImage_info' },
      { name: 'customRequest', labelKey: 'field_customRequest_label', type: 'textarea', placeholderKey: 'field_customRequest_placeholder', required: false },
    ],
    promptTemplate: (data) => {
      const styleInstructions = {
        'option_style_casual': 'Create a casual, everyday look that\'s comfortable and relaxed.',
        'option_style_formal': 'Create a formal, professional look suitable for business or elegant events.',
        'option_style_sporty': 'Create a sporty, athletic look suitable for fitness or active lifestyle.',
        'option_style_trendy': 'Create a trendy, fashionable look following current style trends.',
        'option_custom': data.customStyle || 'Use the specified custom style preferences.'
      };
      
      return `Transform the model in the uploaded photo by changing their outfit based on: "${data.outfitDescription}"
      Style direction: ${styleInstructions[data.stylePreset as keyof typeof styleInstructions]}
      ${getModelReferenceInstruction(data)}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Keep the model's pose, face, and body exactly the same while completely changing their clothing and accessories.`;
    },
  }
];