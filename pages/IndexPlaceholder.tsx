import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Глобальные переменные анимации
const MAIN_IMAGE_SIZE = 420; // размер главного изображения в пикселях
const MAIN_ANIMATION_SPEED = 8000; // скорость выезда главного изображения (мс)
const CLONE_MIN_SIZE = 100; // минимальный размер клонов
const CLONE_MAX_SIZE = 250; // максимальный размер клонов
const CLONE_INITIAL_SPEED = 2; // начальная скорость движения клонов (пикселей за кадр)
const CLONE_MIN_COUNT = 3; // минимальное количество клонов
const CLONE_MAX_COUNT = 7; // максимальное количество клонов
const BOUNCE_DAMPING = 0.8; // затухание при отскоке (0.8 = 80% скорости сохраняется)
const COLLISION_FORCE = 0.5; // сила отталкивания при столкновении
const CURSOR_RADIUS = 100; // радиус отталкивания вокруг курсора
const CURSOR_FORCE = 1.5; // сила отталкивания от курсора
const HEADER_TOP_OFFSET = 128; // отступ сверху для заголовка и подзаголовка (в пикселях)

interface ClonePhysics {
  id: number;
  x: number;
  y: number;
  vx: number; // скорость по X
  vy: number; // скорость по Y
  size: number;
  rotation: number;
}

