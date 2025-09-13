import { CollageState, CollageExportOptions, CollageElement } from '../types/collage';

export class CollageExportService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async exportCollage(
    collageState: CollageState,
    options: CollageExportOptions = {
      format: 'png',
      quality: 0.95,
      includeLabels: true,
      backgroundColor: '#ffffff'
    }
  ): Promise<{ blob: Blob; dataUrl: string; promptData: string }> {
    const { canvasSize } = collageState.preset;

    // Set canvas size
    this.canvas.width = canvasSize.width;
    this.canvas.height = canvasSize.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    await this.drawBackground(collageState, options);

    // Draw elements
    await this.drawElements(collageState, options);

    // Create blob and data URL
    const blob = await this.canvasToBlob(options);
    const dataUrl = this.canvas.toDataURL(
      options.format === 'png' ? 'image/png' : 'image/jpeg',
      options.quality
    );

    // Generate prompt data
    const promptData = this.generatePromptData(collageState);

    return { blob, dataUrl, promptData };
  }

  private async drawBackground(collageState: CollageState, options: CollageExportOptions): Promise<void> {
    if (collageState.background?.type === 'color') {
      this.ctx.fillStyle = collageState.background.value;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else if (collageState.background?.type === 'image' && collageState.background.value) {
      const bgImg = await this.loadImage(collageState.background.value);
      this.ctx.drawImage(bgImg, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // Default background color
      this.ctx.fillStyle = options.backgroundColor || '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private async drawElements(collageState: CollageState, options: CollageExportOptions): Promise<void> {
    // Sort elements by zIndex
    const sortedElements = [...collageState.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const element of sortedElements) {
      if (element.type === 'image' && (element.file || element.url)) {
        await this.drawImageElement(element, collageState);

        // Draw label if enabled and exists
        if (options.includeLabels && collageState.labels[element.id]) {
          this.drawElementLabel(element, collageState.labels[element.id], collageState);
        }
      } else if (element.type === 'text' && element.label) {
        this.drawTextElement(element, collageState);
      }
    }
  }

  private async drawImageElement(element: CollageElement, collageState: CollageState): Promise<void> {
    let imageSource: string;

    if (element.file) {
      imageSource = await this.fileToDataUrl(element.file);
    } else if (element.url) {
      imageSource = element.url;
    } else {
      return;
    }

    const img = await this.loadImage(imageSource);
    const { position } = element;
    const { canvasSize } = collageState.preset;

    const x = position.x * canvasSize.width;
    const y = position.y * canvasSize.height;
    const width = position.width * canvasSize.width;
    const height = position.height * canvasSize.height;

    this.ctx.drawImage(img, x, y, width, height);
  }

  private drawTextElement(element: CollageElement, collageState: CollageState): void {
    if (!element.label) return;

    const { position } = element;
    const { canvasSize } = collageState.preset;

    const x = position.x * canvasSize.width;
    const y = position.y * canvasSize.height;

    this.ctx.font = `${Math.max(24, canvasSize.width / 50)}px Inter, Arial, sans-serif`;
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(element.label, x, y);
  }

  private drawElementLabel(element: CollageElement, label: string, collageState: CollageState): void {
    const { position } = element;
    const { canvasSize } = collageState.preset;

    const x = position.x * canvasSize.width;
    const y = position.y * canvasSize.height + position.height * canvasSize.height + 30;

    this.ctx.font = `${Math.max(16, canvasSize.width / 75)}px Inter, Arial, sans-serif`;
    this.ctx.fillStyle = '#666666';
    this.ctx.textAlign = 'left';

    // Add background for better readability
    const textMetrics = this.ctx.measureText(label);
    const padding = 8;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(
      x - padding,
      y - this.ctx.font.match(/\d+/)?.[0] as any - padding,
      textMetrics.width + padding * 2,
      (this.ctx.font.match(/\d+/)?.[0] as any) + padding * 2
    );

    this.ctx.fillStyle = '#666666';
    this.ctx.fillText(label, x, y);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private canvasToBlob(options: CollageExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        options.format === 'png' ? 'image/png' : 'image/jpeg',
        options.quality
      );
    });
  }

  private generatePromptData(collageState: CollageState): string {
    const elements = collageState.elements
      .filter(el => el.type === 'image')
      .map((el, index) => {
        const label = collageState.labels[el.id] || `Element ${index + 1}`;
        return `${label}: positioned at ${Math.round(el.position.x * 100)}%,${Math.round(el.position.y * 100)}% with size ${Math.round(el.position.width * 100)}%x${Math.round(el.position.height * 100)}%`;
      });

    const backgroundDesc = collageState.background
      ? `Background: ${collageState.background.type === 'color' ? `solid color ${collageState.background.value}` : 'custom image'}${collageState.background.label ? ` (${collageState.background.label})` : ''}`
      : 'Background: default white';

    return [
      `Collage Layout: ${collageState.preset.name}`,
      `Aspect Ratio: ${collageState.preset.aspectRatio.width}:${collageState.preset.aspectRatio.height}`,
      backgroundDesc,
      'Elements:',
      ...elements
    ].join('\n');
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getDataUrl(format: 'png' | 'jpeg' = 'png', quality: number = 0.95): string {
    return this.canvas.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }
}

export const collageExportService = new CollageExportService();