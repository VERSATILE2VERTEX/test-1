import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Locale } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface LiquidGlassIntroProps {
  locale: Locale;
  reducedMotion?: boolean;
  onRevealDashboard?: () => void;
  onComplete: () => void;
}

function splitGraphemes(text: string, locale: Locale): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const SegmenterCtor = (
      Intl as unknown as {
        Segmenter: new (
          loc: string,
          opts: { granularity: 'grapheme' }
        ) => { segment: (s: string) => Iterable<{ segment: string }> };
      }
    ).Segmenter;
    const segmenter = new SegmenterCtor(locale === 'bn' ? 'bn' : 'en', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

// Inline subtle crystalline frost noise SVG pattern (static, zero per-frame CPU cost)
const FROST_NOISE_DATA_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E")`;

export const LiquidGlassIntro: React.FC<LiquidGlassIntroProps> = ({
  locale,
  reducedMotion = false,
  onRevealDashboard,
  onComplete,
}) => {
  const t = TRANSLATIONS[locale];
  const [exiting, setExiting] = useState(false);
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const meltRingRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLButtonElement>(null);
  const completedRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);
  const meltStopRef = useRef<(() => void) | null>(null);

  // Magnetic hover pull for Start button
  const rawMagX = useMotionValue(0);
  const rawMagY = useMotionValue(0);
  const magX = useSpring(rawMagX, { stiffness: 320, damping: 24 });
  const magY = useSpring(rawMagY, { stiffness: 320, damping: 24 });

  const brandLetters = useMemo(() => splitGraphemes(t.brandName, locale), [t.brandName, locale]);

  // Lock page scroll while the intro overlay is active
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      meltStopRef.current?.();
    };
  }, []);

  const finishSequence = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    document.body.style.overflow = '';
    onComplete();
  }, [onComplete]);

  const handleStart = useCallback(
    (origin?: { x: number; y: number }) => {
      if (exiting || completedRef.current) return;
      setExiting(true);

      // Stage 1 (0ms–200ms): Tactile chime/droplet + expanding liquid refraction wave
      soundEngine.playChime();
      soundEngine.playTick(120);

      if (origin) {
        setBurstPos(origin);
      } else if (ctaBtnRef.current) {
        const r = ctaBtnRef.current.getBoundingClientRect();
        setBurstPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      } else if (typeof window !== 'undefined') {
        setBurstPos({ x: window.innerWidth / 2, y: window.innerHeight * 0.58 });
      }

      if (reducedMotion) {
        const tQuick = window.setTimeout(finishSequence, 220);
        timeoutsRef.current.push(tQuick);
        return;
      }

      // Stage 2 (120ms): Airy whoosh synced with logo descent
      const tWhoosh = window.setTimeout(() => {
        soundEngine.playWhoosh();
      }, 120);
      timeoutsRef.current.push(tWhoosh);

      // Stage 4 trigger (700ms): Re-trigger staggered dashboard cards/charts right as melt opens
      const tReveal = window.setTimeout(() => {
        onRevealDashboard?.();
      }, 700);
      timeoutsRef.current.push(tReveal);

      // Stage 3 (340ms–1120ms): Frosted glass melt from center outward + progressive blur thaw
      const tMelt = window.setTimeout(() => {
        const meltCtrl = animate(0, 1, {
          duration: 0.78,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: (v) => {
            if (overlayRef.current) {
              const radiusPct = (v * 145).toFixed(2);
              const blurPx = (28 * (1 - v)).toFixed(2);
              const satPct = Math.round(160 - 60 * v);
              const innerClear = Math.max(0, Number(radiusPct) - 14).toFixed(2);
              const outerEdge = (Number(radiusPct) + 16).toFixed(2);

              overlayRef.current.style.backdropFilter = `blur(${blurPx}px) saturate(${satPct}%)`;
              (
                overlayRef.current.style as unknown as { webkitBackdropFilter: string }
              ).webkitBackdropFilter = `blur(${blurPx}px) saturate(${satPct}%)`;
              overlayRef.current.style.opacity = `${Math.max(0, 1 - v * 0.85).toFixed(3)}`;

              const maskVal =
                v <= 0.01
                  ? 'none'
                  : `radial-gradient(circle at 50% 50%, transparent ${innerClear}%, rgba(0,0,0,0.45) ${radiusPct}%, black ${outerEdge}%)`;
              overlayRef.current.style.maskImage = maskVal;
              overlayRef.current.style.webkitMaskImage = maskVal;
            }

            if (meltRingRef.current) {
              const ringScale = 0.08 + v * 2.55;
              const ringOpacity = v < 0.15 ? v / 0.15 : Math.max(0, 1 - (v - 0.15) / 0.85);
              meltRingRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${ringScale.toFixed(3)})`;
              meltRingRef.current.style.opacity = `${(ringOpacity * 0.85).toFixed(3)}`;
            }
          },
          onComplete: finishSequence,
        });

        meltStopRef.current = () => meltCtrl.stop();
      }, 340);
      timeoutsRef.current.push(tMelt);
    },
    [exiting, finishSequence, onRevealDashboard, reducedMotion]
  );

  const handleSkip = useCallback(() => {
    if (exiting || completedRef.current) return;
    soundEngine.playClick();
    setExiting(true);
    const tSkip = window.setTimeout(finishSequence, reducedMotion ? 120 : 280);
    timeoutsRef.current.push(tSkip);
  }, [exiting, finishSequence, reducedMotion]);

  // Enter / Space / Escape keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStart, handleSkip]);

  const handleBtnPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion || exiting || !ctaBtnRef.current) return;
    const rect = ctaBtnRef.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    rawMagX.set(Math.max(-7, Math.min(7, dx * 0.18)));
    rawMagY.set(Math.max(-5, Math.min(5, dy * 0.22)));
  };

  const handleBtnPointerLeave = () => {
    rawMagX.set(0);
    rawMagY.set(0);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="KHADOK Introduction"
      className={`fixed inset-0 z-[100] flex items-center justify-center select-none ${
        exiting ? 'pointer-events-none' : ''
      }`}
    >
      {/* Layer 1: Multi-layered Frosted Liquid Glass Overlay over the Live Website */}
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 1 }}
        animate={exiting && reducedMotion ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.48) 0%, rgba(240,248,255,0.36) 50%, rgba(255,255,255,0.46) 100%)',
        }}
      >
        {/* Subtle Crystalline Ice / Frost Noise Texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: FROST_NOISE_DATA_URI, backgroundSize: '180px 180px' }}
          aria-hidden="true"
        />

        {/* Soft Specular Light Refractions */}
        <div
          className="pointer-events-none absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.72) 0%, rgba(186,230,253,0.22) 42%, transparent 72%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] max-w-[780px] max-h-[780px] rounded-full opacity-45"
          style={{
            background:
              'radial-gradient(circle, rgba(146,230,52,0.18) 0%, rgba(221,214,254,0.2) 44%, transparent 72%)',
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Glossy Liquid-Edge Boundary Ring Along the Melting Center */}
      {!reducedMotion && (
        <div
          ref={meltRingRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 w-[82vmax] h-[82vmax] rounded-full opacity-0"
          style={{
            transform: 'translate3d(-50%, -50%, 0) scale(0.08)',
            border: '2px solid rgba(255, 255, 255, 0.92)',
            boxShadow:
              '0 0 36px 8px rgba(146, 230, 52, 0.25), inset 0 0 28px 6px rgba(255, 255, 255, 0.72)',
          }}
        />
      )}

      {/* Stage 1: Expanding Liquid Refraction Wave from Start Button Click */}
      {burstPos && !reducedMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0.04, opacity: 0.8 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
          style={{
            left: burstPos.x,
            top: burstPos.y,
            width: '120vmax',
            height: '120vmax',
            marginLeft: '-60vmax',
            marginTop: '-60vmax',
            background:
              'radial-gradient(circle, rgba(146,230,52,0.34) 0%, rgba(255,255,255,0.45) 26%, rgba(125,211,252,0.18) 46%, transparent 66%)',
            border: '1.5px solid rgba(255,255,255,0.85)',
          }}
          className="pointer-events-none fixed rounded-full z-20"
        />
      )}

      {/* Subtle Skip Button */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.3, delay: exiting ? 0 : 0.4 }}
        onClick={handleSkip}
        className="fixed top-5 right-5 sm:top-7 sm:right-8 z-30 px-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-white/90 text-xs font-bold text-slate-600 hover:text-[#0F172A] hover:bg-white shadow-xs transition-colors cursor-pointer"
      >
        {locale === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
      </motion.button>

      {/* Center Stage: Logo + Kinetic Letter Title + Tagline + Start CTA */}
      <motion.div
        animate={
          exiting
            ? reducedMotion
              ? { opacity: 0 }
              : {
                  y: [0, -10, 260],
                  scale: [1, 1.02, 0.74],
                  rotateX: [0, -6, 22],
                  opacity: [1, 1, 0],
                  filter: ['blur(0px)', 'blur(0px)', 'blur(10px)'],
                }
            : { y: 0, scale: 1, rotateX: 0, opacity: 1, filter: 'blur(0px)' }
        }
        transition={
          exiting
            ? {
                duration: reducedMotion ? 0.18 : 0.54,
                delay: reducedMotion ? 0 : 0.1,
                times: reducedMotion ? undefined : [0, 0.18, 1],
                ease: [0.4, 0, 0.2, 1],
              }
            : { duration: 0.2 }
        }
        style={{ transformPerspective: 1000 }}
        className="relative z-30 flex flex-col items-center text-center px-6 max-w-xl"
      >
        {/* Ambient Water-Droplet Ripples Radiating Behind Logo */}
        {!reducedMotion && (
          <div className="pointer-events-none absolute top-11 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[0, 1].map((ring) => (
              <motion.span
                key={ring}
                initial={{ scale: 0.45, opacity: 0 }}
                animate={{ scale: [0.45, 2.3], opacity: [0.65, 0] }}
                transition={{
                  duration: 1.5,
                  delay: 0.12 + ring * 0.28,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="block w-24 h-24 rounded-[28px] border border-white/90 bg-radial from-[#92E634]/20 to-transparent"
              />
            ))}
          </div>
        )}

        {/* Elastic Overshoot Brand Emblem */}
        <motion.div
          initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: reducedMotion ? 1 : [0.6, 1.06, 1], opacity: 1 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { duration: 0.68, times: [0, 0.62, 1], ease: [0.22, 1, 0.36, 1] }
          }
          className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-[28px] bg-[#141517] border border-white/90 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.32),inset_0_2px_2px_rgba(255,255,255,0.28)] flex items-center justify-center overflow-hidden"
        >
          {/* Inner Warm Ivory Leaf Squircle Core */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#F6F1E2] flex items-center justify-center shadow-inner">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-[#141517]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
            >
              <path
                d="M5 19C5 11.268 11.268 5 19 5C19 12.732 12.732 19 5 19Z"
                strokeLinejoin="round"
              />
              <path d="M7 17L16 8" strokeLinecap="round" />
            </svg>
          </div>

          {/* Liquid-Glass Specular Sheen Sweep Across Emblem */}
          {!reducedMotion && (
            <motion.div
              aria-hidden="true"
              initial={{ x: '-140%', opacity: 0 }}
              animate={{ x: '220%', opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -top-6 bottom-0 w-12 rotate-24 bg-linear-to-r from-transparent via-white/70 to-transparent"
            />
          )}

          {/* Subtle Lime Accent Corner Dot */}
          <span
            aria-hidden="true"
            className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#92E634] shadow-[0_0_10px_#92E634]"
          />
        </motion.div>

        {/* Staggered Kinetic Letter-by-Letter Title Reveal */}
        <h1 className="mt-6 font-display text-6xl sm:text-7xl font-black tracking-tight text-[#0F172A] leading-none flex items-center justify-center flex-wrap">
          {brandLetters.map((char, idx) => (
            <span key={`${char}-${idx}`} className="inline-block overflow-hidden py-1 px-[1px]">
              <motion.span
                className="inline-block"
                initial={
                  reducedMotion
                    ? false
                    : { y: '108%', opacity: 0, filter: 'blur(8px)' }
                }
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                transition={
                  reducedMotion
                    ? { duration: 0.15 }
                    : {
                        duration: 0.46,
                        delay: 0.28 + idx * 0.045,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            </span>
          ))}
        </h1>

        {/* Kinetic Tagline Reveal */}
        <div className="overflow-hidden mt-2.5">
          <motion.p
            initial={reducedMotion ? false : { y: '100%', opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { duration: 0.5, delay: 0.56, ease: [0.16, 1, 0.3, 1] }
            }
            className="text-sm sm:text-base font-semibold text-slate-700 tracking-wide"
          >
            {t.tagline}
          </motion.p>
        </div>

        {/* Tactile Liquid Glass / Lime-Accent "Start" Pill Button */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { duration: 0.48, delay: 0.74, ease: [0.16, 1, 0.3, 1] }
          }
          className="relative mt-8"
        >
          {/* Breathing Pulse Halo Behind Start CTA */}
          {!reducedMotion && !exiting && (
            <span
              aria-hidden="true"
              className="intro-pulse-ring pointer-events-none absolute -inset-1.5 rounded-full bg-[#92E634]/55 blur-[4px]"
            />
          )}

          <motion.button
            ref={ctaBtnRef}
            type="button"
            style={!reducedMotion ? { x: magX, y: magY } : undefined}
            whileHover={!reducedMotion ? { scale: 1.045 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onPointerMove={handleBtnPointerMove}
            onPointerLeave={handleBtnPointerLeave}
            onClick={(e) => handleStart({ x: e.clientX, y: e.clientY })}
            className="btn-sheen glass-lime-accent relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm sm:text-base font-bold text-[#0F172A] shadow-[0_18px_36px_-10px_rgba(146,230,52,0.65),inset_0_2px_2px_rgba(255,255,255,0.85)] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#141517]" />
            <span>{locale === 'bn' ? 'শুরু করুন' : 'Start'}</span>
            <ArrowRight className="w-4 h-4 text-[#141517]" />
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: exiting ? 0 : 0.72 }}
          transition={{ duration: 0.4, delay: exiting ? 0 : 0.95 }}
          className="mt-4 text-[11px] font-semibold text-slate-500 tracking-wide"
        >
          {locale === 'bn' ? 'প্রবেশ করতে Enter চাপুন' : 'Press Enter to launch dashboard'}
        </motion.p>
      </motion.div>
    </div>
  );
};