const IndexPlaceholder: React.FC = () => {
  const [mainImageVisible, setMainImageVisible] = useState(false);
  const [clones, setClones] = useState<ClonePhysics[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Запуск анимации главного изображения
    setTimeout(() => {
      setMainImageVisible(true);
    }, 500);

    // Создание клонов после завершения анимации главного изображения
    setTimeout(() => {
      const cloneCount = Math.floor(Math.random() * (CLONE_MAX_COUNT - CLONE_MIN_COUNT + 1)) + CLONE_MIN_COUNT;
      const newClones: ClonePhysics[] = [];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      for (let i = 0; i < cloneCount; i++) {
        const size = Math.floor(Math.random() * (CLONE_MAX_SIZE - CLONE_MIN_SIZE + 1)) + CLONE_MIN_SIZE;

        // Спавним со случайного угла за пределами экрана
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(window.innerWidth, window.innerHeight);
        const startX = centerX + Math.cos(angle) * distance;
        const startY = centerY + Math.sin(angle) * distance;

        // Направление к центру
        const dx = centerX - startX;
        const dy = centerY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / length) * CLONE_INITIAL_SPEED;
        const vy = (dy / length) * CLONE_INITIAL_SPEED;

        // Угол поворота к направлению движения
        const rotation = Math.atan2(vy, vx) * (180 / Math.PI) + 90;

        newClones.push({
          id: i,
          x: startX,
          y: startY,
          vx,
          vy,
          size,
          rotation
        });
      }

      setClones(newClones);
    }, MAIN_ANIMATION_SPEED + 1000);
  }, []);

  // Физический движок
  useEffect(() => {
    if (clones.length === 0) return;

    const updatePhysics = () => {
      setClones(prevClones => {
        const updated = prevClones.map(clone => ({ ...clone }));

        // Проверка столкновений со стенами
        updated.forEach(clone => {
          // Левая и правая стены
          if (clone.x - clone.size / 2 < 0) {
            clone.x = clone.size / 2;
            clone.vx = Math.abs(clone.vx) * BOUNCE_DAMPING;
          } else if (clone.x + clone.size / 2 > window.innerWidth) {
            clone.x = window.innerWidth - clone.size / 2;
            clone.vx = -Math.abs(clone.vx) * BOUNCE_DAMPING;
          }

          // Верхняя и нижняя стены
          if (clone.y - clone.size / 2 < 0) {
            clone.y = clone.size / 2;
            clone.vy = Math.abs(clone.vy) * BOUNCE_DAMPING;
          } else if (clone.y + clone.size / 2 > window.innerHeight) {
            clone.y = window.innerHeight - clone.size / 2;
            clone.vy = -Math.abs(clone.vy) * BOUNCE_DAMPING;
          }
        });

        // Проверка столкновений с курсором
        // На десктопе - всегда когда курсор наведен, на тач - только при нажатии
        if (cursorPos) {
          const isActive = isPressed || window.matchMedia('(hover: hover)').matches;

          if (isActive) {
            updated.forEach(clone => {
              const dx = clone.x - cursorPos.x;
              const dy = clone.y - cursorPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < CURSOR_RADIUS + clone.size / 2) {
                // Отталкивание от курсора
                const angle = Math.atan2(dy, dx);
                const force = CURSOR_FORCE * (1 - distance / (CURSOR_RADIUS + clone.size / 2));

                clone.vx += Math.cos(angle) * force;
                clone.vy += Math.sin(angle) * force;
              }
            });
          }
        }

        // Проверка столкновений между клонами
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const clone1 = updated[i];
            const clone2 = updated[j];

            const dx = clone2.x - clone1.x;
            const dy = clone2.y - clone1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (clone1.size + clone2.size) / 2;

            if (distance < minDistance) {
              // Столкновение! Отталкиваем друг от друга
              const angle = Math.atan2(dy, dx);
              const overlap = minDistance - distance;

              // Разделяем объекты
              const moveX = Math.cos(angle) * overlap / 2;
              const moveY = Math.sin(angle) * overlap / 2;

              clone1.x -= moveX;
              clone1.y -= moveY;
              clone2.x += moveX;
              clone2.y += moveY;

              // Обмен скоростями с учетом силы отталкивания
              const force = COLLISION_FORCE;
              clone1.vx -= Math.cos(angle) * force;
              clone1.vy -= Math.sin(angle) * force;
              clone2.vx += Math.cos(angle) * force;
              clone2.vy += Math.sin(angle) * force;
            }
          }
        }

        // Обновление позиций и вращения
        updated.forEach(clone => {
          clone.x += clone.vx;
          clone.y += clone.vy;

          // Обновляем угол поворота к направлению движения
          clone.rotation = Math.atan2(clone.vy, clone.vx) * (180 / Math.PI) + 90;
        });

        return updated;
      });

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [clones.length, cursorPos, isPressed]);

  // Обработчики событий мыши и тач
  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setCursorPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsPressed(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setCursorPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    setCursorPos(null);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background layer - 1.png (масштабируемый по размерам экрана) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/pages/assets/1.png"
          alt="Background"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Content layer - pinned to top */}
      <div
        className="absolute left-0 right-0 z-10 max-w-xl mx-auto text-center space-y-6 px-6"
        style={{
          top: `${HEADER_TOP_OFFSET}px`,
          fontFamily: "'Golos Text', sans-serif",
          color: '#ed1b34'
        }}
      >
        <h1 className="text-4xl font-bold">Привет!</h1>
        <p className="text-lg">
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

      {/* Clone images - летят к центру и отталкиваются */}
      {clones.map((clone) => (
        <div
          key={clone.id}
          className="absolute z-15 transition-transform"
          style={{
            width: `${clone.size}px`,
            left: `${clone.x - clone.size / 2}px`,
            top: `${clone.y - clone.size / 2}px`,
            transform: `rotate(${clone.rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          <img
            src="/pages/assets/fil.png"
            alt={`Clone ${clone.id}`}
            className="w-full h-auto"
          />
        </div>
      ))}

      {/* Визуализация радиуса курсора */}
      {cursorPos && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            left: `${cursorPos.x - CURSOR_RADIUS}px`,
            top: `${cursorPos.y - CURSOR_RADIUS}px`,
            width: `${CURSOR_RADIUS * 2}px`,
            height: `${CURSOR_RADIUS * 2}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 200, 255, 0.05) 0%, rgba(150, 150, 255, 0.02) 50%, transparent 80%)',
            filter: 'blur(8px)',
            opacity: isPressed ? 0.8 : 0.3 // Ярче на тач при нажатии
          }}
        />
      )}
    </div>
  );
};

export default IndexPlaceholder;
