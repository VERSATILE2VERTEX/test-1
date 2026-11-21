/**
 * MagnificationDock Component
 * GPU-composited macOS-inspired dock with spring magnification and zero layout-jitter.
 */

import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
} from 'motion/react';
import React, { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { soundEngine } from '../utils/soundEngine';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  accent?: boolean;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  spring?: SpringOptions;
  reducedMotion?: boolean;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  accent?: boolean;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  reducedMotion?: boolean;
  ariaLabel?: string;
};

function DockItem({
  children,
  className = '',
  onClick,
  active = false,
  accent = false,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  reducedMotion = false,
  ariaLabel,
}: DockItemProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const maxScale = Math.max(1.15, magnification / baseItemSize);

  const mouseDistance = useTransform(mouseX, (val) => {
    if (reducedMotion || val === Infinity) return distance * 2;
    const rect = slotRef.current?.getBoundingClientRect();
    if (!rect) return distance * 2;
    return val - rect.left - rect.width / 2;
  });

  const targetScale = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, reducedMotion ? 1 : maxScale, 1]
  );
  const targetLift = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [0, reducedMotion ? 0 : -(magnification - baseItemSize) * 0.45, 0]
  );

  const scale = useSpring(targetScale, spring);
  const y = useSpring(targetLift, spring);

  const surfaceClass = active
    ? 'glass-lime-accent text-[#0F172A] border-white shadow-[0_10px_24px_-8px_rgba(146,230,52,0.75)]'
    : accent
    ? 'bg-[#141517] text-[#92E634] border-white/25 shadow-[0_10px_22px_-8px_rgba(15,23,42,0.4)]'
    : 'bg-white/95 hover:bg-white text-[#0F172A] border-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.18)]';

  return (
    <div
      ref={slotRef}
      style={{ width: baseItemSize, height: baseItemSize }}
      className="relative flex items-center justify-center shrink-0"
    >
      <motion.button
        type="button"
        style={
          reducedMotion
            ? { width: baseItemSize, height: baseItemSize }
            : {
                width: baseItemSize,
                height: baseItemSize,
                scale,
                y,
                transformOrigin: 'bottom center',
              }
        }
        onHoverStart={() => {
          isHovered.set(1);
          soundEngine.playTick(70);
        }}
        onHoverEnd={() => isHovered.set(0)}
        onFocus={() => isHovered.set(1)}
        onBlur={() => isHovered.set(0)}
        whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
        onClick={() => {
          soundEngine.playClick();
          onClick?.();
        }}
        className={`relative inline-flex items-center justify-center rounded-full border transition-colors cursor-pointer ${surfaceClass} ${className}`}
        aria-label={ariaLabel}
        aria-pressed={active || undefined}
      >
        {Children.map(children, (child) =>
          React.isValidElement(child)
            ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, {
                isHovered,
              })
            : child
        )}

        {active && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#141517]"
          />
        )}
      </motion.button>
    </div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className={`pointer-events-none absolute -top-8 left-1/2 w-fit whitespace-nowrap rounded-full border border-white/20 bg-[#141517] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  return <div className={`flex items-center justify-center ${className}`}>{children}</div>;
}

export function MagnificationDock({
  items,
  className = '',
  spring = { stiffness: 360, damping: 26, mass: 0.45 },
  magnification = 62,
  distance = 150,
  panelHeight = 60,
  baseItemSize = 44,
  reducedMotion = false,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      className="flex max-w-full items-end justify-center overflow-visible"
      style={{ height: panelHeight }}
    >
      <motion.div
        onMouseMove={(e) => {
          if (!reducedMotion) {
            mouseX.set(e.clientX);
          }
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        className={`glass-panel flex items-end w-fit max-w-full gap-1.5 sm:gap-2.5 md:gap-3 rounded-[26px] border border-white/95 bg-white/90 backdrop-blur-2xl pb-2 px-2.5 sm:px-4 shadow-[0_20px_44px_-14px_rgba(15,23,42,0.24)] ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="KHADOK Quick Navigation Dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            active={item.active}
            accent={item.accent}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            reducedMotion={reducedMotion}
            ariaLabel={typeof item.label === 'string' ? item.label : undefined}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </div>
  );
}

export default MagnificationDock;
