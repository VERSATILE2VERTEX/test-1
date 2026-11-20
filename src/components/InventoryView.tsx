import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Minus, Plus, Search } from 'lucide-react';
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
}

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
}) => {
  const t = TRANSLATIONS[locale];
  const [statusFilter, setStatusFilter] = React.useState<'all' | StockStatus>('all');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const status = getStockStatus(item);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.nameEn} ${item.nameBn} ${item.supplierEn} ${item.supplierBn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [inventory, search, statusFilter, categoryFilter]);

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

      {/* Filter & Search Liquid Glass Toolbar */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white/90 border border-slate-200 rounded-full text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                soundEngine.playTick(60);
                onCategoryFilterChange(e.target.value as 'all' | InventoryCategory);
              }}
              className="px-3.5 py-2 text-sm bg-white/90 border border-slate-200 rounded-full text-[#0F172A] focus:outline-none focus:border-[#0F172A] cursor-pointer"
            >
              <option value="all">
                {t.filterAll} — {t.colCategory}
              </option>
              {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat][locale]}
                </option>
              ))}
            </select>
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

      {/* High-density Glass Inventory Table with Inline Mini Sparklines */}
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
                  <th className="pb-1 px-2">{t.colCategory}</th>
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

                  const statusBadgeClass =
                    status === 'expired'
                      ? 'text-red-700 border-red-200 bg-red-50'
                      : status === 'expiring' || status === 'low'
                      ? 'text-amber-700 border-amber-200 bg-amber-50'
                      : 'text-emerald-700 border-emerald-200 bg-emerald-50';

                  return (
                    <tr key={item.id} className="transition-opacity duration-150">
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-[#0F172A]">
                            {locale === 'bn' ? item.nameBn : item.nameEn}
                          </div>
                          <div className="text-xs text-slate-500">
                            {locale === 'bn' ? item.supplierBn : item.supplierEn} · {storageLabel}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <InlineRowSparkline
                            seed={item.id}
                            color={sparkColor}
                            reducedMotion={reducedMotion}
                          />
                        </td>
                        <td className="py-2 px-2 text-xs text-slate-600 whitespace-nowrap">
                          {CATEGORY_LABELS[item.category][locale]}
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
                          <span className={`inline-block px-2.5 py-1 rounded-xl border text-xs font-semibold ${statusBadgeClass}`}>
                            {getStatusLabel(status, locale)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
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
                              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                              onClick={() => {
                                soundEngine.playChime();
                                onAdjustQuantity(item.id, 5);
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#92E634]/28 border border-[#92E634]/55 text-[#0F172A] hover:bg-[#92E634] cursor-pointer"
                            >
                              +5
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
