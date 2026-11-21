import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChefHat,
  ChevronDown,
  Flame,
  Leaf,
  PackageCheck,
  SlidersHorizontal,
  Utensils,
  Wheat,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  DISPOSITION_LABELS,
  formatBdt,
  formatNum,
  TRANSLATIONS,
} from '../i18n/translations';
import {
  DishForecast,
  InventoryCategory,
  InventoryItem,
  Locale,
  ViewTab,
  WasteDisposition,
  WasteLogEntry,
} from '../types';
import { formatShelfLife, getStatusLabel, getStockStatus } from '../utils/inventoryUtils';
import { InteractivePortfolioChart } from './InteractivePortfolioChart';
import { LayeredImpactCard } from './LayeredImpactCard';
import { CategoryCylinders } from './CategoryCylinders';
import {
  GlassVariant,
  InlineRowSparkline,
  KineticCounter,
  LiquidGlassCard,
  SPRING_SNAPPY,
  StarWatchButton,
  WaterRippleButton,
} from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface OverviewViewProps {
  locale: Locale;
  inventory: InventoryItem[];
  dishes: DishForecast[];
  wasteLogs: WasteLogEntry[];
  forecastMultiplier: number;
  watchedIds: string[];
  reducedMotion?: boolean;
  onToggleWatch: (itemId: string) => void;
  onQuickDisposition: (item: InventoryItem, disposition: WasteDisposition, qty: number) => void;
  onQuickRestock: (itemId: string, delta: number) => void;
  onNavigate: (tab: ViewTab) => void;
  onSelectCategory: (cat: InventoryCategory) => void;
  onOpenWasteModal: () => void;
}

function CategoryIcon({ category }: { category: InventoryCategory }) {
  switch (category) {
    case 'grains':
      return <Wheat className="w-4 h-4 text-[#0A2A1E]" />;
    case 'proteins':
      return <Flame className="w-4 h-4 text-[#6D28D9]" />;
    case 'produce':
      return <Leaf className="w-4 h-4 text-[#15803D]" />;
    case 'spices_oil':
      return <Utensils className="w-4 h-4 text-[#B45309]" />;
    default:
      return <ChefHat className="w-4 h-4 text-[#0F172A]" />;
  }
}

