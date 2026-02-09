import React, { useState, useRef } from 'react';
import { Upload, X, Edit3, Image as ImageIcon } from 'lucide-react';

interface UploadSlot {
  id: string;
  file?: File;
  preview?: string;
  text: string;
  isEditing: boolean;
}

interface InteractiveUploadGridProps {
  maxSlots: number;
  onSlotsChange: (slots: UploadSlot[]) => void;
  onUpload: (files: File[], texts: string[]) => void;
  className?: string;
}

const InteractiveUploadGrid: React.FC<InteractiveUploadGridProps> = ({
  maxSlots,
  onSlotsChange,
  onUpload,
  className = ''
}) => {
  const [slots, setSlots] = useState<UploadSlot[]>(() =>
    Array.from({ length: maxSlots }, (_, index) => ({
      id: `slot-${index}`,
      text: '',
      isEditing: false
    }))
  );

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>(Array(maxSlots).fill(null));

  const handleFileSelect = (slotIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newSlots = [...slots];
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        file,
        preview: e.target?.result as string
      };
      setSlots(newSlots);
      onSlotsChange(newSlots);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = {
      ...newSlots[slotIndex],
      file: undefined,
      preview: undefined
    };
    setSlots(newSlots);
    onSlotsChange(newSlots);
  };

  const handleTextChange = (slotIndex: number, text: string) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = {
      ...newSlots[slotIndex],
      text
    };
    setSlots(newSlots);
    onSlotsChange(newSlots);
  };

  const toggleTextEdit = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex].isEditing = !newSlots[slotIndex].isEditing;
    setSlots(newSlots);
  };

  const handleUploadAll = () => {
    const files = slots.filter(slot => slot.file).map(slot => slot.file!);
    const texts = slots.map(slot => slot.text);
    if (files.length > 0) {
      onUpload(files, texts);
    }
  };

  const filledSlots = slots.filter(slot => slot.file).length;
  const canUpload = filledSlots > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Upload Images</h3>
          <p className="text-sm text-gray-600">
            Add up to {maxSlots} images with text labels
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filledSlots}/{maxSlots} slots used
        </div>
      </div>

      {/* Upload Grid */}
      <div className="grid grid-cols-2 gap-4">
        {slots.map((slot, index) => (
          <div
            key={slot.id}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            {slot.file && slot.preview ? (
              // Filled slot with image
              <div className="relative h-full">
                <img
                  src={slot.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Text overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                  {slot.isEditing ? (
                    <input
                      type="text"
                      value={slot.text}
                      onChange={(e) => handleTextChange(index, e.target.value)}
                      onBlur={() => toggleTextEdit(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          toggleTextEdit(index);
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-sm placeholder-gray-300"
                      placeholder="Enter text..."
                      autoFocus
                    />
                  ) : (
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleTextEdit(index)}
                    >
                      <span className="text-sm truncate">
                        {slot.text || 'Click to add text...'}
                      </span>
                      <Edit3 className="w-3 h-3 ml-2 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Empty slot
              <label className="flex flex-col items-center justify-center h-full cursor-pointer group">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-gray-600 transition-colors" />
                  <p className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                    Click to upload
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Slot {index + 1}
                  </p>
                </div>
                <input
                  ref={(el) => fileInputRefs.current[index] = el}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(index, file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {/* Text Fields for Mobile/Fallback */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-gray-700">Text Labels</h4>
        {slots.map((slot, index) => (
          <div key={`text-${slot.id}`} className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                {index + 1}
              </div>
              <input
                type="text"
                value={slot.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={`Text for image ${index + 1}...`}
              />
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {slot.file ? (
                <span className="flex items-center text-green-600">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Uploaded
                </span>
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload All Button */}
      <button
        onClick={handleUploadAll}
        disabled={!canUpload}
        className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
          canUpload
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Upload className="w-5 h-5 mr-2" />
        Add {filledSlots} Image{filledSlots !== 1 ? 's' : ''} to Collage
      </button>

      {/* Usage Hint */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <strong>Tip:</strong> Upload images in the grid above, then add text labels that will appear under each image in your collage. The text can describe the product, highlight features, or add context.
      </div>
    </div>
  );
};

export default InteractiveUploadGrid;