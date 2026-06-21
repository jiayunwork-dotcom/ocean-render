import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface KnobProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export default function Knob({ value, onChange, label }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const angleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!knobRef.current) return value;
      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      angle = ((angle % 360) + 360) % 360;
      return angle;
    },
    [value]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      onChange(angleFromPointer(e.clientX, e.clientY));
    },
    [onChange, angleFromPointer]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      onChange(angleFromPointer(e.clientX, e.clientY));
    },
    [onChange, angleFromPointer]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true;
      const touch = e.touches[0];
      onChange(angleFromPointer(touch.clientX, touch.clientY));
    },
    [onChange, angleFromPointer]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      onChange(angleFromPointer(touch.clientX, touch.clientY));
    },
    [onChange, angleFromPointer]
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  const cardinalDirs = [
    { angle: 0, label: 'N' },
    { angle: 90, label: 'E' },
    { angle: 180, label: 'S' },
    { angle: 270, label: 'W' },
  ];

  return (
    <div className="flex flex-col items-center">
      <span className="hud-label mb-2">{label}</span>
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg
          width={100}
          height={100}
          viewBox="0 0 100 100"
          className="absolute inset-0"
        >
          {ticks.map((tick) => {
            const rad = ((tick - 90) * Math.PI) / 180;
            const isCardinal = tick % 90 === 0;
            const innerR = isCardinal ? 38 : 42;
            const outerR = 48;
            const x1 = 50 + Math.cos(rad) * innerR;
            const y1 = 50 + Math.sin(rad) * innerR;
            const x2 = 50 + Math.cos(rad) * outerR;
            const y2 = 50 + Math.sin(rad) * outerR;
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCardinal ? '#f59e0b' : 'rgba(232, 244, 248, 0.3)'}
                strokeWidth={isCardinal ? 2 : 1}
              />
            );
          })}
          {cardinalDirs.map((dir) => {
            const rad = ((dir.angle - 90) * Math.PI) / 180;
            const r = 30;
            const x = 50 + Math.cos(rad) * r;
            const y = 50 + Math.sin(rad) * r;
            return (
              <text
                key={dir.label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(232, 244, 248, 0.6)"
                fontSize={10}
                fontFamily="Orbitron, sans-serif"
                fontWeight={600}
              >
                {dir.label}
              </text>
            );
          })}
        </svg>
        <div
          ref={knobRef}
          className={cn('ocean-knob absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2')}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            transform: `translate(-50%, -50%) rotate(${value}deg)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '14px solid #f59e0b',
            transform: `translate(-50%, -50%) rotate(${value}deg) translateY(-28px)`,
            filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))',
          }}
        />
      </div>
      <span className="hud-value text-sm mt-2">{value.toFixed(0)}°</span>
    </div>
  );
}
