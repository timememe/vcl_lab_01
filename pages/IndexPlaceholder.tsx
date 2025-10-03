import React from 'react';
import { Link } from 'react-router-dom';

const IndexPlaceholder: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Background layer - 1.png (масштабируемый по размерам экрана) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/pages/assets/1.png"
          alt="Background"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Content layer - pinned to top */}
      <div className="absolute top-8 left-0 right-0 z-10 max-w-xl mx-auto text-center space-y-6 px-6">
        <h1 className="text-4xl font-bold">Привет!</h1>
        <p className="text-lg text-gray-600">
          Это Филиз, наш продюсер. Она спешит вам сообщить, что сайт в разработке!
        </p>
      </div>

      {/* Front layer - fil.png (закреплен внизу по центру) */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
        <img
          src="/pages/assets/fil.png"
          alt="Foreground"
          className="max-w-full h-auto"
        />
      </div>
    </div>
  );
};

export default IndexPlaceholder;
