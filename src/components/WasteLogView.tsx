import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { DISPOSITION_LABELS, formatBdt, formatNum, TRANSLATIONS } from '../i18n/translations';
import { Locale, WasteLogEntry } from '../types';
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
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};

export const WasteLogView: React.FC<WasteLogViewProps> = ({
  locale,
  wasteLogs,
  reducedMotion = false,
  onOpenWasteModal,
}) => {
  const t = TRANSLATIONS[locale];
  const [filterType, setFilterType] = useState<'all' | 'rescued' | 'loss'>('all');

  const totals = useMemo(() => {
    let lossBdt = 0;
    let rescuedBdt = 0;
    wasteLogs.forEach((entry) => {
      if (DISPOSITION_LABELS[entry.disposition].isRescue) {
        rescuedBdt += entry.valueBdt;
      } else {
        lossBdt += entry.valueBdt;
      }
    });
    const total = lossBdt + rescuedBdt;
    const rescueRate = total > 0 ? Math.round((rescuedBdt / total) * 100) : 100;
    return { lossBdt, rescuedBdt, rescueRate };
  }, [wasteLogs]);

  const filteredLogs = useMemo(() => {
    return wasteLogs.filter((entry) => {
      const isRescue = DISPOSITION_LABELS[entry.disposition].isRescue;
      if (filterType === 'rescued') return isRescue;
      if (filterType === 'loss') return !isRescue;
      return true;
    });
  }, [wasteLogs, filterType]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* 3 Pastel & Dark Callout Summary Cards with Live Waves */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LiquidGlassCard
          variant="mint"
          hoverLift
          tilt3D
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
          variant="gold"
          hoverLift
          tilt3D
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
          variant="dark-callout"
          hoverLift
          tilt3D
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full w-fit">
          {(
            [
              { key: 'all', label: t.filterAll },
              { key: 'rescued', label: locale === 'bn' ? 'সংরক্ষিত' : 'Rescued' },
              { key: 'loss', label: locale === 'bn' ? 'অপচয় / নষ্ট' : 'Spoilage / Loss' },
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
          soundType="whoosh"
          reducedMotion={reducedMotion}
          onClick={onOpenWasteModal}
          className="glass-lime-accent px-4 py-2 text-xs font-bold text-[#0F172A] rounded-full whitespace-nowrap shrink-0 cursor-pointer w-fit"
        >
          {t.logWaste}
        </WaterRippleButton>
      </div>

      {/* Ledger Table with Inline Sparklines */}
      <LiquidGlassCard variant="panel" reducedMotion={reducedMotion} className="squircle-24 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/70">
          <h3 className="font-display text-lg font-bold text-[#0F172A]">{t.wasteLogTableTitle}</h3>
        </div>

        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400">
                <th className="pb-1 px-2">{t.colDate}</th>
                <th className="pb-1 px-2">{t.colItem}</th>
                <th className="pb-1 px-2">{locale === 'bn' ? 'প্রভাব' : 'Wave'}</th>
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
      </LiquidGlassCard>
    </motion.div>
  );
};
