import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CATEGORY_LABELS, formatBdt, formatNum } from '../i18n/translations';
import { InventoryCategory, InventoryItem, Locale } from '../types';
import { KineticCounter, LiquidGlassCard, SPRING_SNAPPY } from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface CategoryCylindersProps {
  locale: Locale;
  inventory: InventoryItem[];
  reducedMotion?: boolean;
  onSelectCategory?: (category: InventoryCategory) => void;
}

const CATEGORY_VISUALS: Record<
  InventoryCategory,
  {
    liquidGradient: string;
    waveColor: string;
    accentText: string;
    targetMaxKg: number;
  }
> = {
  grains: {
    liquidGradient: 'linear-gradient(180deg, rgba(163, 230, 53, 0.88) 0%, rgba(101, 163, 13, 0.94) 100%)',
    waveColor: '#BEF264',
    accentText: 'text-[#3F6212]',
    targetMaxKg: 60,
  },
  proteins: {
    liquidGradient: 'linear-gradient(180deg, rgba(167, 139, 250, 0.86) 0%, rgba(109, 40, 217, 0.92) 100%)',
    waveColor: '#C4B5FD',
    accentText: 'text-[#5B21B6]',
    targetMaxKg: 55,
  },
  produce: {
    liquidGradient: 'linear-gradient(180deg, rgba(52, 211, 153, 0.86) 0%, rgba(5, 150, 105, 0.92) 100%)',
    waveColor: '#6EE7B7',
    accentText: 'text-[#065F46]',
    targetMaxKg: 35,
  },
  spices_oil: {
    liquidGradient: 'linear-gradient(180deg, rgba(251, 191, 36, 0.86) 0%, rgba(217, 119, 6, 0.92) 100%)',
    waveColor: '#FDE68A',
    accentText: 'text-[#92400E]',
    targetMaxKg: 35,
  },
  prepared: {
    liquidGradient: 'linear-gradient(180deg, rgba(56, 189, 248, 0.86) 0%, rgba(2, 132, 199, 0.92) 100%)',
    waveColor: '#BAE6FD',
    accentText: 'text-[#075985]',
    targetMaxKg: 40,
  },
};

export const CategoryCylinders: React.FC<CategoryCylindersProps> = ({
  locale,
  inventory,
  reducedMotion = false,
  onSelectCategory,
}) => {
  const [hoveredCat, setHoveredCat] = useState<InventoryCategory | null>(null);

  const categoryStats = useMemo(() => {
    const categories: InventoryCategory[] = [
      'grains',
      'proteins',
      'produce',
      'spices_oil',
      'prepared',
    ];

    return categories.map((cat) => {
      const items = inventory.filter((i) => i.category === cat);
      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const totalVal = items.reduce((sum, i) => sum + i.quantity * i.unitCostBdt, 0);
      const vis = CATEGORY_VISUALS[cat];
      const fillPct = Math.min(94, Math.max(18, Math.round((totalQty / vis.targetMaxKg) * 100)));

      return {
        category: cat,
        label: CATEGORY_LABELS[cat][locale],
        itemCount: items.length,
        totalQty,
        totalVal,
        fillPct,
        vis,
      };
    });
  }, [inventory, locale]);

  return (
    <LiquidGlassCard
      variant="panel"
      reducedMotion={reducedMotion}
      className="squircle-24 p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="font-display text-xl font-bold text-[#0F172A] tracking-tight">
            {locale === 'bn' ? 'ক্যাটাগরি অনুযায়ী মজুদ সিলিন্ডার' : 'Category Inventory Levels'}
          </h3>
          <p className="text-xs text-slate-500">
            {locale === 'bn'
              ? 'ক্যাটাগরি ফিল্টার করতে তরল কাঁচের সিলিন্ডারে ক্লিক করুন'
              : 'Live liquid-glass stock cylinders · click any category to filter'}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#92E634]/22 border border-[#92E634]/45 text-[11px] font-bold text-[#1A2E05] w-fit">
          {locale === 'bn' ? 'সক্রিয় ৫ বিভাগ' : '5 Active Categories'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {categoryStats.map((cat, idx) => {
          const isHovered = hoveredCat === cat.category;

          return (
            <motion.button
              key={cat.category}
              type="button"
              onMouseEnter={() => {
                setHoveredCat(cat.category);
                soundEngine.playTick(idx * 55);
              }}
              onMouseLeave={() => setHoveredCat(null)}
              onClick={() => {
                soundEngine.playClick();
                onSelectCategory?.(cat.category);
              }}
              whileHover={!reducedMotion ? { y: -4, scale: 1.02 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
              transition={SPRING_SNAPPY}
              className="group text-left bg-white/75 backdrop-blur-md border border-slate-200/85 rounded-2xl p-3.5 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.12)] hover:border-slate-300 transition-colors cursor-pointer"
            >
              {/* Vertical Glass Cylinder */}
              <div className="relative h-36 w-full rounded-[18px] bg-slate-100/85 border border-white shadow-[inset_0_2px_6px_rgba(15,23,42,0.08)] overflow-hidden">
                {/* Left Vertical Specular Glass Highlight */}
                <div
                  className="pointer-events-none absolute top-2 bottom-2 left-1.5 w-2 rounded-full bg-white/65 z-20 blur-[0.5px]"
                  aria-hidden="true"
                />

                {/* Rising Fluid Fill (GPU-composited translateY, zero layout reflow or wave squash) */}
                <motion.div
                  initial={reducedMotion ? false : { y: '88%' }}
                  animate={{
                    y: `${100 - (isHovered && !reducedMotion ? Math.min(96, cat.fillPct + 4) : cat.fillPct)}%`,
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.65,
                    delay: reducedMotion ? 0 : idx * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ background: cat.vis.liquidGradient }}
                  className="absolute inset-0 top-0 z-10"
                >
                  {/* Animated Sloshing Sine Wave Top Surface */}
                  <div
                    className={`absolute -top-2.5 left-0 w-[200%] h-4 overflow-hidden ${
                      reducedMotion ? '' : 'liquid-wave-slosh'
                    }`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 200 18" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d="M0 9 Q 25 2, 50 9 T 100 9 T 150 9 T 200 9 L 200 18 L 0 18 Z"
                        fill={cat.vis.waveColor}
                        fillOpacity="0.82"
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Percentage Readout Inside Top of Cylinder */}
                <div className="relative z-20 p-2.5 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-bold text-[#0F172A] tabular-nums shadow-xs">
                    <KineticCounter
                      value={cat.fillPct}
                      locale={locale}
                      suffix="%"
                      reducedMotion={reducedMotion}
                    />
                  </span>
                </div>
              </div>

              {/* Cylinder Caption */}
              <div className="mt-3">
                <p className="text-xs font-bold text-[#0F172A] truncate">{cat.label}</p>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>{formatBdt(cat.totalVal, locale)}</span>
                  <span className={`font-semibold ${cat.vis.accentText}`}>
                    {formatNum(cat.itemCount, locale, 0)} {locale === 'bn' ? 'টি' : 'lots'}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </LiquidGlassCard>
  );
};