// Animated Mini Wave Sparkline inside Pastel KPI Cards
const CardSparkWave: React.FC<{
  seed: number;
  stroke: string;
  reducedMotion?: boolean;
}> = ({ seed, stroke, reducedMotion = false }) => {
  const pts = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const x = i * 24 + 4;
    const y = 20 + Math.sin(seed * 1.1 + i * 0.95) * 9;
    return { x, y };
  });

  const path = pts.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x} ${pt.y.toFixed(1)}`;
  }, '');

  const last = pts[pts.length - 1];

  return (
    <svg viewBox="0 0 156 36" className="w-full h-9 overflow-visible my-2">
      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle cx={last.x} cy={last.y} r="3.2" fill={stroke} />
    </svg>
  );
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  locale,
  inventory,
  dishes,
  wasteLogs,
  forecastMultiplier,
  watchedIds,
  reducedMotion = false,
  onToggleWatch,
  onQuickDisposition,
  onQuickRestock,
  onNavigate,
  onSelectCategory,
  onOpenWasteModal,
}) => {
  const t = TRANSLATIONS[locale];
  const [tableScope, setTableScope] = useState<'priority' | 'watched' | 'all'>('priority');
  const [sortBy, setSortBy] = useState<'expiry' | 'value'>('expiry');

  const totalStockValue = inventory.reduce((sum, i) => sum + i.quantity * i.unitCostBdt, 0);

  const rescuedValueWeek = wasteLogs
    .filter((w) => DISPOSITION_LABELS[w.disposition].isRescue)
    .reduce((sum, w) => sum + w.valueBdt, 0);

  const lossValueWeek = wasteLogs
    .filter((w) => !DISPOSITION_LABELS[w.disposition].isRescue)
    .reduce((sum, w) => sum + w.valueBdt, 0);

  const totalWasteEvents = rescuedValueWeek + lossValueWeek;
  const rescueRatePercent =
    totalWasteEvents > 0 ? Math.round((rescuedValueWeek / totalWasteEvents) * 100) : 84;

  // Top 3 Pastel Glass Asset/Batch Cards
  const pastelBatches = useMemo(() => {
    const sorted = [...inventory].sort((a, b) => a.hoursUntilExpiry - b.hoursUntilExpiry);
    return sorted.slice(0, 3);
  }, [inventory]);

  const pastelConfigs: Array<{ variant: GlassVariant; stroke: string; deltaColor: string }> = [
    { variant: 'violet', stroke: '#7C3AED', deltaColor: 'text-[#6D28D9]' },
    { variant: 'mint', stroke: '#16A34A', deltaColor: 'text-[#15803D]' },
    { variant: 'gold', stroke: '#D97706', deltaColor: 'text-[#B45309]' },
  ];

  // Priority Watchlist rows
  const tableRows = useMemo(() => {
    let list = [...inventory];
    if (tableScope === 'priority') {
      list = list.filter((i) => i.hoursUntilExpiry <= 48 || i.quantity <= i.minThreshold);
    } else if (tableScope === 'watched') {
      list = list.filter((i) => watchedIds.includes(i.id));
    }

    list.sort((a, b) => {
      if (sortBy === 'value') {
        return b.quantity * b.unitCostBdt - a.quantity * a.unitCostBdt;
      }
      return a.hoursUntilExpiry - b.hoursUntilExpiry;
    });

    return list.slice(0, 5);
  }, [inventory, tableScope, sortBy, watchedIds]);

  const atRiskCount = inventory.filter((i) => i.hoursUntilExpiry <= 48 && i.quantity > 0).length;
  const todayTargetPortions = Math.round(
    dishes.reduce((sum, d) => sum + d.baselineDailyPortions, 0) * forecastMultiplier
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reducedMotion ? 0 : 0.04 },
    },
  };

  const itemVariants = {
    hidden: reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Top Split Row: Hero Portfolio Glass Card + 3 Pastel Glass Asset Cards with Sparklines */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <motion.div variants={itemVariants} className="xl:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
              {locale === 'bn' ? 'মজুদ পোর্টফোলিও' : 'Portfolio'}
            </h2>
            <span className="text-xs text-slate-500 font-semibold tabular-nums">
              {formatNum(todayTargetPortions, locale, 0)} {t.portionsUnit} ·{' '}
              {formatNum(forecastMultiplier, locale, 2)}×
            </span>
          </div>
          <div className="flex-1">
            <InteractivePortfolioChart
              locale={locale}
              totalStockValue={totalStockValue}
              rescuedValueWeek={rescuedValueWeek}
              rescueRatePercent={rescueRatePercent}
              forecastMultiplier={forecastMultiplier}
              reducedMotion={reducedMotion}
              onJumpToForecast={() => onNavigate('forecast')}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="xl:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
              {locale === 'bn' ? 'অগ্রাধিকার ব্যাচসমূহ' : 'Your Batches'}
            </h2>
            <motion.button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onNavigate('inventory');
              }}
              whileHover={!reducedMotion ? { scale: 1.08, rotate: 8 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
              transition={SPRING_SNAPPY}
              aria-label="Manage all inventory batches"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            {pastelBatches.map((item, idx) => {
              const cfg = pastelConfigs[idx % pastelConfigs.length];
              const batchValue = item.quantity * item.unitCostBdt;
              const rescueQty = Math.min(
                item.quantity,
                Math.max(1, Math.round(item.quantity * 0.35 * 10) / 10)
              );

              return (
                <div key={item.id} className="h-full">
                  <LiquidGlassCard
                    variant={cfg.variant}
                    hoverLift
                    reducedMotion={reducedMotion}
                    className="squircle-24 p-5 flex flex-col justify-between min-h-[268px] h-full"
                  >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-2xl font-bold tracking-tight text-[#0F172A] tabular-nums">
                        <KineticCounter
                          value={item.quantity}
                          locale={locale}
                          decimals={Number.isInteger(item.quantity) ? 0 : 1}
                          suffix={` ${item.unit}`}
                          reducedMotion={reducedMotion}
                        />
                      </span>
                      <WaterRippleButton
                        type="button"
                        soundType="chime"
                        reducedMotion={reducedMotion}
                        onClick={() => onQuickDisposition(item, 'rescued_discount', rescueQty)}
                        title={t.actionRescueDiscount}
                        className="text-[11px] font-bold text-[#0F172A] px-2.5 py-0.5 rounded-full bg-white/85 hover:bg-[#92E634] border border-white cursor-pointer whitespace-nowrap shadow-xs"
                      >
                        -25%
                      </WaterRippleButton>
                    </div>

                    <p className="mt-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                      <KineticCounter
                        value={batchValue}
                        locale={locale}
                        prefix="৳ "
                        reducedMotion={reducedMotion}
                      />
                    </p>

                    <p className="mt-2.5 text-sm font-semibold text-[#0F172A] leading-snug line-clamp-2">
                      {locale === 'bn' ? item.nameBn : item.nameEn}
                    </p>

                    {/* Animated Sparkline inside Each Pastel Card */}
                    <CardSparkWave seed={idx + 2} stroke={cfg.stroke} reducedMotion={reducedMotion} />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <motion.div
                      whileHover={!reducedMotion ? { rotate: -8, scale: 1.1 } : undefined}
                      transition={SPRING_SNAPPY}
                      className="glass-icon-cube w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    >
                      <CategoryIcon category={item.category} />
                    </motion.div>

                    <span className={`text-xs font-bold tabular-nums ${cfg.deltaColor}`}>
                      {formatShelfLife(item.hoursUntilExpiry, locale)}
                    </span>
                  </div>
                  </LiquidGlassCard>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Category Inventory Section: Animated Liquid-Filled Vertical Glass Cylinders */}
      <motion.div variants={itemVariants}>
        <CategoryCylinders
          locale={locale}
          inventory={inventory}
          reducedMotion={reducedMotion}
          onSelectCategory={onSelectCategory}
        />
      </motion.div>

      {/* Bottom Split Row: Structured Data Table with Inline Sparklines + Dark Callout Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <motion.section variants={itemVariants} className="xl:col-span-8 flex flex-col">
          <LiquidGlassCard
            variant="panel"
            reducedMotion={reducedMotion}
            className="squircle-24 p-5 sm:p-6 flex-1"
          >
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F172A]">
                  {atRiskCount > 0
                    ? locale === 'bn'
                      ? `${formatNum(atRiskCount, locale, 0)}টি ব্যাচ জরুরি নজরে`
                      : `${atRiskCount} batches need attention`
                    : t.allCaughtUp}
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center p-0.5 bg-slate-100/90 border border-slate-200/80 rounded-full">
                  {(
                    [
                      { key: 'priority', labelEn: 'At-Risk', labelBn: 'ঝুঁকিপূর্ণ' },
                      { key: 'watched', labelEn: 'Starred', labelBn: 'তারকাচিহ্নিত' },
                      { key: 'all', labelEn: 'All', labelBn: 'সব' },
                    ] as const
                  ).map((opt) => {
                    const active = tableScope === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setTableScope(opt.key);
                        }}
                        className={`relative px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                          active ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="overview-table-scope"
                            transition={SPRING_SNAPPY}
                            className="absolute inset-0 bg-[#92E634] rounded-full shadow-xs"
                          />
                        )}
                        <span className="relative z-10">
                          {locale === 'bn' ? opt.labelBn : opt.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <motion.button
                  type="button"
                  onClick={() => {
                    soundEngine.playTick(80);
                    setSortBy((prev) => (prev === 'expiry' ? 'value' : 'expiry'));
                  }}
                  whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
                  className="glass-pill-cell inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full text-slate-700 hover:text-[#0F172A] cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {sortBy === 'expiry'
                      ? locale === 'bn'
                        ? 'মেয়াদ অনুযায়ী'
                        : 'Soonest expiry'
                      : locale === 'bn'
                      ? 'মূল্য অনুযায়ী'
                      : 'Highest value'}
                  </span>
                  <motion.span
                    animate={{ rotate: sortBy === 'value' ? 180 : 0 }}
                    transition={SPRING_SNAPPY}
                    className="inline-flex"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </motion.span>
                </motion.button>
              </div>
            </div>

            {/* Table with Inline Sparklines in Every Row */}
            {tableRows.length === 0 ? (
              <div className="py-12 text-center">
                <PackageCheck className="w-7 h-7 text-[#16A34A] mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">{t.allCaughtUp}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[11px] font-semibold text-slate-400">
                      <th className="pb-1 pr-3">{t.colItem}</th>
                      <th className="pb-1 px-2">{locale === 'bn' ? 'প্রবণতা' : 'Trend'}</th>
                      <th className="pb-1 px-2 text-right">{t.colStock}</th>
                      <th className="pb-1 px-2 text-right">{t.colExpiry}</th>
                      <th className="pb-1 px-2 text-right">{t.colValue}</th>
                      <th className="pb-1 px-2">{t.colActions}</th>
                      <th className="pb-1 pl-2 text-right">
                        {locale === 'bn' ? 'নজর' : 'Watch'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {tableRows.map((item) => {
                      const status = getStockStatus(item);
                      const isWatched = watchedIds.includes(item.id);
                      const rescueQty = Math.min(
                        item.quantity,
                        Math.max(1, Math.round(item.quantity * 0.4 * 10) / 10)
                      );
                      const sparkColor =
                        status === 'expired'
                          ? '#DC2626'
                          : status === 'expiring' || status === 'low'
                          ? '#D97706'
                          : '#16A34A';
                      const shelfBadge =
                        status === 'expired'
                          ? 'text-red-700 border-red-200 bg-red-50'
                          : status === 'expiring' || status === 'low'
                          ? 'text-amber-700 border-amber-200 bg-amber-50'
                          : 'text-emerald-700 border-emerald-200 bg-emerald-50';

                      return (
                        <tr
                          key={item.id}
                          className="transition-opacity duration-150"
                        >
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  whileHover={!reducedMotion ? { scale: 1.08, rotate: -5 } : undefined}
                                  transition={SPRING_SNAPPY}
                                  className="glass-icon-cube w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                >
                                  <CategoryIcon category={item.category} />
                                </motion.div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#0F172A] truncate max-w-[165px]">
                                    {locale === 'bn' ? item.nameBn : item.nameEn}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-[165px]">
                                    {CATEGORY_LABELS[item.category][locale]} · {getStatusLabel(status, locale)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-1.5 px-2">
                              <InlineRowSparkline
                                seed={item.id}
                                color={sparkColor}
                                reducedMotion={reducedMotion}
                              />
                            </td>

                            <td className="py-1.5 px-1.5 text-right">
                              <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums whitespace-nowrap">
                                {formatNum(item.quantity, locale)} {item.unit}
                              </span>
                            </td>

                            <td className="py-1.5 px-1.5 text-right">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-xl border text-xs font-semibold tabular-nums whitespace-nowrap ${shelfBadge}`}
                              >
                                {formatShelfLife(item.hoursUntilExpiry, locale)}
                              </span>
                            </td>

                            <td className="py-1.5 px-1.5 text-right">
                              <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
                                {formatBdt(item.quantity * item.unitCostBdt, locale)}
                              </span>
                            </td>

                            <td className="py-1.5 px-1.5 whitespace-nowrap">
                              {status === 'low' ? (
                                <WaterRippleButton
                                  type="button"
                                  soundType="click"
                                  reducedMotion={reducedMotion}
                                  onClick={() => onQuickRestock(item.id, 5)}
                                  className="px-3 py-1 text-[11px] font-bold rounded-full bg-[#141619] text-white hover:bg-[#0A2A1E] cursor-pointer"
                                >
                                  {t.actionRestock}
                                </WaterRippleButton>
                              ) : (
                                <WaterRippleButton
                                  type="button"
                                  soundType="chime"
                                  reducedMotion={reducedMotion}
                                  onClick={() => onQuickDisposition(item, 'rescued_discount', rescueQty)}
                                  className="px-3 py-1 text-[11px] font-bold rounded-full bg-[#92E634]/28 border border-[#92E634]/60 text-[#0F172A] hover:bg-[#92E634] cursor-pointer"
                                >
                                  {t.actionRescueDiscount}
                                </WaterRippleButton>
                              )}
                            </td>

                            <td className="py-1.5 pl-2 text-right">
                              <StarWatchButton
                                watched={isWatched}
                                onToggle={() => onToggleWatch(item.id)}
                                reducedMotion={reducedMotion}
                              />
                            </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </LiquidGlassCard>
        </motion.section>

        {/* Right High-Contrast Dark Callout Card */}
        <motion.div variants={itemVariants} className="xl:col-span-4 flex flex-col">
          <LayeredImpactCard
            locale={locale}
            rescuedBdt={rescuedValueWeek}
            rescueRatePercent={rescueRatePercent}
            reducedMotion={reducedMotion}
            onPrimaryAction={() => onNavigate('rescue')}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
