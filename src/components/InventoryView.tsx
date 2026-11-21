import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpDown,
  Flame,
  HeartHandshake,
  Minus,
  Plus,
  Search,
} from 'lucide-react';
import { CATEGORY_LABELS, formatBdt, formatNum, TRANSLATIONS } from '../i18n/translations';
import { InventoryCategory, InventoryItem, Locale, StockStatus } from '../types';
import { formatShelfLife, getStatusLabel, getStockStatus } from '../utils/inventoryUtils';
import { CategoryCylinders } from './CategoryCylinders';
import {
  InlineRowSparkline,
  KineticCounter,
  LiquidGlassCard,
  SPRING_SNAPPY,
  StarWatchButton,
  WaterRippleButton,
} from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface InventoryViewProps {
  locale: Locale;
  inventory: InventoryItem[];
  search: string;
  onSearchChange: (val: string) => void;
  categoryFilter: 'all' | InventoryCategory;
  onCategoryFilterChange: (cat: 'all' | InventoryCategory) => void;
  watchedIds: string[];
  reducedMotion?: boolean;
  onToggleWatch: (itemId: string) => void;
  onAdjustQuantity: (itemId: string, delta: number) => void;
  onOpenAddModal: () => void;
  onOpenRescueForItem: (itemId: string) => void;
  onOpenWasteForItem: (itemId: string) => void;
}

type SortKey = 'expiry' | 'value' | 'qty_asc' | 'name';

