import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Locale } from '../types';
import { KineticCounter, LiquidGlassCard, WaterRippleButton } from './MotionPrimitives';

interface LayeredImpactCardProps {
  locale: Locale;
  rescuedBdt: number;
  rescueRatePercent: number;
  reducedMotion?: boolean;
  onPrimaryAction: () => void;
}

export const LayeredImpactCard: React.FC<LayeredImpactCardProps> = ({
  locale,
  rescuedBdt,
  rescueRatePercent,
  reducedMotion = false,
  onPrimaryAction,
}) => {
  return (
    <LiquidGlassCard
      variant="dark-callout"
      hoverLift
      tilt3D
      reducedMotion={reducedMotion}
      className="squircle-28 p-6 flex flex-col justify-between h-full min-h-[296px] overflow-hidden"
    >
      {/* Decorative Layered Glass Wireframe Cards (Reference Image 1) */}
      <div
        className="pointer-events-none absolute -bottom-8 -right-6 w-48 h-48 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute inset-4 rounded-2xl border border-white/25 rotate-[-14deg] bg-white/3" />
        <div className="absolute inset-8 rounded-2xl border border-[#92E634]/45 rotate-[-6deg] bg-[#92E634]/5" />
      </div>

      {/* High-Contrast Callout Copy */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold text-[#92E634] tracking-wider uppercase">
            {locale === 'bn' ? 'সাপ্তাহিক সাশ্রয়' : 'KHADOK RESCUE'}
          </span>
          <span className="text-xs font-semibold text-slate-300 tabular-nums">
            <KineticCounter
              value={rescueRatePercent}
              locale={locale}
              suffix="%"
              reducedMotion={reducedMotion}
            />
          </span>
        </div>

        <h3 className="font-display text-3xl font-bold tracking-tight text-white leading-tight text-balance">
          {locale === 'bn' ? (
            <>
              বাঁচান{' '}
              <span className="inline-block px-2.5 py-0.5 rounded-xl bg-white/12 border border-white/25 text-[#92E634] text-2xl">
                <KineticCounter
                  value={rescuedBdt}
                  locale={locale}
                  prefix="৳"
                  reducedMotion={reducedMotion}
                />
              </span>{' '}
              খাদ্য অপচয়
            </>
          ) : (
            <>
              Save{' '}
              <span className="inline-block px-2.5 py-0.5 rounded-xl bg-white/12 border border-white/25 text-[#92E634] text-2xl">
                <KineticCounter
                  value={rescuedBdt}
                  locale={locale}
                  prefix="৳"
                  reducedMotion={reducedMotion}
                />
              </span>{' '}
              with Smart Rescue!
            </>
          )}
        </h3>

        <p className="mt-3 text-xs text-slate-300 leading-relaxed max-w-[240px]">
          {locale === 'bn'
            ? 'মেয়াদোত্তীর্ণ হওয়ার আগেই উদ্বৃত্ত খাবার ছাড়ে বিক্রি বা দান হিসেবে নথিভুক্ত করুন।'
            : 'Turn near-expiry kitchen stock into evening specials, staff meals, or donations.'}
        </p>
      </div>

      {/* Vibrant Lime Green Pill CTA */}
      <div className="relative z-10 mt-6">
        <WaterRippleButton
          type="button"
          soundType="chime"
          reducedMotion={reducedMotion}
          onClick={onPrimaryAction}
          className="glass-lime-accent px-5 py-2.5 rounded-full text-[#0F172A] text-xs font-bold cursor-pointer"
        >
          <span>{locale === 'bn' ? 'এখনই সংরক্ষণ করুন' : 'Rescue Now'}</span>
          <ArrowUpRight className="w-4 h-4" />
        </WaterRippleButton>
      </div>
    </LiquidGlassCard>
  );
};
