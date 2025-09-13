export interface CollageElement {
  id: string;
  type: 'image' | 'background' | 'text';
  file?: File;
  url?: string;
  label?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex: number;
}

export interface CollagePreset {
  id: string;
  name: string;
  aspectRatio: {
    width: number;
    height: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  defaultElements: Partial<CollageElement>[];
  maxElements: number;
  allowBackgroundChange: boolean;
  allowLabels: boolean;
}

export interface CollageState {
  preset: CollagePreset;
  elements: CollageElement[];
  background?: {
    type: 'color' | 'image';
    value: string;
    label?: string;
  };
  labels: {
    [elementId: string]: string;
  };
}

export interface CollageExportOptions {
  format: 'png' | 'jpeg';
  quality: number;
  includeLabels: boolean;
  backgroundColor?: string;
}

export interface CollageConfig {
  presets: CollagePreset[];
  defaultPresetId: string;
  exportOptions: CollageExportOptions;
}