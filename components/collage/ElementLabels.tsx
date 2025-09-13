import React from 'react';
import { Tag, X } from 'lucide-react';
import { CollageElement } from '../../types/collage';

interface ElementLabelsProps {
  elements: CollageElement[];
  labels: { [elementId: string]: string };
  onLabelChange: (elementId: string, label: string) => void;
  onElementRemove?: (elementId: string) => void;
  allowRemove?: boolean;
}

const ElementLabels: React.FC<ElementLabelsProps> = ({
  elements,
  labels,
  onLabelChange,
  onElementRemove,
  allowRemove = true
}) => {
  const imageElements = elements.filter(el => el.type === 'image');

  if (imageElements.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Element Labels</h3>
        <p className="text-gray-500 text-sm">No elements to label yet. Add some images first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center mb-4">
        <Tag className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Element Labels</h3>
      </div>

      <div className="space-y-4">
        {imageElements.map((element, index) => (
          <div key={element.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Element {index + 1}
                </span>
              </div>

              {allowRemove && onElementRemove && (
                <button
                  onClick={() => onElementRemove(element.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove element"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Image Preview */}
            {(element.file || element.url) && (
              <div className="mb-3">
                <img
                  src={element.file ? URL.createObjectURL(element.file) : element.url}
                  alt={`Element ${index + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-200"
                />
              </div>
            )}

            {/* Position Info */}
            <div className="text-xs text-gray-500 mb-2">
              Position: {Math.round(element.position.x * 100)}%, {Math.round(element.position.y * 100)}% •
              Size: {Math.round(element.position.width * 100)}% × {Math.round(element.position.height * 100)}%
            </div>

            {/* Label Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description/Label
              </label>
              <textarea
                value={labels[element.id] || ''}
                onChange={(e) => onLabelChange(element.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                placeholder={`Describe element ${index + 1}...`}
              />
            </div>

            {/* Quick Label Suggestions */}
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Quick suggestions:</div>
              <div className="flex flex-wrap gap-1">
                {['Product', 'Main Item', 'Background Object', 'Detail', 'Feature'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onLabelChange(element.id, suggestion)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <strong>Total Elements:</strong> {imageElements.length}
          <br />
          <strong>Labeled:</strong> {Object.keys(labels).filter(id => labels[id].trim()).length}
        </div>
      </div>
    </div>
  );
};

export default ElementLabels;