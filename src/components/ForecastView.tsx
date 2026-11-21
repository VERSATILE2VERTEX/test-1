import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { formatBdt, formatNum, TRANSLATIONS } from '../i18n/translations';
import { DishForecast, InventoryItem, Locale } from '../types';
import {
  InlineRowSparkline,
  KineticCounter,
  LiquidGlassCard,
  SPRING_SNAPPY,
} from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface ForecastViewProps {
  locale: Locale;
  dishes: DishForecast[];
  inventory: InventoryItem[];
  multiplier: number;
  reducedMotion?: boolean;
  onChangeMultiplier: (val: number) => void;
}

type ForecastHorizon = 7 | 30 | 90;

export const ForecastView: React.FC<ForecastViewProps> = ({
  locale,
  dishes,
  inventory,
  multiplier,
  reducedMotion = false,
  onChangeMultiplier,
}) => {
  const t = TRANSLATIONS[locale];
  const [horizon, setHorizon] = useState<ForecastHorizon>(7);
  const [scrubIdx, setScrubIdx] = useState<number>(6);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 192 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        setBox({ w: rect.width, h: rect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scenarios = [
    { id: 'weekday', label: t.driverWeekday, val: 1.0 },
    { id: 'friday', label: t.driverFriday, val: 1.35 },
    { id: 'rainy', label: t.driverRainy, val: 0.82 },
    { id: 'festive', label: t.driverFestive, val: 1.6 },
  ];

  const inventoryMap = new Map(inventory.map((i) => [i.id, i]));

  const aggregatedNeeds = new Map<string, number>();
  dishes.forEach((dish) => {
    const targetPortions = Math.round(dish.baselineDailyPortions * multiplier);
    dish.ingredients.forEach((ing) => {
      aggregatedNeeds.set(
        ing.inventoryId,
        (aggregatedNeeds.get(ing.inventoryId) ?? 0) + targetPortions * ing.qtyPerPortion
      );
    });
  });

  const baselineSum = dishes.reduce((sum, d) => sum + d.baselineDailyPortions, 0);
  const totalProjectedRevenue = dishes.reduce(
    (sum, d) => sum + Math.round(d.baselineDailyPortions * multiplier) * d.sellingPriceBdt,
    0
  );
  const totalPortions = dishes.reduce(
    (sum, d) => sum + Math.round(d.baselineDailyPortions * multiplier),
    0
  );

  // Build Predictive Multi-Band Forecast Series (Historical + Dashed Forecast + Confidence Band)
  const forecastSeries = useMemo(() => {
    const count = horizon === 7 ? 10 : horizon === 30 ? 12 : 14;
    const splitIdx = Math.floor(count * 0.4); // First 40% historical, rest projected

    return Array.from({ length: count }).map((_, i) => {
      const isProjected = i >= splitIdx;
      const wave = Math.sin(i * 0.9 + horizon * 0.1) * 0.14;
      const trend = isProjected ? (i - splitIdx) * 0.03 * multiplier : 0;
      const center = Math.round(baselineSum * (isProjected ? multiplier : 1.0) * (1 + wave + trend));
      const spread = isProjected ? Math.round(center * (0.1 + (i - splitIdx) * 0.015)) : 0;

      const labelEn = isProjected
        ? horizon === 7
          ? `+${i - splitIdx + 1}d`
          : horizon === 30
          ? `Day ${(i - splitIdx + 1) * 4}`
          : `Wk ${i - splitIdx + 1}`
        : `-${splitIdx - i}d`;

      const labelBn = isProjected
        ? horizon === 7
          ? `+${formatNum(i - splitIdx + 1, 'bn', 0)} দিন`
          : horizon === 30
          ? `দিন ${formatNum((i - splitIdx + 1) * 4, 'bn', 0)}`
          : `সপ্তাহ ${formatNum(i - splitIdx + 1, 'bn', 0)}`
        : `-${formatNum(splitIdx - i, 'bn', 0)} দিন`;

      return {
        idx: i,
        isProjected,
        labelEn,
        labelBn,
        center,
        upper: center + spread,
        lower: Math.max(40, center - spread),
      };
    });
  }, [baselineSum, multiplier, horizon]);

  const width = 760;
  const height = 190;
  const padX = 24;
  const padY = 24;

  const minV = Math.min(...forecastSeries.map((p) => p.lower)) * 0.9;
  const maxV = Math.max(...forecastSeries.map((p) => p.upper)) * 1.08;
  const spanV = Math.max(1, maxV - minV);

  const toCoords = (val: number, i: number) => {
    const x = padX + (i / (forecastSeries.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (val - minV) / spanV) * (height - padY * 2);
    return { x, y };
  };

  const smoothLine = (pts: Array<{ x: number; y: number }>) =>
    pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      const prev = arr[i - 1];
      const cx = ((prev.x + pt.x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

  const splitIndex = forecastSeries.findIndex((p) => p.isProjected);
  const histPoints = forecastSeries.slice(0, splitIndex + 1).map((p) => toCoords(p.center, p.idx));
  const projPoints = forecastSeries.slice(splitIndex).map((p) => toCoords(p.center, p.idx));
  const upperBandPts = forecastSeries.slice(splitIndex).map((p) => toCoords(p.upper, p.idx));
  const lowerBandPts = forecastSeries
    .slice(splitIndex)
    .map((p) => toCoords(p.lower, p.idx))
    .reverse();

  const histPath = smoothLine(histPoints);
  const projPath = smoothLine(projPoints);

  // Confidence band closed polygon/bezier path
  const bandPath = `${smoothLine(upperBandPts)} L ${lowerBandPts
    .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' L ')} Z`;

  const safeScrub = Math.min(scrubIdx, forecastSeries.length - 1);
  const activePt = forecastSeries[safeScrub];
  const activeCoord = toCoords(activePt.center, safeScrub);

  const handleScrub = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (forecastSeries.length - 1));
    if (idx !== safeScrub) {
      soundEngine.playTick((idx - 5) * 35);
      setScrubIdx(idx);
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Predictive Multi-Band Wave/Area Forecast Chart */}
      <LiquidGlassCard variant="hero-blue" reducedMotion={reducedMotion} className="squircle-24 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-900/8">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
              {locale === 'bn' ? 'চাহিদা পূর্বাভাস তরঙ্গ ও কনফিডেন্স ব্যান্ড' : 'Predictive Multi-Band Demand Forecast'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {locale === 'bn'
                ? 'ঐতিহাসিক প্রবণতা (সলিড) বনাম ভবিষ্যৎ পূর্বাভাস ও সম্ভাব্য সীমা (ড্যাশড)'
                : 'Historical baseline (solid) vs. confidence-band projection wave (dashed)'}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/70 border border-white rounded-full w-fit">
            {([7, 30, 90] as ForecastHorizon[]).map((h) => {
              const active = horizon === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    soundEngine.playChime();
                    setHorizon(h);
                    setScrubIdx(h === 7 ? 7 : 9);
                  }}
                  className={`relative px-3.5 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="forecast-horizon-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 bg-[#92E634] rounded-full shadow-xs"
                    />
                  )}
                  <span className="relative z-10">
                    {locale === 'bn' ? `আগামী ${formatNum(h, 'bn', 0)} দিন` : `Next ${h} Days`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Band SVG Forecast Graph */}
        <div ref={wrapRef} className="relative mt-5 mb-2 select-none">
          <motion.div
            animate={{
              x: Math.max(52, Math.min(box.w - 52, (activeCoord.x / width) * box.w)),
              y: Math.max(26, (activeCoord.y / height) * box.h - 14),
            }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-0 top-0 z-20"
          >
            <div className="-translate-x-1/2 -translate-y-full px-3 py-1 rounded-full bg-[#141619] text-white border border-white/20 text-xs font-bold whitespace-nowrap shadow-lg flex items-center gap-2">
              <span>
                {formatNum(activePt.center, locale, 0)} {t.portionsUnit}
              </span>
              <span className="text-[#92E634] text-[10px]">
                {locale === 'bn' ? activePt.labelBn : activePt.labelEn}
              </span>
            </div>
          </motion.div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 overflow-visible cursor-crosshair touch-none"
            onPointerMove={(e) => handleScrub(e.clientX)}
            onPointerDown={(e) => handleScrub(e.clientX)}
          >
            <defs>
              <linearGradient id="confidenceBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#92E634" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Confidence Envelope */}
            <motion.path
              key={`band-${horizon}`}
              d={bandPath}
              fill="url(#confidenceBandFill)"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Historical Solid Curve */}
            <motion.path
              key={`hist-${horizon}`}
              d={histPath}
              fill="none"
              stroke="#0F172A"
              strokeWidth="2.8"
              strokeLinecap="round"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Predictive Dashed Projection Curve */}
            <motion.path
              key={`proj-${horizon}`}
              d={projPath}
              fill="none"
              stroke="#16A34A"
              strokeWidth="2.8"
              strokeDasharray="6 5"
              strokeLinecap="round"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Scrub Cursor (GPU group transform) */}
            <motion.g
              animate={{ x: activeCoord.x }}
              transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
            >
              <line
                x1={0}
                x2={0}
                y1={activeCoord.y}
                y2={height}
                stroke="#0F172A"
                strokeOpacity="0.3"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
            </motion.g>
            <motion.g
              animate={{ x: activeCoord.x, y: activeCoord.y }}
              transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
            >
              <circle cx={0} cy={0} r="9" fill="#92E634" fillOpacity="0.35" />
              <circle cx={0} cy={0} r="4.5" fill="#141619" stroke="#92E634" strokeWidth="2.2" />
            </motion.g>
          </svg>
        </div>

        {/* Scenario Calibration Controls */}
        <div className="mt-4 pt-4 border-t border-slate-900/8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-slate-600 mb-2">{t.driverDayType}</p>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => {
                const active = Math.abs(multiplier - s.val) < 0.02;
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
                    transition={SPRING_SNAPPY}
                    onClick={() => {
                      soundEngine.playChime();
                      onChangeMultiplier(s.val);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-full border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#141619] text-white border-[#141619] shadow-sm'
                        : 'bg-white/80 text-slate-700 border-white hover:bg-white'
                    }`}
                  >
                    {s.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <label htmlFor="footfall-slider" className="font-semibold text-slate-600">
                {t.driverCustomSlider}
              </label>
              <span className="font-bold text-[#0F172A] tabular-nums">
                {formatNum(multiplier, locale, 2)}× ·{' '}
                <KineticCounter value={totalPortions} locale={locale} suffix={` ${t.portionsUnit}`} reducedMotion={reducedMotion} /> ·{' '}
                <KineticCounter value={totalProjectedRevenue} locale={locale} prefix="৳" reducedMotion={reducedMotion} />
              </span>
            </div>
            <input
              id="footfall-slider"
              type="range"
              min="0.65"
              max="1.8"
              step="0.05"
              value={multiplier}
              onChange={(e) => {
                soundEngine.playTick();
                onChangeMultiplier(parseFloat(e.target.value));
              }}
              className="w-full accent-[#141619] cursor-pointer"
            />
          </div>
        </div>
      </LiquidGlassCard>

      {/* Dish Prep Table with Inline Sparklines */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70">
          <h3 className="font-display text-lg font-bold text-[#0F172A]">{t.dishPrepTableTitle}</h3>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400">
                <th className="pb-1 px-2">{t.colDish}</th>
                <th className="pb-1 px-2">{locale === 'bn' ? 'চাহিদা' : 'Curve'}</th>
                <th className="pb-1 px-2 text-right">{t.colBaseline}</th>
                <th className="pb-1 px-2 text-right">{t.colForecast}</th>
                <th className="pb-1 px-2 text-right">{t.colRevenue}</th>
                <th className="pb-1 px-2">{t.colKeyIngredients}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {dishes.map((dish) => {
                const target = Math.round(dish.baselineDailyPortions * multiplier);
                const estRev = target * dish.sellingPriceBdt;

                return (
                  <tr key={dish.id}>
                    <td className="py-2 px-2">
                      <div className="font-semibold text-[#0F172A]">
                        {locale === 'bn' ? dish.nameBn : dish.nameEn}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {formatBdt(dish.sellingPriceBdt, locale)} / {t.portionsUnit}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <InlineRowSparkline
                        seed={dish.id}
                        color="#16A34A"
                        reducedMotion={reducedMotion}
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-semibold tabular-nums text-slate-600">
                      {formatNum(dish.baselineDailyPortions, locale, 0)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-[#92E634]/28 border border-[#92E634]/55 text-xs font-bold text-[#0F172A] tabular-nums">
                        <KineticCounter
                          value={target}
                          locale={locale}
                          suffix={` ${t.portionsUnit}`}
                          reducedMotion={reducedMotion}
                        />
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-bold text-[#0F172A] tabular-nums">
                        <KineticCounter
                          value={estRev}
                          locale={locale}
                          prefix="৳ "
                          reducedMotion={reducedMotion}
                        />
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-600">
                      {dish.ingredients
                        .map((ing) => {
                          const item = inventoryMap.get(ing.inventoryId);
                          if (!item) return null;
                          const needed = target * ing.qtyPerPortion;
                          return `${locale === 'bn' ? item.nameBn : item.nameEn}: ${formatNum(needed, locale)} ${item.unit}`;
                        })
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </LiquidGlassCard>

      {/* Raw Material Readiness Check */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70">
          <h3 className="font-display text-base font-bold text-[#0F172A]">
            {locale === 'bn' ? 'কাঁচামাল মজুদের তুলনামূলক হিসাব' : 'Raw Ingredient Stock Readiness'}
          </h3>
        </div>
        <div className="divide-y divide-slate-200/60">
          {Array.from(aggregatedNeeds.entries()).map(([invId, requiredQty]) => {
            const item = inventoryMap.get(invId);
            if (!item) return null;
            const deficit = requiredQty - item.quantity;
            const hasDeficit = deficit > 0;

            return (
              <div
                key={invId}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm hover:bg-white/60 transition-colors"
              >
                <span className="font-semibold text-[#0F172A]">
                  {locale === 'bn' ? item.nameBn : item.nameEn}
                </span>
                <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
                  <span className="text-slate-600">
                    {locale === 'bn' ? 'প্রয়োজন:' : 'Required:'} {formatNum(requiredQty, locale)} {item.unit}
                  </span>
                  <span className="text-slate-600">
                    {locale === 'bn' ? 'মজুদ:' : 'In Stock:'} {formatNum(item.quantity, locale)} {item.unit}
                  </span>
                  {hasDeficit ? (
                    <span className="text-[#DC2626] font-bold">
                      {locale === 'bn' ? 'ঘাটতি:' : 'Shortfall:'} {formatNum(deficit, locale)} {item.unit}
                    </span>
                  ) : (
                    <span className="text-[#16A34A] font-bold">
                      {locale === 'bn' ? 'পর্যাপ্ত' : 'Covered'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </LiquidGlassCard>
    </motion.div>
  );
};
