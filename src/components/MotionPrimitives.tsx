import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { Star } from 'lucide-react';
import { toBengaliDigits } from '../i18n/translations';
import { Locale } from '../types';
import { soundEngine } from '../utils/soundEngine';

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

export const SPRING_FLUID = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.9,
};

export const TWEEN_EASE = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1] as const,
};

export type GlassVariant =
  | 'panel'
  | 'hero-blue'
  | 'violet'
  | 'mint'
  | 'gold'
  | 'dark-callout';

interface RippleWave {
  id: number;
  x: number;
  y: number;
  size: number;
}

// Gentle GPU-safe Scroll Buoyancy (avoids skewY/scaleY distortion of text, charts & backdrop-filter)
export const ScrollWobbleContainer: React.FC<{
  children: React.ReactNode;
  reducedMotion?: boolean;
  className?: string;
}> = ({ children, reducedMotion = false, className = '' }) => {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 36,
    stiffness: 280,
    mass: 0.7,
    restDelta: 0.5,
  });

  const y = useTransform(smoothVelocity, [-2000, 0, 2000], [5, 0, -5]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
  hoverLift?: boolean;
  tilt3D?: boolean;
  rippleOnClick?: boolean;
  reducedMotion?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  variant = 'panel',
  hoverLift = false,
  rippleOnClick = true,
  reducedMotion = false,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const [ripples, setRipples] = useState<RippleWave[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const spawnRipple = useCallback(
    (clientX: number, clientY: number) => {
      if (reducedMotion || !rippleOnClick || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-2), { id, x: clientX - rect.left, y: clientY - rect.top, size }]);
      const timer = window.setTimeout(() => {
        setRipples((prev) => prev.filter((item) => item.id !== id));
      }, 650);
      timeoutsRef.current.push(timer);
    },
    [reducedMotion, rippleOnClick]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    ref.current.style.setProperty('--mx', `${px.toFixed(1)}%`);
    ref.current.style.setProperty('--my', `${py.toFixed(1)}%`);
    ref.current.style.setProperty('--sheen-opacity', '0.88');
  };

  const handlePointerLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--sheen-opacity', '0.35');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    spawnRipple(e.clientX, e.clientY);
  };

  const variantMap: Record<GlassVariant, string> = {
    panel: 'glass-panel',
    'hero-blue': 'glass-hero-blue',
    violet: 'glass-pastel-violet',
    mint: 'glass-pastel-mint',
    gold: 'glass-pastel-gold',
    'dark-callout': 'glass-dark-callout',
  };

  const isDark = variant === 'dark-callout';

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      whileHover={hoverLift && !reducedMotion ? { y: -3 } : undefined}
      whileTap={onClick && !reducedMotion ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`${variantMap[variant]} ${className}`}
    >
      <div className="liquid-sheen-layer" aria-hidden="true" />

      {/* Expanding Water-Drop Ripple Rings */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-10"
        aria-hidden="true"
      >
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0.08, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              marginLeft: -r.size / 2,
              marginTop: -r.size / 2,
              background: isDark
                ? 'radial-gradient(circle, rgba(146,230,52,0.28) 0%, rgba(255,255,255,0.12) 45%, transparent 72%)'
                : 'radial-gradient(circle, rgba(146,230,52,0.3) 0%, rgba(59,130,246,0.15) 45%, transparent 72%)',
              border: isDark
                ? '1px solid rgba(146,230,52,0.35)'
                : '1px solid rgba(255,255,255,0.85)',
            }}
            className="absolute rounded-full pointer-events-none"
          />
        ))}
      </div>

      <div className="relative z-20 h-full">{children}</div>
    </motion.div>
  );
};

// Tactile Water Ripple Button
interface WaterRippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  reducedMotion?: boolean;
  soundType?: 'click' | 'tick' | 'chime' | 'whoosh';
}

export const WaterRippleButton: React.FC<WaterRippleButtonProps> = ({
  children,
  className = '',
  reducedMotion = false,
  soundType = 'click',
  onClick,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const [ripples, setRipples] = useState<RippleWave[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!reducedMotion && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.8;
      const id = Date.now() + Math.random();
      setRipples((prev) => [
        ...prev.slice(-2),
        { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size },
      ]);
      const timer = window.setTimeout(() => {
        setRipples((prev) => prev.filter((item) => item.id !== id));
      }, 560);
      timeoutsRef.current.push(timer);
    }
    if (soundType === 'chime') soundEngine.playChime();
    else if (soundType === 'whoosh') soundEngine.playWhoosh();
    else if (soundType === 'tick') soundEngine.playTick();
    else soundEngine.playClick();

    onClick?.(e);
  };

  return (
    <motion.button
      ref={btnRef}
      whileHover={!reducedMotion ? { scale: 1.025 } : undefined}
      whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleClick}
      className={`btn-sheen relative overflow-hidden ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        aria-hidden="true"
      >
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0.1, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              marginLeft: -r.size / 2,
              marginTop: -r.size / 2,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(146,230,52,0.22) 55%, transparent 75%)',
            }}
            className="absolute rounded-full pointer-events-none"
          />
        ))}
      </span>
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
};

// Clean White Canvas with Soft Pastel Radial Halos (zero expensive blur-filter re-rasterization)
export const AmbientLightBackdrop: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 bg-white" aria-hidden="true">
      <div
        className={`absolute -top-32 left-1/5 w-[560px] h-[560px] rounded-full ${
          reducedMotion ? '' : 'liquid-ambient-drift'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(186, 230, 253, 0.55) 0%, rgba(186, 230, 253, 0) 68%)',
        }}
      />
      <div
        className={`absolute top-1/4 -right-24 w-[480px] h-[480px] rounded-full ${
          reducedMotion ? '' : 'liquid-ambient-drift'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(221, 214, 254, 0.48) 0%, rgba(221, 214, 254, 0) 68%)',
          animationDelay: '-5s',
        }}
      />
      <div
        className={`absolute -bottom-32 left-1/3 w-[520px] h-[520px] rounded-full ${
          reducedMotion ? '' : 'liquid-ambient-drift'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(146, 230, 52, 0.16) 0%, rgba(146, 230, 52, 0) 68%)',
          animationDelay: '-9s',
        }}
      />
    </div>
  );
};

