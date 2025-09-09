export interface ProductPreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  imagePath: string;
  category?: string; // Optional category filter
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  {
    id: 'dirol',
    nameKey: 'preset_dirol_name',
    descriptionKey: 'preset_dirol_desc',
    imagePath: '/presets/dirol.jpg'
    // No category restriction - available for all categories
  },
  {
    id: 'product_2',
    nameKey: 'preset_product_2_name',
    descriptionKey: 'preset_product_2_desc',
    imagePath: '/presets/product_2.svg'
    // No category restriction - available for all categories
  },
  {
    id: 'product_3',
    nameKey: 'preset_product_3_name',
    descriptionKey: 'preset_product_3_desc',
    imagePath: '/presets/product_3.svg'
    // No category restriction - available for all categories
  }
];

export const getPresetsForCategory = (categoryId: string): ProductPreset[] => {
  return PRODUCT_PRESETS.filter(preset => 
    !preset.category || preset.category === categoryId
  );
};

export const getPresetById = (presetId: string): ProductPreset | undefined => {
  return PRODUCT_PRESETS.find(preset => preset.id === presetId);
};