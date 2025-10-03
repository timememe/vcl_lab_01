import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Глобальные переменные анимации
const MAIN_IMAGE_SIZE = 300; // размер главного изображения в пикселях
const MAIN_ANIMATION_SPEED = 8000; // скорость выезда главного изображения (мс)
const CLONE_MIN_SIZE = 100; // минимальный размер клонов
const CLONE_MAX_SIZE = 250; // максимальный размер клонов
const CLONE_MIN_SPEED = 5000; // минимальная скорость клонов (мс)
const CLONE_MAX_SPEED = 12000; // максимальная скорость клонов (мс)
const CLONE_MIN_COUNT = 3; // минимальное количество клонов
const CLONE_MAX_COUNT = 7; // максимальное количество клонов

interface CloneImage {
  id: number;
  size: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay: number;
}

const IndexPlaceholder: React.FC = () => {
  const [mainImageVisible, setMainImageVisible] = useState(false);
  const [clones, setClones] = useState<CloneImage[]>([]);

  useEffect(() => {
    // Запуск анимации главного изображения
    setTimeout(() => {
      setMainImageVisible(true);
    }, 500);

    // Создание клонов после завершения анимации главного изображения
    setTimeout(() => {
      const cloneCount = Math.floor(Math.random() * (CLONE_MAX_COUNT - CLONE_MIN_COUNT + 1)) + CLONE_MIN_COUNT;
      const newClones: CloneImage[] = [];

      for (let i = 0; i < cloneCount; i++) {
        const size = Math.floor(Math.random() * (CLONE_MAX_SIZE - CLONE_MIN_SIZE + 1)) + CLONE_MIN_SIZE;
        const duration = Math.floor(Math.random() * (CLONE_MAX_SPEED - CLONE_MIN_SPEED + 1)) + CLONE_MIN_SPEED;
        const delay = Math.random() * 2000; // случайная задержка до 2 секунд

        // Случайное направление: слева, справа, снизу
        const direction = Math.floor(Math.random() * 3);
        let startX, startY, endX, endY;

        if (direction === 0) {
          // Слева
          startX = -size;
          startY = Math.random() * window.innerHeight;
          endX = Math.random() * (window.innerWidth * 0.3);
          endY = Math.random() * window.innerHeight;
        } else if (direction === 1) {
          // Справа
          startX = window.innerWidth + size;
          startY = Math.random() * window.innerHeight;
          endX = window.innerWidth - Math.random() * (window.innerWidth * 0.3);
          endY = Math.random() * window.innerHeight;
        } else {
          // Снизу
          startX = Math.random() * window.innerWidth;
          startY = window.innerHeight + size;
          endX = Math.random() * window.innerWidth;
          endY = window.innerHeight - Math.random() * (window.innerHeight * 0.5);
        }

        newClones.push({
          id: i,
          size,
          startX,
          startY,
          endX,
          endY,
          duration,
          delay
        });
      }

      setClones(newClones);
    }, MAIN_ANIMATION_SPEED + 1000);
  }, []);

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

      {/* Main fil.png - медленно выезжает снизу */}
      <div
        className="absolute left-1/2 z-20 transition-all"
        style={{
          width: `${MAIN_IMAGE_SIZE}px`,
          transform: mainImageVisible
            ? 'translate(-50%, 0)'
            : 'translate(-50%, 100%)',
          bottom: 0,
          transitionDuration: `${MAIN_ANIMATION_SPEED}ms`,
          transitionTimingFunction: 'ease-out'
        }}
      >
        <img
          src="/pages/assets/fil.png"
          alt="Foreground"
          className="w-full h-auto"
        />
      </div>

      {/* Clone images - появляются в случайных местах */}
      {clones.map((clone) => (
        <div
          key={clone.id}
          className="absolute z-15"
          style={{
            width: `${clone.size}px`,
            left: `${clone.startX}px`,
            top: `${clone.startY}px`,
            animation: `moveClone-${clone.id} ${clone.duration}ms ease-in-out ${clone.delay}ms forwards`,
          }}
        >
          <img
            src="/pages/assets/fil.png"
            alt={`Clone ${clone.id}`}
            className="w-full h-auto opacity-70"
          />
          <style>
            {`
              @keyframes moveClone-${clone.id} {
                from {
                  left: ${clone.startX}px;
                  top: ${clone.startY}px;
                }
                to {
                  left: ${clone.endX}px;
                  top: ${clone.endY}px;
                }
              }
            `}
          </style>
        </div>
      ))}
    </div>
  );
};

export default IndexPlaceholder;
