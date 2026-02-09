import type React from 'react';

export interface FormField {
  name: string;
  labelKey: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  placeholderKey?: string;
  optionKeys?: string[];
  required: boolean;
  infoKey?: string;
  condition?: {
    field: string;
    value: string; // This value is the option key, not the translated text
  }
}

export interface Category {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  fields: FormField[];
  promptTemplate: (data: Record<string, string>) => string;
}

export type AIModel = 'gemini' | 'openai';

export interface ProductPresets {
  background: string;
  lighting: string;
  cameraAngle: string;
  concept: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  presets: ProductPresets;
  promptTemplate: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  products: Product[];
  created_at?: string;
  updated_at?: string;
}