interface KineticCounterProps {
  value: number;
  locale: Locale;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  reducedMotion?: boolean;
}

function formatCounterText(
  val: number,
  locale: Locale,
  prefix: string,
  suffix: string,
  decimals: number
) {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(val * factor) / factor;
  const formatted =
    decimals > 0
      ? rounded.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(rounded).toLocaleString('en-IN');
  const localized = locale === 'bn' ? toBengaliDigits(formatted) : formatted;
  return `${prefix}${localized}${suffix}`;
}

// Zero-rerender 60fps DOM-ref Kinetic Counter
export const KineticCounter: React.FC<KineticCounterProps> = ({
  value,
  locale,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  reducedMotion = false,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const spring = useSpring(value, { stiffness: 150, damping: 24, mass: 0.75, restDelta: 0.01 });

  useEffect(() => {
    if (reducedMotion) {
      spring.jump(value);
      if (spanRef.current) {
        spanRef.current.textContent = formatCounterText(value, locale, prefix, suffix, decimals);
      }
      return;
    }
    spring.set(value);
  }, [value, spring, reducedMotion, locale, prefix, suffix, decimals]);

  useEffect(() => {
    if (reducedMotion) return;
    const unsubscribe = spring.on('change', (latest) => {
      if (spanRef.current) {
        spanRef.current.textContent = formatCounterText(latest, locale, prefix, suffix, decimals);
      }
    });
    return () => unsubscribe();
  }, [spring, reducedMotion, locale, prefix, suffix, decimals]);

  return (
    <span ref={spanRef} className={`tabular-nums ${className}`}>
      {formatCounterText(value, locale, prefix, suffix, decimals)}
    </span>
  );
};

// Inline Animated Mini-Sparkline for Table Rows (memoized, stable path)
export const InlineRowSparkline: React.FC<{
  seed: string;
  color?: string;
  reducedMotion?: boolean;
}> = ({ seed, color = '#16A34A', reducedMotion = false }) => {
  const { d, last } = useMemo(() => {
    const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const pts = [0, 1, 2, 3, 4, 5].map((i) => ({
      x: i * 14 + 2,
      y: 14 + Math.sin(hash * 0.37 + i * 1.35) * 7,
    }));

    const path = pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y.toFixed(1)}`;
      const prev = arr[i - 1];
      const cx = ((prev.x + pt.x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x} ${pt.y.toFixed(1)}`;
    }, '');

    return { d: path, last: pts[pts.length - 1] };
  }, [seed]);

  return (
    <svg viewBox="0 0 76 26" className="w-[72px] h-6 overflow-visible shrink-0">
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
    </svg>
  );
};

// Star Watch Button with Mini Liquid Sparkle Burst
interface StarWatchButtonProps {
  watched: boolean;
  onToggle: () => void;
  label?: string;
  reducedMotion?: boolean;
}

export const StarWatchButton: React.FC<StarWatchButtonProps> = ({
  watched,
  onToggle,
  label = 'Toggle priority watch',
  reducedMotion = false,
}) => {
  const [burstKey, setBurstKey] = useState(0);

  const handleClick = () => {
    const next = !watched;
    if (next && !reducedMotion) {
      setBurstKey((k) => k + 1);
    }
    soundEngine.playToggle(next);
    onToggle();
  };

  const sparkleAngles = [0, 60, 120, 180, 240, 300];

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={!reducedMotion ? { scale: 1.12 } : undefined}
      whileTap={!reducedMotion ? { scale: 0.88 } : undefined}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      aria-label={label}
      aria-pressed={watched}
      className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
        watched
          ? 'text-amber-500 border-amber-300/80 bg-amber-50/90 shadow-xs'
          : 'text-slate-400 hover:text-slate-700 border-slate-200/80 bg-white/70'
      }`}
    >
      {burstKey > 0 && !reducedMotion && (
        <span key={burstKey} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {sparkleAngles.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const tx = Math.cos(rad) * 14;
            const ty = Math.sin(rad) * 14;
            return (
              <motion.span
                key={deg}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#92E634]"
              />
            );
          })}
        </span>
      )}

      <motion.div
        animate={
          watched && !reducedMotion
            ? { scale: [1, 1.25, 1], rotate: [0, 14, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Star
          className="w-3.5 h-3.5"
          fill={watched ? 'currentColor' : 'none'}
          strokeWidth={watched ? 2 : 1.75}
        />
      </motion.div>
    </motion.button>
  );
};
