import React, { useRef, useEffect, useState } from 'react';
import { CollageElement, CollageState, CollagePreset } from '../../types/collage';

interface CollageCanvasProps {
  collageState: CollageState;
  onElementUpdate: (elementId: string, element: Partial<CollageElement>) => void;
  onElementRemove: (elementId: string) => void;
  className?: string;
  interactive?: boolean;
}

const CollageCanvas: React.FC<CollageCanvasProps> = ({
  collageState,
  onElementUpdate,
  onElementRemove,
  className = '',
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const renderCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size based on preset
    const { canvasSize } = collageState.preset;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Draw background
    if (collageState.background?.type === 'color') {
      ctx.fillStyle = collageState.background.value;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (collageState.background?.type === 'image' && collageState.background.value) {
      const bgImg = new Image();
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        drawElements(ctx);
      };
      bgImg.src = collageState.background.value;
      return;
    } else {
      // Default white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawElements(ctx);
  };

  const drawElements = async (ctx: CanvasRenderingContext2D) => {
    // Sort elements by zIndex
    const sortedElements = [...collageState.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const element of sortedElements) {
      if (element.type === 'image' && (element.file || element.url)) {
        await drawImageElement(ctx, element);
      } else if (element.type === 'text' && element.label) {
        drawTextElement(ctx, element);
      }
    }
  };

  const drawImageElement = (ctx: CanvasRenderingContext2D, element: CollageElement): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { position } = element;
        const { canvasSize } = collageState.preset;

        const x = position.x * canvasSize.width;
        const y = position.y * canvasSize.height;
        const width = position.width * canvasSize.width;
        const height = position.height * canvasSize.height;

        ctx.drawImage(img, x, y, width, height);

        // Draw border if dragged
        if (interactive && draggedElement === element.id) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
        }

        // Draw label if exists
        if (element.label && collageState.labels[element.id]) {
          drawLabel(ctx, collageState.labels[element.id], x, y + height + 5);
        }

        resolve();
      };

      if (element.file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(element.file);
      } else if (element.url) {
        img.src = element.url;
      }
    });
  };

  const drawTextElement = (ctx: CanvasRenderingContext2D, element: CollageElement) => {
    if (!element.label) return;

    const { position } = element;
    const { canvasSize } = collageState.preset;

    const x = position.x * canvasSize.width;
    const y = position.y * canvasSize.height;

    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(element.label, x, y);
  };

  const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find clicked element
    for (let i = collageState.elements.length - 1; i >= 0; i--) {
      const element = collageState.elements[i];
      const { position } = element;
      const { canvasSize } = collageState.preset;

      const elementX = position.x * canvasSize.width;
      const elementY = position.y * canvasSize.height;
      const elementWidth = position.width * canvasSize.width;
      const elementHeight = position.height * canvasSize.height;

      if (x >= elementX && x <= elementX + elementWidth &&
          y >= elementY && y <= elementY + elementHeight) {
        setDraggedElement(element.id);
        setDragOffset({
          x: x - elementX,
          y: y - elementY
        });
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !draggedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const { canvasSize } = collageState.preset;
    const newX = (x - dragOffset.x) / canvasSize.width;
    const newY = (y - dragOffset.y) / canvasSize.height;

    onElementUpdate(draggedElement, {
      position: {
        ...collageState.elements.find(el => el.id === draggedElement)?.position!,
        x: Math.max(0, Math.min(1, newX)),
        y: Math.max(0, Math.min(1, newY))
      }
    });
  };

  const handleMouseUp = () => {
    setDraggedElement(null);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    renderCanvas();
  }, [collageState]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg max-w-full h-auto"
        style={{ aspectRatio: `${collageState.preset.aspectRatio.width}/${collageState.preset.aspectRatio.height}` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default CollageCanvas;