export const InventoryView: React.FC<InventoryViewProps> = ({
  locale,
  inventory,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  watchedIds,
  reducedMotion = false,
  onToggleWatch,
  onAdjustQuantity,
  onOpenAddModal,
  onOpenRescueForItem,
  onOpenWasteForItem,
}) => {
  const t = TRANSLATIONS[locale];
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('expiry');
  const [hoveredCatBar, setHoveredCatBar] = useState<InventoryCategory | null>(null);

  const healthCounts = useMemo(() => {
    const counts = { nominal: 0, expiring: 0, low: 0, expired: 0 };
    inventory.forEach((item) => {
      const st = getStockStatus(item);
      counts[st] += 1;
    });
    const total = Math.max(1, inventory.length);
    return {
      ...counts,
      total: inventory.length,
      pctNominal: Math.round((counts.nominal / total) * 100),
      pctExpiring: Math.round((counts.expiring / total) * 100),
      pctLow: Math.round((counts.low / total) * 100),
      pctExpired: Math.round((counts.expired / total) * 100),
    };
  }, [inventory]);

  const categoryDistribution = useMemo(() => {
    const keys: InventoryCategory[] = [
      'grains',
      'proteins',
      'produce',
      'spices_oil',
      'prepared',
    ];
    const rows = keys.map((cat) => {
      const items = inventory.filter((i) => i.category === cat);
      const value = items.reduce((s, i) => s + i.quantity * i.unitCostBdt, 0);
      return {
        category: cat,
        label: CATEGORY_LABELS[cat][locale],
        count: items.length,
        value,
      };
    });
    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({
      ...r,
      pct: Math.max(8, Math.round((r.value / maxVal) * 100)),
    }));
  }, [inventory, locale]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inventory.filter((item) => {
      const status = getStockStatus(item);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.nameEn} ${item.nameBn} ${item.supplierEn} ${item.supplierBn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'value') return b.quantity * b.unitCostBdt - a.quantity * a.unitCostBdt;
      if (sortBy === 'qty_asc') return a.quantity - b.quantity;
      if (sortBy === 'name') {
        const na = locale === 'bn' ? a.nameBn : a.nameEn;
        const nb = locale === 'bn' ? b.nameBn : b.nameEn;
        return na.localeCompare(nb);
      }
      return a.hoursUntilExpiry - b.hoursUntilExpiry;
    });

    return list;
  }, [inventory, search, statusFilter, categoryFilter, sortBy, locale]);

  const statusTabs: Array<{ key: 'all' | StockStatus; label: string }> = [
    { key: 'all', label: t.filterAll },
    { key: 'expiring', label: t.filterExpiring },
    { key: 'low', label: t.filterLow },
    { key: 'nominal', label: t.filterNominal },
    { key: 'expired', label: t.filterExpired },
  ];

  const totalFilteredValue = filteredItems.reduce(
    (sum, i) => sum + i.quantity * i.unitCostBdt,
    0
  );

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Category Inventory Liquid Cylinders */}
      <CategoryCylinders
        locale={locale}
        inventory={inventory}
        reducedMotion={reducedMotion}
        onSelectCategory={(cat) =>
          onCategoryFilterChange(categoryFilter === cat ? 'all' : cat)
        }
      />

      {/* Inventory Motion Analytics Strip: Freshness Breakdown + Category Value Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-6 squircle-24 p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F172A]">
                  {locale === 'bn' ? 'সতেজতা ও স্টক স্বাস্থ্য বিশ্লেষণ' : 'Freshness & Stock Health'}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === 'bn'
                    ? 'ফিল্টার করতে যেকোনো অবস্থার কার্ডে ক্লিক করুন'
                    : 'Click any state card below to filter inventory'}
                </p>
              </div>
              <span className="text-xs font-bold text-[#0F172A] tabular-nums">
                {formatNum(healthCounts.total, locale, 0)} {t.itemsCount}
              </span>
            </div>

            {/* Animated Segmented Health Bar */}
            <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5 p-0.5 mb-4">
              {healthCounts.pctNominal > 0 && (
                <motion.div
                  initial={reducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${healthCounts.pctNominal}%`, transformOrigin: 'left' }}
                  className="h-full rounded-full bg-emerald-500"
                />
              )}
              {healthCounts.pctExpiring > 0 && (
                <motion.div
                  initial={reducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${healthCounts.pctExpiring}%`, transformOrigin: 'left' }}
                  className="h-full rounded-full bg-amber-400"
                />
              )}
              {healthCounts.pctLow > 0 && (
                <motion.div
                  initial={reducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${healthCounts.pctLow}%`, transformOrigin: 'left' }}
                  className="h-full rounded-full bg-sky-500"
                />
              )}
              {healthCounts.pctExpired > 0 && (
                <motion.div
                  initial={reducedMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${healthCounts.pctExpired}%`, transformOrigin: 'left' }}
                  className="h-full rounded-full bg-red-500"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                {
                  key: 'nominal' as const,
                  label: t.filterNominal,
                  count: healthCounts.nominal,
                  dot: 'bg-emerald-500',
                  activeRing: 'border-emerald-400 bg-emerald-50/70',
                },
                {
                  key: 'expiring' as const,
                  label: t.filterExpiring,
                  count: healthCounts.expiring,
                  dot: 'bg-amber-400',
                  activeRing: 'border-amber-400 bg-amber-50/70',
                },
                {
                  key: 'low' as const,
                  label: t.filterLow,
                  count: healthCounts.low,
                  dot: 'bg-sky-500',
                  activeRing: 'border-sky-400 bg-sky-50/70',
                },
                {
                  key: 'expired' as const,
                  label: t.filterExpired,
                  count: healthCounts.expired,
                  dot: 'bg-red-500',
                  activeRing: 'border-red-400 bg-red-50/70',
                },
              ]
            ).map((card) => {
              const active = statusFilter === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    soundEngine.playTick();
                    setStatusFilter(active ? 'all' : card.key);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
                    active ? card.activeRing : 'bg-white/80 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${card.dot}`} />
                    <span className="truncate">{card.label}</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-bold text-[#0F172A] tabular-nums">
                    <KineticCounter
                      value={card.count}
                      locale={locale}
                      reducedMotion={reducedMotion}
                    />
                  </p>
                </button>
              );
            })}
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-6 squircle-24 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F172A]">
                {locale === 'bn' ? 'ক্যাটাগরি অনুযায়ী মূল্য বণ্টন' : 'Stock Value Distribution'}
              </h3>
              <p className="text-xs text-slate-500">
                {locale === 'bn'
                  ? 'হোভার বা ক্লিক করে বিভাগ অনুযায়ী মূল্য দেখুন'
                  : 'Hover or click a bar to filter by stock category'}
              </p>
            </div>
            <WaterRippleButton
              type="button"
              soundType="whoosh"
              reducedMotion={reducedMotion}
              onClick={onOpenAddModal}
              className="glass-lime-accent px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0F172A] cursor-pointer whitespace-nowrap"
            >
              {t.addStock}
            </WaterRippleButton>
          </div>

          <div className="h-36 flex items-end justify-between gap-3 pt-5">
            {categoryDistribution.map((bar, idx) => {
              const isSelected = categoryFilter === bar.category;
              const isHover = hoveredCatBar === bar.category;
              return (
                <button
                  key={bar.category}
                  type="button"
                  onMouseEnter={() => {
                    setHoveredCatBar(bar.category);
                    soundEngine.playTick(idx * 35);
                  }}
                  onMouseLeave={() => setHoveredCatBar(null)}
                  onClick={() => {
                    soundEngine.playClick();
                    onCategoryFilterChange(isSelected ? 'all' : bar.category);
                  }}
                  className="flex-1 h-full flex flex-col items-center justify-end relative cursor-pointer group"
                >
                  {(isHover || isSelected) && (
                    <motion.div
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-2 px-2 py-0.5 rounded-lg bg-[#141517] text-white text-[10px] font-bold tabular-nums whitespace-nowrap z-10"
                    >
                      {formatBdt(bar.value, locale)}
                    </motion.div>
                  )}

                  <div className="w-full max-w-[46px] h-24 rounded-2xl bg-slate-100/85 p-1 flex items-end justify-center overflow-hidden">
                    <motion.div
                      initial={reducedMotion ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.48,
                        delay: reducedMotion ? 0 : idx * 0.04,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        height: `${bar.pct}%`,
                        transformOrigin: 'bottom',
                      }}
                      className={`w-full rounded-xl transition-colors ${
                        isSelected || isHover ? 'bg-[#92E634]' : 'bg-[#0F172A]/80'
                      }`}
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-semibold text-slate-600 truncate max-w-full">
                    {bar.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </LiquidGlassCard>
      </section>

      {/* Filter, Search & Sort Liquid Glass Toolbar */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full w-fit">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    soundEngine.playTick();
                    setStatusFilter(tab.key);
                  }}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="inv-status-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 bg-[#92E634] rounded-full shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full sm:w-56 pl-9 pr-3 py-2 text-xs sm:text-sm bg-white/95 border border-slate-200 rounded-full text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                soundEngine.playTick(60);
                onCategoryFilterChange(e.target.value as 'all' | InventoryCategory);
              }}
              aria-label={t.colCategory}
              className="px-3.5 py-2 text-xs sm:text-sm bg-white/95 border border-slate-200 rounded-full text-[#0F172A] focus:outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="all">
                {t.filterAll} · {t.colCategory}
              </option>
              {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat][locale]}
                </option>
              ))}
            </select>

            <div className="relative inline-flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => {
                  soundEngine.playTick(80);
                  setSortBy(e.target.value as SortKey);
                }}
                aria-label="Sort inventory"
                className="pl-8 pr-3.5 py-2 text-xs sm:text-sm bg-white/95 border border-slate-200 rounded-full text-[#0F172A] focus:outline-none focus:border-[#0F172A] cursor-pointer"
              >
                <option value="expiry">
                  {locale === 'bn' ? 'দ্রুত মেয়াদ শেষ' : 'Sort: Soonest Expiry'}
                </option>
                <option value="value">
                  {locale === 'bn' ? 'সর্বোচ্চ মূল্য' : 'Sort: Highest Value'}
                </option>
                <option value="qty_asc">
                  {locale === 'bn' ? 'কম পরিমাণ আগে' : 'Sort: Lowest Stock'}
                </option>
                <option value="name">
                  {locale === 'bn' ? 'নাম (ক-হ)' : 'Sort: Name A–Z'}
                </option>
              </select>
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Summary Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500">
        <span className="font-semibold">
          {formatNum(filteredItems.length, locale, 0)} {t.itemsCount}
        </span>
        <span className="font-bold text-[#0F172A] tabular-nums">
          <KineticCounter
            value={totalFilteredValue}
            locale={locale}
            prefix="৳ "
            reducedMotion={reducedMotion}
          />
        </span>
      </div>

      {/* High-Density Glass Inventory Table with Per-Item Rescue & Waste Actions */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden p-4 sm:p-5">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#0F172A]">{t.emptyInventoryTitle}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.emptyInventoryDesc}</p>
            <WaterRippleButton
              type="button"
              soundType="whoosh"
              reducedMotion={reducedMotion}
              onClick={onOpenAddModal}
              className="glass-lime-accent mt-4 px-5 py-2 text-xs font-bold text-[#0F172A] rounded-full cursor-pointer"
            >
              {t.addStock}
            </WaterRippleButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="pb-1 pr-3">{t.colItem}</th>
                  <th className="pb-1 px-2">{locale === 'bn' ? 'প্রবণতা' : 'Trend'}</th>
                  <th className="pb-1 px-2 text-right">{t.colStock}</th>
                  <th className="pb-1 px-2 text-right">{t.colValue}</th>
                  <th className="pb-1 px-2 text-right">{t.colExpiry}</th>
                  <th className="pb-1 px-2">{t.colStatus}</th>
                  <th className="pb-1 px-2 text-right">{t.colActions}</th>
                  <th className="pb-1 pl-2 text-right">{locale === 'bn' ? 'নজর' : 'Watch'}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item);
                  const storageLabel =
                    item.storageType === 'ambient'
                      ? t.storageAmbient
                      : item.storageType === 'chilled'
                      ? t.storageChilled
                      : t.storageFrozen;

                  const sparkColor =
                    status === 'expired'
                      ? '#DC2626'
                      : status === 'expiring' || status === 'low'
                      ? '#D97706'
                      : '#16A34A';

                  const statusTextClass =
                    status === 'expired'
                      ? 'text-red-700'
                      : status === 'expiring' || status === 'low'
                      ? 'text-amber-700'
                      : 'text-emerald-700';

                  return (
                    <tr key={item.id} className="transition-opacity duration-150">
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-[#0F172A]">
                          {locale === 'bn' ? item.nameBn : item.nameEn}
                        </div>
                        <div className="text-xs text-slate-500">
                          {CATEGORY_LABELS[item.category][locale]} · {storageLabel}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <InlineRowSparkline
                          seed={item.id}
                          color={sparkColor}
                          reducedMotion={reducedMotion}
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums whitespace-nowrap">
                          {formatNum(item.quantity, locale)} {item.unit}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-bold text-[#0F172A] tabular-nums whitespace-nowrap">
                          {formatBdt(item.quantity * item.unitCostBdt, locale)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        {formatShelfLife(item.hoursUntilExpiry, locale)}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${statusTextClass}`}>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: sparkColor }}
                          />
                          {getStatusLabel(status, locale)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <motion.button
                            type="button"
                            whileTap={!reducedMotion ? { scale: 0.85 } : undefined}
                            onClick={() => {
                              soundEngine.playClick();
                              onAdjustQuantity(item.id, -1);
                            }}
                            disabled={item.quantity <= 0}
                            aria-label="Decrease quantity by 1"
                            className="glass-pill-cell p-1.5 rounded-lg text-slate-700 hover:text-[#0F172A] disabled:opacity-35 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={!reducedMotion ? { scale: 0.85 } : undefined}
                            onClick={() => {
                              soundEngine.playClick();
                              onAdjustQuantity(item.id, 1);
                            }}
                            aria-label="Increase quantity by 1"
                            className="glass-pill-cell p-1.5 rounded-lg text-slate-700 hover:text-[#0F172A] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
                            disabled={item.quantity <= 0}
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenRescueForItem(item.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-[#92E634]/28 border border-[#92E634]/60 text-[#0F172A] hover:bg-[#92E634] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            <HeartHandshake className="w-3 h-3" />
                            <span>{t.rescueAction}</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
                            disabled={item.quantity <= 0}
                            onClick={() => {
                              soundEngine.playClick();
                              onOpenWasteForItem(item.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50/90 border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            <Flame className="w-3 h-3" />
                            <span>{t.markWasteAction}</span>
                          </motion.button>
                        </div>
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <StarWatchButton
                          watched={watchedIds.includes(item.id)}
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
    </motion.div>
  );
};
