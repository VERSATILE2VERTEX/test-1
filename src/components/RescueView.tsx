import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ChefHat,
  Clock,
  Flame,
  HeartHandshake,
  Leaf,
  PackageCheck,
  Sparkles,
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
import { InventoryCategory, InventoryItem, Locale, WasteLogEntry } from '../types';
import { formatShelfLife, getStockStatus } from '../utils/inventoryUtils';
import {
  InlineRowSparkline,
  KineticCounter,
  LiquidGlassCard,
  SPRING_SNAPPY,
  WaterRippleButton,
} from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface RescueViewProps {
  locale: Locale;
  inventory: InventoryItem[];
  wasteLogs: WasteLogEntry[];
  reducedMotion?: boolean;
  onQuickRescue: (
    item: InventoryItem,
    channel: 'rescued_discount' | 'rescued_donation' | 'staff_meal' | 'meal_prep',
    qty: number
  ) => void;
  onOpenRescueModal: (itemId?: string) => void;
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

export const RescueView: React.FC<RescueViewProps> = ({
  locale,
  inventory,
  wasteLogs,
  reducedMotion = false,
  onQuickRescue,
  onOpenRescueModal,
}) => {
  const t = TRANSLATIONS[locale];
  const [queueFilter, setQueueFilter] = useState<'priority' | 'all'>('priority');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const rescuedLogs = useMemo(
    () => wasteLogs.filter((entry) => DISPOSITION_LABELS[entry.disposition].isRescue),
    [wasteLogs]
  );

  const lossLogs = useMemo(
    () => wasteLogs.filter((entry) => !DISPOSITION_LABELS[entry.disposition].isRescue),
    [wasteLogs]
  );

  const stats = useMemo(() => {
    const rescuedBdt = rescuedLogs.reduce((s, e) => s + e.valueBdt, 0);
    const rescuedUnits = rescuedLogs.reduce((s, e) => s + e.quantity, 0);
    const lossBdt = lossLogs.reduce((s, e) => s + e.valueBdt, 0);
    const total = rescuedBdt + lossBdt;
    const rate = total > 0 ? Math.round((rescuedBdt / total) * 100) : 100;
    return { rescuedBdt, rescuedUnits, rate };
  }, [rescuedLogs, lossLogs]);

  const queueItems = useMemo(() => {
    const active = inventory.filter((i) => i.quantity > 0);
    const filtered =
      queueFilter === 'priority'
        ? active.filter((i) => i.hoursUntilExpiry <= 48 || i.category === 'prepared')
        : active;
    return [...filtered].sort((a, b) => a.hoursUntilExpiry - b.hoursUntilExpiry);
  }, [inventory, queueFilter]);

  const channelBreakdown = useMemo(() => {
    const keys: Array<'rescued_discount' | 'staff_meal' | 'rescued_donation' | 'meal_prep'> = [
      'rescued_discount',
      'staff_meal',
      'rescued_donation',
      'meal_prep',
    ];
    const total = Math.max(1, stats.rescuedBdt);
    return keys.map((k) => {
      const value = rescuedLogs
        .filter((e) => e.disposition === k)
        .reduce((s, e) => s + e.valueBdt, 0);
      return {
        key: k,
        label: DISPOSITION_LABELS[k][locale],
        value,
        pct: Math.round((value / total) * 100),
      };
    });
  }, [rescuedLogs, stats.rescuedBdt, locale]);

  // 7-day trend reactive to live rescued totals
  const weeklyTrend = useMemo(() => {
    const days =
      locale === 'bn'
        ? ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'আজ']
        : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Today'];
    const baseWeights = [0.65, 0.8, 0.55, 0.92, 0.78, 1.05, 1.28];
    const unitScale = Math.max(420, Math.round(stats.rescuedBdt / 5.5));
    const vals = baseWeights.map((w, idx) =>
      idx === 6 ? Math.max(600, Math.round(unitScale * w + (rescuedLogs.length - 3) * 140)) : Math.round(unitScale * w)
    );
    const maxVal = Math.max(...vals, 1);
    return days.map((label, idx) => ({
      label,
      value: vals[idx],
      pct: Math.max(18, Math.round((vals[idx] / maxVal) * 100)),
    }));
  }, [locale, stats.rescuedBdt, rescuedLogs.length]);

  const ringCircumference = 2 * Math.PI * 30;
  const ringOffset = ringCircumference - (ringCircumference * Math.min(100, stats.rate)) / 100;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Top 3 Rescue KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiquidGlassCard
          variant="mint"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'উদ্ধারকৃত মূল্য (৭ দিন)' : 'Rescued Value (7d)'}
            </p>
            <motion.span
              whileHover={!reducedMotion ? { rotate: -10, scale: 1.1 } : undefined}
              className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center shadow-xs"
            >
              <HeartHandshake className="w-4 h-4 text-[#15803D]" />
            </motion.span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#15803D] tabular-nums">
            <KineticCounter
              value={stats.rescuedBdt}
              locale={locale}
              prefix="৳ "
              reducedMotion={reducedMotion}
            />
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {locale === 'bn'
              ? `${formatNum(rescuedLogs.length, locale, 0)}টি ব্যাচ সফলভাবে সংরক্ষিত`
              : `${rescuedLogs.length} surplus batches diverted from bin`}
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="violet"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'সংরক্ষিত পরিমাণ / প্লেট' : 'Portions & Units Saved'}
            </p>
            <motion.span
              whileHover={!reducedMotion ? { rotate: 10, scale: 1.1 } : undefined}
              className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#6D28D9]" />
            </motion.span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#0F172A] tabular-nums">
            <KineticCounter
              value={stats.rescuedUnits}
              locale={locale}
              decimals={1}
              reducedMotion={reducedMotion}
            />
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {locale === 'bn'
              ? 'ছাড়, স্টাফ মিল ও কমিউনিটি দান মিলিয়ে'
              : 'Across discount bundles, staff meals & donations'}
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="dark-callout"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5 text-white flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold text-slate-300">{t.wasteSummaryRate}</p>
            <p className="mt-1.5 font-display text-3xl font-bold text-[#92E634] tabular-nums">
              <KineticCounter
                value={stats.rate}
                locale={locale}
                suffix="%"
                reducedMotion={reducedMotion}
              />
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {locale === 'bn' ? 'মোট উদ্বৃত্তের মধ্যে উদ্ধারকৃত অংশ' : 'Share of at-risk food saved'}
            </p>
          </div>

          <svg viewBox="0 0 76 76" className="w-18 h-18 shrink-0 -rotate-90">
            <circle
              cx="38"
              cy="38"
              r="30"
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="7"
            />
            <motion.circle
              cx="38"
              cy="38"
              r="30"
              fill="none"
              stroke="#92E634"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              initial={reducedMotion ? false : { strokeDashoffset: ringCircumference }}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        </LiquidGlassCard>
      </section>

      {/* Rescue Motion Analytics: 7-Day Recovery Bars + Channel Mix */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-7 squircle-24 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F172A]">
                {locale === 'bn' ? '৭ দিনের উদ্ধার প্রবণতা' : '7-Day Rescue Value Trend'}
              </h3>
              <p className="text-xs text-slate-500">
                {locale === 'bn'
                  ? 'প্রতিদিনের বাঁচানো টাকার পরিমাণ দেখতে বারে হোভার করুন'
                  : 'Hover any bar to inspect daily saved value'}
              </p>
            </div>
            <WaterRippleButton
              type="button"
              soundType="chime"
              reducedMotion={reducedMotion}
              onClick={() => onOpenRescueModal()}
              className="glass-lime-accent px-4 py-2 rounded-full text-xs font-bold text-[#0F172A] cursor-pointer whitespace-nowrap"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'নতুন উদ্ধার' : 'Rescue Item'}</span>
            </WaterRippleButton>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1">
            {weeklyTrend.map((day, idx) => {
              const isHover = hoveredDay === idx;
              const isToday = idx === weeklyTrend.length - 1;
              return (
                <div
                  key={day.label}
                  onMouseEnter={() => {
                    setHoveredDay(idx);
                    soundEngine.playTick(idx * 25);
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer"
                >
                  {isHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-2 px-2 py-0.5 rounded-lg bg-[#141517] text-white text-[10px] font-bold tabular-nums whitespace-nowrap shadow-sm z-10"
                    >
                      {formatBdt(day.value, locale)}
                    </motion.div>
                  )}

                  <div className="w-full max-w-[40px] h-32 flex items-end justify-center bg-slate-100/80 rounded-2xl overflow-hidden p-1">
                    <motion.div
                      initial={reducedMotion ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.45,
                        delay: reducedMotion ? 0 : idx * 0.04,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        height: `${day.pct}%`,
                        transformOrigin: 'bottom',
                      }}
                      className={`w-full rounded-xl transition-colors ${
                        isToday || isHover
                          ? 'bg-[#92E634]'
                          : 'bg-emerald-500/75'
                      }`}
                    />
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold ${
                      isToday ? 'text-[#0F172A] font-bold' : 'text-slate-500'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-5 squircle-24 p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <h3 className="font-display text-lg font-bold text-[#0F172A]">
              {locale === 'bn' ? 'উদ্ধারের মাধ্যম অনুযায়ী বিভাজন' : 'Saved by Rescue Channel'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {locale === 'bn'
                ? 'কোন মাধ্যমে কত টাকার খাবার বাঁচানো হয়েছে'
                : 'Distribution across recovery channels'}
            </p>
          </div>

          <div className="space-y-3.5">
            {channelBreakdown.map((ch, idx) => (
              <div key={ch.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#0F172A]">{ch.label}</span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    {formatBdt(ch.value, locale)} · {formatNum(ch.pct, locale, 0)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    initial={reducedMotion ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 0.48,
                      delay: reducedMotion ? 0 : idx * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      width: `${Math.max(4, ch.pct)}%`,
                      transformOrigin: 'left',
                    }}
                    className="h-full rounded-full bg-linear-to-r from-[#92E634] to-[#16A34A]"
                  />
                </div>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      </section>

      {/* Rescue Queue: Near-Expiry & Surplus Items */}
      <LiquidGlassCard
        variant="panel"
        reducedMotion={reducedMotion}
        className="squircle-24 p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-display text-xl font-bold text-[#0F172A]">
              {locale === 'bn' ? 'উদ্ধারযোগ্য পণ্যের তালিকা' : 'Rescue Queue (At-Risk & Surplus)'}
            </h3>
            <p className="text-xs text-slate-500">
              {locale === 'bn'
                ? 'এক ক্লিকে ছাড়ে বিক্রি, স্টাফ মিল বা দানে পাঠান'
                : 'Move near-expiry or surplus batches into Rescue with 1 click or custom channel'}
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-full w-fit">
            {(
              [
                { key: 'priority', labelEn: 'Near Expiry (<=48h)', labelBn: 'জরুরি (<=৪৮ ঘণ্টা)' },
                { key: 'all', labelEn: 'All Stock', labelBn: 'সব মজুদ' },
              ] as const
            ).map((opt) => {
              const active = queueFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    soundEngine.playTick();
                    setQueueFilter(opt.key);
                  }}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="rescue-queue-filter"
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
        </div>

        {queueItems.length === 0 ? (
          <div className="py-10 text-center">
            <PackageCheck className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#0F172A]">{t.allCaughtUp}</p>
            <button
              type="button"
              onClick={() => setQueueFilter('all')}
              className="mt-3 px-4 py-1.5 rounded-full bg-slate-100 hover:bg-[#92E634]/35 text-xs font-bold text-[#0F172A] cursor-pointer"
            >
              {locale === 'bn' ? 'সব মজুদ দেখুন' : 'Browse All Active Stock'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {queueItems.map((item) => {
              const status = getStockStatus(item);
              const batchValue = item.quantity * item.unitCostBdt;
              const halfQty = Math.min(
                item.quantity,
                Math.max(0.5, Math.round(item.quantity * 0.5 * 10) / 10)
              );
              const urgencyPct = Math.max(
                8,
                Math.min(100, Math.round((1 - Math.min(72, item.hoursUntilExpiry) / 72) * 100))
              );

              return (
                <motion.div
                  key={item.id}
                  layout={!reducedMotion}
                  whileHover={!reducedMotion ? { y: -3 } : undefined}
                  transition={SPRING_SNAPPY}
                  className="rounded-2xl bg-white/90 border border-slate-200/85 p-4 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.14)] flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="glass-icon-cube w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                          <CategoryIcon category={item.category} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-[#0F172A] truncate">
                            {locale === 'bn' ? item.nameBn : item.nameEn}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {CATEGORY_LABELS[item.category][locale]} ·{' '}
                            {formatNum(item.quantity, locale)} {item.unit}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums whitespace-nowrap ${
                          status === 'expired' || item.hoursUntilExpiry <= 16
                            ? 'text-[#DC2626]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {formatShelfLife(item.hoursUntilExpiry, locale)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {locale === 'bn' ? 'মজুদের মূল্য' : 'At-risk value'}
                      </span>
                      <span className="font-bold text-[#0F172A] tabular-nums">
                        {formatBdt(batchValue, locale)}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${urgencyPct}%` }}
                        className={`h-full rounded-full ${
                          item.hoursUntilExpiry <= 16 ? 'bg-red-500' : 'bg-amber-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <WaterRippleButton
                      type="button"
                      soundType="chime"
                      reducedMotion={reducedMotion}
                      onClick={() => onQuickRescue(item, 'rescued_discount', halfQty)}
                      className="flex-1 justify-center px-3 py-1.5 rounded-full bg-[#92E634]/30 hover:bg-[#92E634] border border-[#92E634]/60 text-xs font-bold text-[#0F172A] cursor-pointer whitespace-nowrap"
                    >
                      {locale === 'bn' ? `৫০% উদ্ধার (${halfQty})` : `Rescue 50% (${halfQty})`}
                    </WaterRippleButton>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onOpenRescueModal(item.id);
                      }}
                      className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-[#0F172A] text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
                    >
                      {locale === 'bn' ? 'কাস্টম' : 'Choose'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </LiquidGlassCard>

      {/* Live Rescued Items Log */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[#0F172A]">
            {locale === 'bn' ? 'সম্প্রতি উদ্ধারকৃত খাবারের তালিকা' : 'Live Rescued Items Log'}
          </h3>
          <span className="text-xs font-bold text-[#15803D] tabular-nums">
            {formatBdt(stats.rescuedBdt, locale)}
          </span>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400">
                <th className="pb-1 px-2">{t.colDate}</th>
                <th className="pb-1 px-2">{t.colItem}</th>
                <th className="pb-1 px-2">{locale === 'bn' ? 'প্রবাহ' : 'Trend'}</th>
                <th className="pb-1 px-2 text-right">{t.fieldQty}</th>
                <th className="pb-1 px-2">{locale === 'bn' ? 'মাধ্যম' : 'Channel'}</th>
                <th className="pb-1 px-2 text-right">{locale === 'bn' ? 'রক্ষা' : 'Saved'}</th>
                <th className="pb-1 px-2">{t.colNote}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rescuedLogs.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                    {entry.timestamp}
                  </td>
                  <td className="py-2 px-2 font-semibold text-[#0F172A]">
                    {locale === 'bn' ? entry.itemNameBn : entry.itemNameEn}
                  </td>
                  <td className="py-2 px-2">
                    <InlineRowSparkline
                      seed={entry.id}
                      color="#16A34A"
                      reducedMotion={reducedMotion}
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums whitespace-nowrap">
                      {formatNum(entry.quantity, locale)} {entry.unit}
                    </span>
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <span className="inline-block px-2.5 py-1 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      {DISPOSITION_LABELS[entry.disposition][locale]}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-[#16A34A] whitespace-nowrap">
                    +{formatBdt(entry.valueBdt, locale)}
                  </td>
                  <td className="py-2 px-2 text-xs text-slate-600 max-w-xs">
                    {locale === 'bn' ? entry.noteBn : entry.noteEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LiquidGlassCard>
    </motion.div>
  );
};
