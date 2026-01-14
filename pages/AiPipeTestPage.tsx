import React from 'react';

const AiPipeTestPage: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-gray-900 p-4">
      <div className="grid grid-cols-3 gap-4 h-full">
        {/* Panel 1 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
          <h2 className="text-white text-lg font-semibold mb-4">Panel 1</h2>
          <div className="text-gray-400">
            Content goes here
          </div>
        </div>

        {/* Panel 2 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
          <h2 className="text-white text-lg font-semibold mb-4">Panel 2</h2>
          <div className="text-gray-400">
            Content goes here
          </div>
        </div>

        {/* Panel 3 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
          <h2 className="text-white text-lg font-semibold mb-4">Panel 3</h2>
          <div className="text-gray-400">
            Content goes here
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPipeTestPage;
