import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Flame, HeartHandshake, Leaf, PackageCheck, PlusCircle } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Locale } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface LiquidGlassIntroProps {
  locale: Locale;
  reducedMotion?: boolean;
  onRevealDashboard?: () => void;
  onComplete: () => void;
}

function restoreDocumentScroll() {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

export const LiquidGlassIntro: React.FC<LiquidGlassIntroProps> = ({
  locale,
  reducedMotion = false,
  onRevealDashboard,
  onComplete,
}) => {
  const t = TRANSLATIONS[locale];
  const [exiting, setExiting] = useState(false);

  const exitingRef = useRef(false);
  const completedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onRevealRef = useRef(onRevealDashboard);
  const reducedMotionRef = useRef(reducedMotion);

  onCompleteRef.current = onComplete;
  onRevealRef.current = onRevealDashboard;
  reducedMotionRef.current = reducedMotion;

  const finishSequence = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    restoreDocumentScroll();
    onCompleteRef.current();
  }, []);

  const triggerExit = useCallback(() => {
    if (completedRef.current || exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    restoreDocumentScroll();
    soundEngine.playWhoosh();
    onRevealRef.current?.();

    const exitMs = reducedMotionRef.current ? 120 : 240;
    exitTimerRef.current = window.setTimeout(finishSequence, exitMs);
  }, [finishSequence]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    soundEngine.playGlassPop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playClick();
        triggerExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      restoreDocumentScroll();
      window.removeEventListener('keydown', onKeyDown);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [triggerExit]);

  const pillars = [
    {
      num: '01',
      icon: PackageCheck,
      tint: 'bg-[#EEF6FF] border-sky-200/80',
      iconColor: 'text-sky-700',
      title: locale === 'bn' ? 'মজুদ ট্র্যাক করুন' : 'Track Inventory',
      desc:
        locale === 'bn'
          ? 'স্টকের পরিমাণ, মেয়াদ ও সতেজতা এক নজরে দেখুন।'
          : 'Monitor stock levels, portions, and freshness at a glance.',
    },
    {
      num: '02',
      icon: HeartHandshake,
      tint: 'bg-[#ECFDF3] border-emerald-200/80',
      iconColor: 'text-emerald-700',
      title: locale === 'bn' ? 'নষ্টের আগেই উদ্ধার' : 'Rescue Before Spoilage',
      desc:
        locale === 'bn'
          ? 'মেয়াদ-সন্নিহিত বা উদ্বৃত্ত খাবার দ্রুত উদ্ধার তালিকায় সরান।'
          : 'Move near-expiry or surplus items into Rescue to save value and reduce waste.',
    },
    {
      num: '03',
      icon: PlusCircle,
      tint: 'bg-[#FEF9E7] border-amber-200/80',
      iconColor: 'text-amber-700',
      title: locale === 'bn' ? 'অপচয় লিখুন ও মজুদ যোগ' : 'Log Waste & Add Stock',
      desc:
        locale === 'bn'
          ? 'অনিবার্য অপচয় নথিভুক্ত করুন অথবা নতুন মজুদ যোগ করুন।'
          : 'Quickly record unavoidable waste or add fresh stock with live feedback.',
    },
  ];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'bn' ? 'খাদক পরিচিতি' : 'What This Website Is About'}
      initial={{ opacity: 0 }}
      animate={
        exiting
          ? reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, y: -16, scale: 1.02 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: reducedMotion ? 0.12 : 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white/88 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto ${
        exiting ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {/* Crisp Bright White & Pastel Refraction Halos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-28 -left-24 w-[540px] h-[540px] rounded-full opacity-75"
          style={{
            background:
              'radial-gradient(circle, rgba(186,230,253,0.45) 0%, rgba(255,255,255,0) 68%)',
          }}
        />
        <div
          className="absolute -bottom-28 -right-24 w-[560px] h-[560px] rounded-full opacity-80"
          style={{
            background:
              'radial-gradient(circle, rgba(146,230,52,0.24) 0%, rgba(221,214,254,0.2) 48%, rgba(255,255,255,0) 70%)',
          }}
        />
      </div>

      {/* Top-Right Skip Control */}
      <motion.button
        type="button"
        initial={reducedMotion ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: exiting ? 0 : 1, y: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => {
          soundEngine.playClick();
          triggerExit();
        }}
        className="fixed top-5 right-5 sm:top-7 sm:right-8 z-30 px-4 py-2 rounded-full bg-white/95 border border-slate-200/90 text-xs font-bold text-slate-600 hover:text-[#0F172A] hover:border-[#92E634] shadow-xs transition-colors cursor-pointer whitespace-nowrap"
      >
        {locale === 'bn' ? 'এড়িয়ে যান (Esc)' : 'Skip (Esc)'}
      </motion.button>

      {/* Center Info Intro Glass Stage */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel squircle-28 relative z-20 w-full max-w-3xl p-6 sm:p-9 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.18)]"
      >
        {/* Top Emblem + Title */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={reducedMotion ? false : { scale: 0.65, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
            whileHover={!reducedMotion ? { scale: 1.07, rotate: -4 } : undefined}
            className="relative p-1.5 rounded-[24px] bg-white border-2 border-[#92E634] shadow-[0_14px_32px_-12px_rgba(146,230,52,0.55)]"
          >
            <div className="w-14 h-14 rounded-[18px] bg-[#141517] flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-[#F6F1E2] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-[#141517]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path
                    d="M5 19C5 11.268 11.268 5 19 5C19 12.732 12.732 19 5 19Z"
                    strokeLinejoin="round"
                  />
                  <path d="M7 17L16 8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="glass-lime-accent absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            >
              <Leaf className="w-3 h-3 text-[#0F172A]" />
            </span>
          </motion.div>

          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#3F6212]">
            {locale === 'bn' ? 'এই ওয়েবসাইট সম্পর্কে' : 'What This Website Is About'}
          </p>

          <h1 className="mt-1.5 font-display text-4xl sm:text-5xl font-black tracking-tight text-[#0F172A] leading-tight text-balance">
            {locale === 'bn'
              ? `${t.brandName} — কিচেন ইনভেন্টরি, রেসকিউ ও অপচয় নিয়ন্ত্রণ`
              : `${t.brandName} — Kitchen Inventory, Rescue & Waste Control`}
          </h1>

          <p className="mt-2 text-sm text-slate-600 max-w-xl leading-relaxed">
            {locale === 'bn'
              ? 'প্রতিদিনের কাঁচামাল হিসাব রাখুন, নষ্ট হওয়ার আগে উদ্বৃত্ত খাবার উদ্ধার করুন এবং তাৎক্ষণিক পরিসংখ্যান দেখুন।'
              : 'A clear, fast workspace for restaurants and kitchens to track stock freshness, rescue surplus before spoilage, and log unavoidable waste.'}
          </p>
        </div>

        {/* 3 Straightforward Step Cards */}
        <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {pillars.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.num}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : 0.08 + index * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={!reducedMotion ? { y: -3 } : undefined}
                className={`rounded-2xl border p-4 text-left ${item.tint} shadow-[0_8px_20px_-14px_rgba(15,23,42,0.12)]`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <motion.div
                    whileHover={!reducedMotion ? { rotate: -8, scale: 1.1 } : undefined}
                    className="w-9 h-9 rounded-xl bg-white/95 border border-white flex items-center justify-center shadow-xs"
                  >
                    <Icon className={`w-4 h-4 ${item.iconColor}`} />
                  </motion.div>
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{item.num}</span>
                </div>

                <h2 className="font-display text-base font-bold text-[#0F172A] leading-snug">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Primary Action Row */}
        <div className="mt-7 pt-5 border-t border-slate-200/75 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Flame className="w-3.5 h-3.5 text-[#3F6212]" />
            <span>
              {locale === 'bn'
                ? 'সব তথ্য ব্রাউজারে তাৎক্ষণিকভাবে সংরক্ষিত থাকে'
                : 'Live reactive totals · saves automatically in your browser'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                triggerExit();
              }}
              className="px-4 py-2.5 rounded-full border border-slate-200 bg-white/90 text-xs font-bold text-slate-600 hover:text-[#0F172A] cursor-pointer whitespace-nowrap"
            >
              {locale === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
            </button>

            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
              onClick={() => {
                soundEngine.playChime();
                triggerExit();
              }}
              className="glass-lime-accent inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#0F172A] cursor-pointer whitespace-nowrap"
            >
              <span>{locale === 'bn' ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Enter Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
