import React from 'react';
import type { Category } from '@/types';

// Icons for new categories
const ProductPhotoIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg> );
const ModelProductIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg> );
const ConceptArtIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-700" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> );
const StoryboardIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 6H5V5h14v4zm0 4H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zm0 6H5v-4h14v4z"/></svg> );
const AngleChangeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> );
const ModelReskinIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M20.26 8.13l-4.21-5.9c-.31-.44-.82-.73-1.39-.73H9.34c-.57 0-1.08.29-1.39.73L3.74 8.13c-.22.31-.34.68-.34 1.07v.51c0 1.1.9 2 2 2h13.2c1.1 0 2-.9 2-2v-.51c0-.39-.12-.76-.34-1.07zM12 14c-2.76 0-5 2.24-5 5v1h10v-1c0-2.76-2.24-5-5-5z"/></svg> );
const CollageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6h6v6H2V6zm2 2v2h2V8H4zm8-2h6v6h-6V6zm2 2v2h2V8h-2zM2 14h6v6H2v-6zm2 2v2h2v-2H4zm10 0h6v6h-6v-6zm2 2v2h2v-2h-2zm-4-8h2v2h-2V8zm0 8h2v2h-2v-2z"/></svg> );

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

const getFaceSwapInstruction = (data: Record<string, any>) => {
    return data.faceSwapImage 
        ? "FACE SWAP INSTRUCTION: A face reference image has been provided. Replace the face of the person in the model image with the face from the reference image. Maintain natural facial proportions, skin tone consistency, and realistic integration. The new face should match the lighting and angle of the original photo."
        : "";
}

const getDemographicTransformInstruction = (data: Record<string, any>) => {
    const instructions = [];
    
    if (data.targetGender && data.targetGender !== 'option_gender_keep') {
        const genderMap = {
            'option_gender_male': 'Transform to male appearance',
            'option_gender_female': 'Transform to female appearance', 
            'option_gender_non_binary': 'Transform to non-binary/gender-neutral appearance'
        };
        instructions.push(genderMap[data.targetGender as keyof typeof genderMap]);
    }
    
    if (data.targetAge && data.targetAge !== 'option_age_keep') {
        const ageMap = {
            'option_age_child': 'Transform to child age (8-12 years)',
            'option_age_teen': 'Transform to teenage age (13-17 years)',
            'option_age_young_adult': 'Transform to young adult age (18-25 years)',
            'option_age_middle_aged': 'Transform to middle-aged appearance (35-50 years)',
            'option_age_elderly': 'Transform to elderly appearance (65+ years)'
        };
        instructions.push(ageMap[data.targetAge as keyof typeof ageMap]);
    }
    
    if (data.targetEthnicity && data.targetEthnicity !== 'option_ethnicity_keep') {
        const ethnicityMap = {
            'option_ethnicity_caucasian': 'Transform to Caucasian/European ethnicity',
            'option_ethnicity_african': 'Transform to African/African-American ethnicity',
            'option_ethnicity_asian': 'Transform to Asian ethnicity',
            'option_ethnicity_hispanic': 'Transform to Hispanic/Latino ethnicity',
            'option_ethnicity_middle_eastern': 'Transform to Middle Eastern ethnicity',
            'option_ethnicity_mixed': 'Transform to mixed/multi-ethnic appearance'
        };
        instructions.push(ethnicityMap[data.targetEthnicity as keyof typeof ethnicityMap]);
    }
    
    return instructions.length > 0 
        ? `DEMOGRAPHIC TRANSFORMATION: ${instructions.join('. ')}. Maintain realistic proportions and natural appearance.`
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
      { name: 'transformationType', labelKey: 'field_transformation_type_label', type: 'select', optionKeys: ['option_transform_outfit', 'option_transform_face_swap', 'option_transform_demographics', 'option_transform_full'], required: true },
      { name: 'faceSwapImage', labelKey: 'field_face_swap_image_label', type: 'file', required: true, infoKey: 'field_face_swap_image_info', condition: { field: 'transformationType', value: 'option_transform_face_swap' }},
      { name: 'targetGender', labelKey: 'field_target_gender_label', type: 'select', optionKeys: ['option_gender_keep', 'option_gender_male', 'option_gender_female', 'option_gender_non_binary'], required: true, condition: { field: 'transformationType', value: 'option_transform_demographics' }},
      { name: 'targetAge', labelKey: 'field_target_age_label', type: 'select', optionKeys: ['option_age_keep', 'option_age_child', 'option_age_teen', 'option_age_young_adult', 'option_age_middle_aged', 'option_age_elderly'], required: true, condition: { field: 'transformationType', value: 'option_transform_demographics' }},
      { name: 'targetEthnicity', labelKey: 'field_target_ethnicity_label', type: 'select', optionKeys: ['option_ethnicity_keep', 'option_ethnicity_caucasian', 'option_ethnicity_african', 'option_ethnicity_asian', 'option_ethnicity_hispanic', 'option_ethnicity_middle_eastern', 'option_ethnicity_mixed'], required: true, condition: { field: 'transformationType', value: 'option_transform_demographics' }},
      { name: 'outfitDescription', labelKey: 'field_outfit_description_label', type: 'textarea', placeholderKey: 'field_outfit_description_placeholder', required: true, condition: { field: 'transformationType', value: 'option_transform_outfit' }},
      { name: 'fullTransformDescription', labelKey: 'field_full_transform_description_label', type: 'textarea', placeholderKey: 'field_full_transform_description_placeholder', required: true, condition: { field: 'transformationType', value: 'option_transform_full' }},
      { name: 'stylePreset', labelKey: 'field_style_preset_label', type: 'select', optionKeys: ['option_style_casual', 'option_style_formal', 'option_style_sporty', 'option_style_trendy', 'option_custom'], required: false },
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
      
      const transformationInstructions = {
        'option_transform_outfit': `Transform the model's outfit based on: "${data.outfitDescription}". Keep the model's face, body, pose, and all other characteristics exactly the same.`,
        'option_transform_face_swap': `Perform a face swap using the provided reference face image. Maintain the model's body, pose, and outfit while replacing only the face.`,
        'option_transform_demographics': `Transform the model's demographic characteristics as specified. Maintain the model's pose and outfit while changing the specified demographic features.`,
        'option_transform_full': `Perform a complete transformation based on: "${data.fullTransformDescription}". This may include changes to appearance, outfit, and other characteristics as described.`
      };
      
      const baseInstruction = transformationInstructions[data.transformationType as keyof typeof transformationInstructions] || transformationInstructions['option_transform_outfit'];
      const styleInstruction = data.stylePreset ? `Style direction: ${styleInstructions[data.stylePreset as keyof typeof styleInstructions]}` : '';
      
      return `${baseInstruction}
      ${styleInstruction}
      ${getFaceSwapInstruction(data)}
      ${getDemographicTransformInstruction(data)}
      ${getModelReferenceInstruction(data)}
      ${getConsistencyReferenceInstruction(data)}
      Additional requests: "${data.customRequest || 'None'}".
      Ensure all transformations look natural and realistic while maintaining high image quality.`;
    },
  },
  {
    id: 'collage',
    nameKey: 'category_collage_name',
    descriptionKey: 'category_collage_desc',
    icon: <CollageIcon />,
    fields: [],
    promptTemplate: () => 'Collage creation and AI enhancement',
  }
];