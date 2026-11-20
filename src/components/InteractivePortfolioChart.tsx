import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Droplets, MoreVertical } from 'lucide-react';
import { formatBdt, formatNum } from '../i18n/translations';
import { Locale } from '../types';
import { KineticCounter, LiquidGlassCard, SPRING_SNAPPY, WaterRippleButton } from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

type Timeframe = '1H' | '24H' | '1W' | '1M' | '1Y' | 'ALL';

interface ChartPoint {
  labelEn: string;
  labelBn: string;
  valueBdt: number;
  portions: number;
}

interface InteractivePortfolioChartProps {
  locale: Locale;
  totalStockValue: number;
  rescuedValueWeek: number;
  rescueRatePercent: number;
  forecastMultiplier: number;
  reducedMotion?: boolean;
  onJumpToForecast: () => void;
}

export const InteractivePortfolioChart: React.FC<InteractivePortfolioChartProps> = ({
  locale,
  totalStockValue,
  rescuedValueWeek,
  rescueRatePercent,
  forecastMultiplier,
  reducedMotion = false,
  onJumpToForecast,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1W');
  const [activeIndex, setActiveIndex] = useState<number>(5);
  const svgRef = useRef<SVGSVGElement>(null);

  const seriesByTimeframe = useMemo<Record<Timeframe, ChartPoint[]>>(() => {
    const base = Math.max(12000, Math.round(totalStockValue));
    const mult = forecastMultiplier;

    return {
      '1H': [
        { labelEn: '10m', labelBn: '১০ মি.', valueBdt: Math.round(base * 0.96), portions: 12 },
        { labelEn: '20m', labelBn: '২০ মি.', valueBdt: Math.round(base * 0.98), portions: 18 },
        { labelEn: '30m', labelBn: '৩০ মি.', valueBdt: Math.round(base * 0.95), portions: 24 },
        { labelEn: '40m', labelBn: '৪০ মি.', valueBdt: Math.round(base * 1.01), portions: 31 },
        { labelEn: '50m', labelBn: '৫০ মি.', valueBdt: Math.round(base * 0.99), portions: 35 },
        { labelEn: 'Now', labelBn: 'এখন', valueBdt: base, portions: 42 },
      ],
      '24H': [
        { labelEn: '08:00', labelBn: 'সকাল ৮টা', valueBdt: Math.round(base * 0.86), portions: 42 },
        { labelEn: '11:00', labelBn: 'বেলা ১১টা', valueBdt: Math.round(base * 0.93), portions: 78 },
        { labelEn: '13:30', labelBn: 'দুপুর ১:৩০', valueBdt: Math.round(base * 0.89), portions: 145 },
        { labelEn: '16:00', labelBn: 'বিকাল ৪টা', valueBdt: Math.round(base * 0.91), portions: 68 },
        { labelEn: '19:30', labelBn: 'সন্ধ্যা ৭:৩০', valueBdt: Math.round(base * 0.98 * mult * 0.9), portions: 162 },
        { labelEn: '21:00', labelBn: 'রাত ৯টা', valueBdt: Math.round(base * 1.03), portions: 38 },
        { labelEn: 'Now', labelBn: 'এখন', valueBdt: base, portions: 28 },
      ],
      '1W': [
        { labelEn: 'Sat', labelBn: 'শনি', valueBdt: Math.round(base * 0.81), portions: 242 },
        { labelEn: 'Sun', labelBn: 'রবি', valueBdt: Math.round(base * 0.86), portions: 218 },
        { labelEn: 'Mon', labelBn: 'সোম', valueBdt: Math.round(base * 0.84), portions: 230 },
        { labelEn: 'Tue', labelBn: 'মঙ্গল', valueBdt: Math.round(base * 0.92), portions: 194 },
        { labelEn: 'Wed', labelBn: 'বুধ', valueBdt: Math.round(base * 0.90), portions: 215 },
        { labelEn: 'Thu', labelBn: 'বৃহঃ', valueBdt: Math.round(base * 0.98), portions: 288 },
        { labelEn: 'Fri Rush', labelBn: 'শুক্র', valueBdt: Math.round(base * (1.0 + (mult - 1) * 0.2)), portions: 342 },
      ],
      '1M': [
        { labelEn: 'W1', labelBn: 'সপ্তাহ ১', valueBdt: Math.round(base * 0.71), portions: 1380 },
        { labelEn: 'W2', labelBn: 'সপ্তাহ ২', valueBdt: Math.round(base * 0.79), portions: 1490 },
        { labelEn: 'W3', labelBn: 'সপ্তাহ ৩', valueBdt: Math.round(base * 0.85), portions: 1620 },
        { labelEn: 'W4', labelBn: 'সপ্তাহ ৪', valueBdt: Math.round(base * 0.95), portions: 1740 },
        { labelEn: 'Current', labelBn: 'চলতি', valueBdt: base, portions: 1810 },
      ],
      '1Y': [
        { labelEn: 'Q1', labelBn: 'প্রথম ত্রৈমাসিক', valueBdt: Math.round(base * 0.58), portions: 14200 },
        { labelEn: 'Q2', labelBn: 'দ্বিতীয় ত্রৈমাসিক', valueBdt: Math.round(base * 0.72), portions: 16800 },
        { labelEn: 'Q3', labelBn: 'তৃতীয় ত্রৈমাসিক', valueBdt: Math.round(base * 0.84), portions: 19200 },
        { labelEn: 'Q4', labelBn: 'চতুর্থ ত্রৈমাসিক', valueBdt: base, portions: 21500 },
      ],
      ALL: [
        { labelEn: 'Jul', labelBn: 'জুলাই', valueBdt: Math.round(base * 0.62), portions: 4900 },
        { labelEn: 'Aug', labelBn: 'আগস্ট', valueBdt: Math.round(base * 0.70), portions: 5250 },
        { labelEn: 'Sep', labelBn: 'সেপ্টেম্বর', valueBdt: Math.round(base * 0.78), portions: 5840 },
        { labelEn: 'Oct', labelBn: 'অক্টোবর', valueBdt: Math.round(base * 0.91), portions: 6410 },
        { labelEn: 'Nov', labelBn: 'নভেম্বর', valueBdt: base, portions: 6890 },
      ],
    };
  }, [totalStockValue, forecastMultiplier]);

  const points = seriesByTimeframe[timeframe];
  const safeIndex = Math.min(activeIndex, points.length - 1);
  const activePoint = points[safeIndex];

  const width = 460;
  const height = 136;
  const padX = 12;
  const padTop = 20;
  const padBottom = 14;

  const minVal = Math.min(...points.map((p) => p.valueBdt)) * 0.9;
  const maxVal = Math.max(...points.map((p) => p.valueBdt)) * 1.05;
  const span = Math.max(1, maxVal - minVal);

  const buildCurve = (offsetRatio = 0) => {
    const coords = points.map((p, i) => {
      const x = padX + (i / Math.max(1, points.length - 1)) * (width - padX * 2);
      const yBase = padTop + (1 - (p.valueBdt - minVal) / span) * (height - padTop - padBottom);
      const waveOffset = Math.sin(i * 1.4 + offsetRatio * 3) * (offsetRatio * 12);
      const y = Math.min(height - 6, Math.max(8, yBase + waveOffset + offsetRatio * 8));
      return { x, y };
    });

    const path = coords.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      const prev = arr[i - 1];
      const cx = ((prev.x + pt.x) / 2).toFixed(1);
      return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    return { coords, path };
  };

  const primaryCurve = buildCurve(0);
  const echoCurve = buildCurve(0.7);
  const areaPath = `${primaryCurve.path} L ${primaryCurve.coords[primaryCurve.coords.length - 1].x.toFixed(1)} ${height} L ${primaryCurve.coords[0].x.toFixed(1)} ${height} Z`;
  const activeCoord = primaryCurve.coords[safeIndex];

  const handleScrub = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (points.length - 1));
    if (idx !== safeIndex) {
      soundEngine.playTick((idx - 3) * 45);
      setActiveIndex(idx);
    }
  };

  const timeframes: Timeframe[] = ['1H', '24H', '1W', '1M', '1Y', 'ALL'];
  const combinedPortfolio = totalStockValue + rescuedValueWeek;

  return (
    <div className="relative flex flex-col h-full">
      {/* Overlapping Vibrant Lime Accent Shelf Behind Bottom Edge (Liquid Glass Collage Layering) */}
      <div className="glass-lime-accent squircle-28 overflow-hidden flex flex-col justify-between h-full">
        {/* Ice-Blue Frosted Liquid Glass Hero Card */}
        <LiquidGlassCard
          variant="hero-blue"
          tilt3D
          reducedMotion={reducedMotion}
          className="squircle-28 p-5 sm:p-6 flex flex-col justify-between flex-1"
        >
          {/* Floating Droplet Highlight Accent */}
          <div
            className={`pointer-events-none absolute top-4 right-14 w-7 h-7 rounded-full bg-white/75 border border-white shadow-sm flex items-center justify-center ${
              reducedMotion ? '' : 'droplet-float'
            }`}
            aria-hidden="true"
          >
            <Droplets className="w-3.5 h-3.5 text-sky-500" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-4xl sm:text-[42px] font-bold tracking-tight text-[#0F172A] leading-none">
                <KineticCounter
                  value={combinedPortfolio}
                  locale={locale}
                  prefix="৳ "
                  reducedMotion={reducedMotion}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-600 flex items-center gap-2">
                <span>
                  {locale === 'bn'
                    ? 'সক্রিয় মজুদ ও সাপ্তাহিক সাশ্রয়'
                    : 'Portfolio stock & rescued value'}
                </span>
                <span className="text-[#16A34A] font-bold">
                  +{formatNum(12.4, locale, 1)}%
                </span>
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onJumpToForecast();
              }}
              whileHover={!reducedMotion ? { scale: 1.1, rotate: 90 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              transition={SPRING_SNAPPY}
              aria-label="Open forecast calibration"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/75 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Multi-layered Spline/Area SVG Chart */}
          <div className="relative mt-4 mb-2 select-none">
            {/* Magnetic Floating Dark Glass Callout Tooltip (Reference Image 1) */}
            <motion.div
              animate={{
                left: `${Math.max(12, Math.min(88, (activeCoord.x / width) * 100))}%`,
                top: `${Math.max(12, (activeCoord.y / height) * 100 - 16)}%`,
              }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }
              }
              className="pointer-events-none absolute z-20"
            >
              <div className="-translate-x-1/2 -translate-y-full px-3 py-1 rounded-full bg-[#141619] text-white border border-white/20 text-[11px] font-bold whitespace-nowrap shadow-[0_10px_22px_-6px_rgba(15,23,42,0.4)] flex items-center gap-1.5">
                <span>{formatBdt(activePoint.valueBdt, locale)}</span>
                <span className="text-[#92E634] text-[10px]">
                  {locale === 'bn' ? activePoint.labelBn : activePoint.labelEn}
                </span>
              </div>
            </motion.div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-32 overflow-visible cursor-crosshair touch-none"
              onPointerMove={(e) => handleScrub(e.clientX)}
              onPointerDown={(e) => handleScrub(e.clientX)}
            >
              <defs>
                <linearGradient id="whiteModeBlueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <line x1={padX} y1={height * 0.35} x2={width - padX} y2={height * 0.35} stroke="#93C5FD" strokeOpacity="0.45" strokeDasharray="3 4" />
              <line x1={padX} y1={height * 0.72} x2={width - padX} y2={height * 0.72} stroke="#93C5FD" strokeOpacity="0.45" strokeDasharray="3 4" />

              {/* Harmonic Echo Wave */}
              <motion.path
                key={`echo-${timeframe}`}
                d={echoCurve.path}
                fill="none"
                stroke="#92E634"
                strokeOpacity="0.6"
                strokeWidth="1.6"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Area Fill */}
              <motion.path
                key={`area-${timeframe}`}
                d={areaPath}
                fill="url(#whiteModeBlueFill)"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45 }}
              />

              {/* Primary Glowing Spline */}
              <motion.path
                key={`line-${timeframe}`}
                d={primaryCurve.path}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Vertical Scrub Line & Cursor */}
              <motion.line
                animate={{ x1: activeCoord.x, x2: activeCoord.x }}
                transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                y1={activeCoord.y}
                y2={height}
                stroke="#60A5FA"
                strokeWidth="1.4"
                strokeDasharray="3 3"
              />
              <motion.circle
                animate={{ cx: activeCoord.x, cy: activeCoord.y }}
                transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                r="9"
                fill="#3B82F6"
                fillOpacity="0.2"
              />
              <motion.circle
                animate={{ cx: activeCoord.x, cy: activeCoord.y }}
                transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                r="4.5"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* 6 Timeframe Pills (1H, 24H, 1W, 1M, 1Y, ALL) */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-1">
              {timeframes.map((tf) => {
                const isActive = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      soundEngine.playChime();
                      setTimeframe(tf);
                      setActiveIndex(seriesByTimeframe[tf].length - 1);
                    }}
                    className={`relative px-2 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                      isActive ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="chart-timeframe-pill"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 bg-white rounded-full shadow-xs border border-white"
                      />
                    )}
                    <span className="relative z-10">{tf}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
              {formatNum(activePoint.portions, locale, 0)}{' '}
              {locale === 'bn' ? 'প্লেট' : 'portions'}
            </span>
          </div>
        </LiquidGlassCard>

        {/* Layered Vibrant Lime Accent Bottom Shelf */}
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-bold tracking-tight text-[#0F172A]">
              <KineticCounter
                value={rescueRatePercent}
                locale={locale}
                suffix="%"
                reducedMotion={reducedMotion}
              />
            </span>
            <span className="text-xs font-semibold text-[#1A2E05]/85">
              {locale === 'bn' ? 'অপচয় রোধের হার' : 'Waste Prevented'}
            </span>
          </div>

          <WaterRippleButton
            type="button"
            soundType="chime"
            reducedMotion={reducedMotion}
            onClick={onJumpToForecast}
            className="px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white text-[#0F172A] text-xs font-bold shadow-xs hover:bg-white cursor-pointer"
          >
            <span>{locale === 'bn' ? 'পূর্বাভাস' : 'Forecast'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </WaterRippleButton>
        </div>
      </div>
    </div>
  );
};
