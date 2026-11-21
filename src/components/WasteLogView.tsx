import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, TrendingDown } from 'lucide-react';
import { DISPOSITION_LABELS, formatBdt, formatNum, TRANSLATIONS } from '../i18n/translations';
import { Locale, WasteDisposition, WasteLogEntry } from '../types';
import {
  InlineRowSparkline,
  KineticCounter,
  LiquidGlassCard,
  SPRING_SNAPPY,
  WaterRippleButton,
} from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface WasteLogViewProps {
  locale: Locale;
  wasteLogs: WasteLogEntry[];
  reducedMotion?: boolean;
  onOpenWasteModal: () => void;
}

const MiniCardWave: React.FC<{ color: string; seed: number; reducedMotion?: boolean }> = ({
  color,
  seed,
  reducedMotion = false,
}) => {
  const pts = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: i * 32 + 4,
    y: 16 + Math.sin(seed + i * 1.1) * 7,
  }));
  const d = pts.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y.toFixed(1)}`;
    const prev = arr[i - 1];
    const cx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x} ${pt.y.toFixed(1)}`;
  }, '');

  return (
    <svg viewBox="0 0 168 30" className="w-full h-7 overflow-visible mt-2">
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

type WasteFilterKey = 'loss' | 'spoiled' | 'prep_trim' | 'overprep' | 'damaged' | 'all';

export const WasteLogView: React.FC<WasteLogViewProps> = ({
  locale,
  wasteLogs,
  reducedMotion = false,
  onOpenWasteModal,
}) => {
  const t = TRANSLATIONS[locale];
  const [filterType, setFilterType] = useState<WasteFilterKey>('loss');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const totals = useMemo(() => {
    let lossBdt = 0;
    let lossQty = 0;
    let lossCount = 0;
    let rescuedBdt = 0;

    wasteLogs.forEach((entry) => {
      if (DISPOSITION_LABELS[entry.disposition].isRescue) {
        rescuedBdt += entry.valueBdt;
      } else {
        lossBdt += entry.valueBdt;
        lossQty += entry.quantity;
        lossCount += 1;
      }
    });
    const total = lossBdt + rescuedBdt;
    const rescueRate = total > 0 ? Math.round((rescuedBdt / total) * 100) : 100;
    return { lossBdt, lossQty, lossCount, rescuedBdt, rescueRate };
  }, [wasteLogs]);

  const wasteByReason = useMemo(() => {
    const reasons: Array<{ key: WasteDisposition; color: string }> = [
      { key: 'spoiled', color: 'bg-red-500' },
      { key: 'overprep', color: 'bg-amber-500' },
      { key: 'prep_trim', color: 'bg-orange-400' },
      { key: 'damaged', color: 'bg-rose-500' },
    ];
    const totalLoss = Math.max(1, totals.lossBdt);
    return reasons.map((r) => {
      const matched = wasteLogs.filter((e) => e.disposition === r.key);
      const val = matched.reduce((s, e) => s + e.valueBdt, 0);
      return {
        key: r.key,
        color: r.color,
        label: DISPOSITION_LABELS[r.key][locale],
        count: matched.length,
        value: val,
        pct: Math.round((val / totalLoss) * 100),
      };
    });
  }, [wasteLogs, totals.lossBdt, locale]);

  const weeklyWasteTrend = useMemo(() => {
    const days =
      locale === 'bn'
        ? ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'আজ']
        : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Today'];
    const baseLoss = Math.max(180, Math.round(totals.lossBdt / 4.2));
    const weights = [0.75, 0.95, 0.6, 1.15, 0.82, 1.05, 0.72];
    const lossSeries = weights.map((w, idx) =>
      idx === 6 ? Math.max(120, Math.round(baseLoss * w + (totals.lossCount - 2) * 85)) : Math.round(baseLoss * w)
    );
    const maxVal = Math.max(...lossSeries, 1);
    return days.map((label, idx) => ({
      label,
      loss: lossSeries[idx],
      pct: Math.max(16, Math.round((lossSeries[idx] / maxVal) * 100)),
    }));
  }, [locale, totals.lossBdt, totals.lossCount]);

  const filteredLogs = useMemo(() => {
    return wasteLogs.filter((entry) => {
      const isRescue = DISPOSITION_LABELS[entry.disposition].isRescue;
      if (filterType === 'loss') return !isRescue;
      if (filterType === 'all') return true;
      return entry.disposition === filterType;
    });
  }, [wasteLogs, filterType]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* 3 Summary Cards with Animated Counters & Sparkwaves */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiquidGlassCard
          variant="gold"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5"
        >
          <p className="text-xs font-semibold text-slate-600">{t.wasteSummaryLoss}</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#DC2626] tabular-nums">
            <KineticCounter
              value={totals.lossBdt}
              locale={locale}
              prefix="৳ "
              reducedMotion={reducedMotion}
            />
          </p>
          <MiniCardWave color="#DC2626" seed={3.4} reducedMotion={reducedMotion} />
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="mint"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5"
        >
          <p className="text-xs font-semibold text-slate-600">{t.wasteSummaryRescued}</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#15803D] tabular-nums">
            <KineticCounter
              value={totals.rescuedBdt}
              locale={locale}
              prefix="৳ "
              reducedMotion={reducedMotion}
            />
          </p>
          <MiniCardWave color="#16A34A" seed={1.2} reducedMotion={reducedMotion} />
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="dark-callout"
          hoverLift
          reducedMotion={reducedMotion}
          className="squircle-24 p-5 text-white"
        >
          <p className="text-xs font-semibold text-slate-300">{t.wasteSummaryRate}</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#92E634] tabular-nums">
            <KineticCounter
              value={totals.rescueRate}
              locale={locale}
              suffix="%"
              reducedMotion={reducedMotion}
            />
          </p>
          <MiniCardWave color="#92E634" seed={5.1} reducedMotion={reducedMotion} />
        </LiquidGlassCard>
      </section>

      {/* Waste Motion Charts: Waste Over Time + Waste by Reason */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-6 squircle-24 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0F172A]">
                {locale === 'bn' ? 'সময়ের সাথে অপচয় (৭ দিন)' : 'Waste Over Time (7 Days)'}
              </h3>
              <p className="text-xs text-slate-500">
                {locale === 'bn'
                  ? 'প্রতিদিনের ক্ষতির পরিমাণ দেখতে বারে হোভার করুন'
                  : 'Hover bars to inspect daily recorded spoilage impact'}
              </p>
            </div>
            <TrendingDown className="w-5 h-5 text-[#DC2626]" />
          </div>

          <div className="h-40 flex items-end justify-between gap-2.5 pt-5">
            {weeklyWasteTrend.map((day, idx) => {
              const isHover = hoveredDay === idx;
              return (
                <div
                  key={day.label}
                  onMouseEnter={() => {
                    setHoveredDay(idx);
                    soundEngine.playTick(idx * 20);
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex-1 h-full flex flex-col items-center justify-end relative cursor-pointer"
                >
                  {isHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-2 px-2 py-0.5 rounded-lg bg-[#141517] text-white text-[10px] font-bold tabular-nums whitespace-nowrap z-10"
                    >
                      -{formatBdt(day.loss, locale)}
                    </motion.div>
                  )}

                  <div className="w-full max-w-[40px] h-28 rounded-2xl bg-slate-100/85 p-1 flex items-end justify-center overflow-hidden">
                    <motion.div
                      initial={reducedMotion ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.45,
                        delay: reducedMotion ? 0 : idx * 0.04,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ height: `${day.pct}%`, transformOrigin: 'bottom' }}
                      className={`w-full rounded-xl transition-colors ${
                        isHover ? 'bg-red-600' : 'bg-red-400/85'
                      }`}
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-semibold text-slate-500">{day.label}</span>
                </div>
              );
            })}
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard
          variant="panel"
          reducedMotion={reducedMotion}
          className="lg:col-span-6 squircle-24 p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F172A]">
                  {locale === 'bn' ? 'কারণ অনুযায়ী অপচয় বিশ্লেষণ' : 'Waste by Reason'}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === 'bn'
                    ? 'কোন কারণে সবচেয়ে বেশি অপচয় হচ্ছে চিহ্নিত করুন'
                    : 'Spot recurring spoilage, prep trim, or overproduction patterns'}
                </p>
              </div>
              <span className="text-xs font-bold text-[#DC2626] tabular-nums">
                {formatNum(totals.lossCount, locale, 0)} {locale === 'bn' ? 'টি ঘটনা' : 'logs'}
              </span>
            </div>

            <div className="space-y-3.5">
              {wasteByReason.map((reason, idx) => (
                <div key={reason.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#0F172A]">{reason.label}</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      {formatBdt(reason.value, locale)} · {formatNum(reason.pct, locale, 0)}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={reducedMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.45,
                        delay: reducedMotion ? 0 : idx * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{
                        width: `${Math.max(4, reason.pct)}%`,
                        transformOrigin: 'left',
                      }}
                      className={`h-full rounded-full ${reason.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LiquidGlassCard>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full w-fit">
          {(
            [
              { key: 'loss', label: locale === 'bn' ? 'সব অপচয়' : 'All Waste' },
              { key: 'spoiled', label: DISPOSITION_LABELS.spoiled[locale] },
              { key: 'prep_trim', label: DISPOSITION_LABELS.prep_trim[locale] },
              { key: 'overprep', label: DISPOSITION_LABELS.overprep[locale] },
              { key: 'damaged', label: DISPOSITION_LABELS.damaged[locale] },
              { key: 'all', label: locale === 'bn' ? 'সব এন্ট্রি' : 'Full Ledger' },
            ] as const
          ).map((opt) => {
            const active = filterType === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  setFilterType(opt.key);
                }}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="waste-filter-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 bg-[#92E634] rounded-full shadow-xs"
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <WaterRippleButton
          type="button"
          soundType="click"
          reducedMotion={reducedMotion}
          onClick={onOpenWasteModal}
          className="bg-[#141517] hover:bg-red-700 px-4 py-2 text-xs font-bold text-white rounded-full whitespace-nowrap shrink-0 cursor-pointer w-fit"
        >
          <Flame className="w-3.5 h-3.5 text-[#92E634]" />
          <span>{t.logWaste}</span>
        </WaterRippleButton>
      </div>

      {/* Ledger Table with Inline Sparklines */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70">
          <h3 className="font-display text-lg font-bold text-[#0F172A]">{t.wasteLogTableTitle}</h3>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            {locale === 'bn'
              ? 'এই ক্যাটাগরিতে কোনো অপচয় নথিভুক্ত নেই।'
              : 'No waste entries recorded for this reason filter yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto p-4 sm:p-5">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400">
                  <th className="pb-1 px-2">{t.colDate}</th>
                  <th className="pb-1 px-2">{t.colItem}</th>
                  <th className="pb-1 px-2">{locale === 'bn' ? 'প্রবাহ' : 'Wave'}</th>
                  <th className="pb-1 px-2 text-right">{t.fieldQty}</th>
                  <th className="pb-1 px-2">{t.colDisposition}</th>
                  <th className="pb-1 px-2 text-right">{t.colImpact}</th>
                  <th className="pb-1 px-2">{t.colNote}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLogs.map((entry) => {
                  const disp = DISPOSITION_LABELS[entry.disposition];
                  return (
                    <tr key={entry.id} className="transition-opacity duration-150">
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {entry.timestamp}
                      </td>
                      <td className="py-2 px-2 font-semibold text-[#0F172A]">
                        {locale === 'bn' ? entry.itemNameBn : entry.itemNameEn}
                      </td>
                      <td className="py-2 px-2">
                        <InlineRowSparkline
                          seed={entry.id}
                          color={disp.isRescue ? '#16A34A' : '#DC2626'}
                          reducedMotion={reducedMotion}
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="glass-pill-cell inline-block px-2.5 py-1 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums whitespace-nowrap">
                          {formatNum(entry.quantity, locale)} {entry.unit}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl border text-xs font-semibold ${
                            disp.isRescue
                              ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                              : 'text-red-700 border-red-200 bg-red-50'
                          }`}
                        >
                          {disp[locale]}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-2 text-right tabular-nums font-bold whitespace-nowrap ${
                          disp.isRescue ? 'text-[#16A34A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {disp.isRescue ? '+' : '-'}
                        {formatBdt(entry.valueBdt, locale)}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-600 max-w-xs">
                        {locale === 'bn' ? entry.noteBn : entry.noteEn}
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
