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