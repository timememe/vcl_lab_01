import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Глобальные переменные анимации
const MAIN_IMAGE_SIZE = 420; // размер главного изображения в пикселях
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
  rotation: number; // угол поворота к направлению движения
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

        // Случайный край экрана: левый, правый, нижний
        const edge = Math.floor(Math.random() * 3);
        let startX, startY, endX, endY, rotation;

        if (edge === 0) {
          // Левый край - выезжает слева направо
          startX = -size;
          startY = Math.random() * window.innerHeight;
          endX = Math.random() * (window.innerWidth * 0.4);
          endY = Math.random() * window.innerHeight;
          // Рассчитываем угол поворота к направлению движения
          const dx = endX - startX;
          const dy = endY - startY;
          rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 чтобы верх смотрел по направлению
        } else if (edge === 1) {
          // Правый край - выезжает справа налево
          startX = window.innerWidth + size;
          startY = Math.random() * window.innerHeight;
          endX = window.innerWidth - Math.random() * (window.innerWidth * 0.4);
          endY = Math.random() * window.innerHeight;
          // Рассчитываем угол поворота к направлению движения
          const dx = endX - startX;
          const dy = endY - startY;
          rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        } else {
          // Нижний край - выезжает снизу вверх
          startX = Math.random() * window.innerWidth;
          startY = window.innerHeight + size;
          endX = startX;
          endY = Math.max(0, window.innerHeight - size - Math.random() * (window.innerHeight * 0.6));
          rotation = 0; // вертикально вверх, без поворота
        }

        newClones.push({
          id: i,
          size,
          startX,
          startY,
          endX,
          endY,
          duration,
          delay,
          rotation
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
            animation: `moveClone-${clone.id} ${clone.duration}ms ease-in-out ${clone.delay}ms forwards, rotateClone-${clone.id} ${clone.duration}ms linear ${clone.delay}ms infinite`,
            transformOrigin: 'center center'
          }}
        >
          <img
            src="/pages/assets/fil.png"
            alt={`Clone ${clone.id}`}
            className="w-full h-auto"
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
              @keyframes rotateClone-${clone.id} {
                from {
                  transform: rotate(${clone.rotation}deg);
                }
                to {
                  transform: rotate(${clone.rotation + 360}deg);
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
