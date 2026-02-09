import { CollageState } from '@/types/collage';
import { AIModel } from '@/types';
import { generateImages } from '@/features/generator/services/aiService';
import { collageExportService } from './collageExport';

export interface CollageAiRequest {
  collageState: CollageState;
  customPrompt?: string;
  enhancePrompt?: boolean;
  generateVariations?: boolean;
  variationCount?: number;
}

export interface CollageAiResponse {
  images: string[];
  usedPrompt: string;
  collageData: string;
  exportedCollage: {
    blob: Blob;
    dataUrl: string;
  };
}

export class CollageAiService {
  async generateFromCollage(
    model: AIModel,
    request: CollageAiRequest
  ): Promise<CollageAiResponse> {
    const {
      collageState,
      customPrompt = '',
      enhancePrompt = true,
      generateVariations = false,
      variationCount = 1
    } = request;

    // Export collage to PNG
    const exportResult = await collageExportService.exportCollage(collageState, {
      format: 'png',
      quality: 0.95,
      includeLabels: true,
      backgroundColor: '#ffffff'
    });

    // Build AI prompt
    const basePrompt = this.buildCollagePrompt(collageState, customPrompt, enhancePrompt);

    // Create form data for AI service
    const formData = new FormData();
    formData.append('collageImage', exportResult.blob, 'collage.png');
    formData.append('prompt', basePrompt);
    formData.append('collageData', exportResult.promptData);

    // Convert to the format expected by existing AI service
    const aiFormData: Record<string, string | File> = {
      productImage: new File([exportResult.blob], 'collage.png', { type: exportResult.blob.type }),
      productName: 'Collage Composition',
      customRequest: basePrompt,
      cameraAngle: 'option_camera_default',
      conceptPreset: 'option_custom',
      customConcept: basePrompt
    };

    // Generate images using existing AI service
    const generatedImages = await generateImages(model, {
      id: 'collage',
      nameKey: 'Collage Generation',
      descriptionKey: 'AI-enhanced collage generation',
      icon: null,
      fields: [],
      promptTemplate: () => basePrompt
    }, aiFormData);

    return {
      images: generatedImages,
      usedPrompt: basePrompt,
      collageData: exportResult.promptData,
      exportedCollage: {
        blob: exportResult.blob,
        dataUrl: exportResult.dataUrl
      }
    };
  }

  private buildCollagePrompt(
    collageState: CollageState,
    customPrompt: string,
    enhancePrompt: boolean
  ): string {
    const { preset, elements, background, labels } = collageState;

    let prompt = '';

    // Base description
    if (enhancePrompt) {
      prompt += `Create an enhanced, professional version of this collage composition. `;
      prompt += `Original layout: ${preset.name} with ${preset.aspectRatio.width}:${preset.aspectRatio.height} aspect ratio. `;
    }

    // Background description
    if (background) {
      if (background.type === 'color') {
        prompt += `Background: solid color ${background.value}. `;
      } else if (background.type === 'image') {
        prompt += `Background: custom image. `;
      }

      if (background.label) {
        prompt += `Background context: ${background.label}. `;
      }
    }

    // Elements description
    const imageElements = elements.filter(el => el.type === 'image');
    if (imageElements.length > 0) {
      prompt += `The composition contains ${imageElements.length} main element(s): `;

      imageElements.forEach((element, index) => {
        const label = labels[element.id];
        const position = `positioned at ${Math.round(element.position.x * 100)}%,${Math.round(element.position.y * 100)}%`;

        if (label) {
          prompt += `${index + 1}. ${label} (${position}), `;
        } else {
          prompt += `${index + 1}. Element ${index + 1} (${position}), `;
        }
      });
    }

    // Enhancement instructions
    if (enhancePrompt) {
      prompt += `\nEnhancement requirements: `;
      prompt += `Improve image quality, enhance lighting and shadows, `;
      prompt += `maintain original composition and positioning, `;
      prompt += `add professional styling and visual polish, `;
      prompt += `ensure all elements are well-integrated and harmonious. `;
    }

    // Custom prompt
    if (customPrompt.trim()) {
      prompt += `\nAdditional requirements: ${customPrompt.trim()} `;
    }

    // Final instructions
    prompt += `\nOutput: High-resolution, professional-quality image maintaining the exact layout and composition structure.`;

    return prompt.trim();
  }

  async generateCollageVariations(
    model: AIModel,
    collageState: CollageState,
    variations: string[]
  ): Promise<CollageAiResponse[]> {
    const results: CollageAiResponse[] = [];

    for (const variation of variations) {
      const result = await this.generateFromCollage(model, {
        collageState,
        customPrompt: variation,
        enhancePrompt: true
      });
      results.push(result);
    }

    return results;
  }

  // Preset prompt variations for different styles
  getStyleVariations(): { name: string; prompt: string }[] {
    return [
      {
        name: 'Professional Studio',
        prompt: 'Professional studio photography style with perfect lighting, clean composition, and commercial quality.'
      },
      {
        name: 'Lifestyle Scene',
        prompt: 'Natural lifestyle photography with authentic environment, soft lighting, and realistic context.'
      },
      {
        name: 'Minimalist Clean',
        prompt: 'Minimalist aesthetic with clean backgrounds, simple composition, and focus on essential elements.'
      },
      {
        name: 'Artistic Creative',
        prompt: 'Creative artistic interpretation with unique angles, interesting textures, and visual impact.'
      },
      {
        name: 'Luxury Premium',
        prompt: 'Luxury premium presentation with elegant styling, rich materials, and sophisticated atmosphere.'
      }
    ];
  }
}

export const collageAiService = new CollageAiService();
