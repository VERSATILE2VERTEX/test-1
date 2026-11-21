import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Info,
  LayoutDashboard,
  MessageSquare,
  Package,
  Plus,
  RotateCcw,
  Search,
  Undo2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  INITIAL_DISHES,
  INITIAL_INVENTORY,
  INITIAL_WASTE_LOGS,
  OUTLETS,
} from './data/initialData';
import { DISPOSITION_LABELS, formatBdt, TRANSLATIONS } from './i18n/translations';
import {
  InventoryCategory,
  InventoryItem,
  Locale,
  ToastActionMessage,
  ViewTab,
  WasteDisposition,
  WasteLogEntry,
} from './types';
import { formatShelfLife } from './utils/inventoryUtils';
import { OverviewView } from './components/OverviewView';
import { InventoryView } from './components/InventoryView';
import { RescueView } from './components/RescueView';
import { ForecastView } from './components/ForecastView';
import { WasteLogView } from './components/WasteLogView';
import { AddStockModal, LogWasteModal, RescueModal } from './components/ActionModals';
import { AboutGuideFooter } from './components/AboutGuideFooter';
import {
  AmbientLightBackdrop,
  ScrollWobbleContainer,
  SPRING_SNAPPY,
  WaterRippleButton,
} from './components/MotionPrimitives';
import { soundEngine } from './utils/soundEngine';
import { LiquidGlassIntro } from './components/LiquidGlassIntro';
import { KhadokChatWidget, KitchenChatContext } from './components/KhadokChatWidget';
import { MagnificationDock, DockItemData } from './components/MagnificationDock';

const STORAGE_KEY = 'khadok_workspace_v3';
const INTRO_SESSION_KEY = 'khadok_intro_seen';

interface PersistedState {
  locale: Locale;
  outletId: string;
  inventory: InventoryItem[];
  wasteLogs: WasteLogEntry[];
  forecastMultiplier: number;
  watchedIds: string[];
  reducedMotion: boolean;
}

function loadInitialState(): PersistedState {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('khadok_workspace_v2') ??
      localStorage.getItem('khadok_workspace_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.inventory && parsed.wasteLogs) {
        return {
          locale: parsed.locale === 'bn' ? 'bn' : 'en',
          outletId: parsed.outletId ?? OUTLETS[0].id,
          inventory: parsed.inventory,
          wasteLogs: parsed.wasteLogs,
          forecastMultiplier:
            typeof parsed.forecastMultiplier === 'number' ? parsed.forecastMultiplier : 1.15,
          watchedIds: Array.isArray(parsed.watchedIds)
            ? parsed.watchedIds
            : ['inv-2', 'inv-3', 'inv-8'],
          reducedMotion:
            typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : Boolean(prefersReduced),
        };
      }
    }
  } catch {
    // Fall back to default state on storage errors
  }

  return {
    locale: 'en',
    outletId: OUTLETS[0].id,
    inventory: INITIAL_INVENTORY,
    wasteLogs: INITIAL_WASTE_LOGS,
    forecastMultiplier: 1.15,
    watchedIds: ['inv-2', 'inv-3', 'inv-8'],
    reducedMotion: Boolean(prefersReduced),
  };
}

export default function App() {
  const [initial] = useState<PersistedState>(() => loadInitialState());
  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [outletId, setOutletId] = useState<string>(initial.outletId);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [inventory, setInventory] = useState<InventoryItem[]>(initial.inventory);
  const [wasteLogs, setWasteLogs] = useState<WasteLogEntry[]>(initial.wasteLogs);
  const [forecastMultiplier, setForecastMultiplier] = useState<number>(initial.forecastMultiplier);
  const [watchedIds, setWatchedIds] = useState<string[]>(initial.watchedIds);
  const [reducedMotion, setReducedMotion] = useState<boolean>(initial.reducedMotion);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEngine.isEnabled());

  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | InventoryCategory>('all');
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [rescueModalState, setRescueModalState] = useState<{
    open: boolean;
    itemId: string | null;
  }>({ open: false, itemId: null });
  const [wasteModalState, setWasteModalState] = useState<{
    open: boolean;
    itemId: string | null;
  }>({ open: false, itemId: null });
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<ToastActionMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [introVisible, setIntroVisible] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [revealKey, setRevealKey] = useState(0);

  const t = TRANSLATIONS[locale];
  const currentOutlet = OUTLETS.find((o) => o.id === outletId) ?? OUTLETS[0];

  const urgentItems = inventory
    .filter((i) => i.hoursUntilExpiry <= 24 && i.quantity > 0)
    .sort((a, b) => a.hoursUntilExpiry - b.hoursUntilExpiry);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [locale, reducedMotion]);

  useEffect(() => {
    if (!introVisible) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }, [introVisible]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        locale,
        outletId,
        inventory,
        wasteLogs,
        forecastMultiplier,
        watchedIds,
        reducedMotion,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [locale, outletId, inventory, wasteLogs, forecastMultiplier, watchedIds, reducedMotion]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((nextToast: ToastActionMessage) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(nextToast);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 5500);
  }, []);

  const handleUndoToast = () => {
    if (!toast) return;
    soundEngine.playToggle(true);
    setInventory(toast.prevInventory);
    setWasteLogs(toast.prevWasteLogs);
    setToast(null);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundEngine.setEnabled(next);
    setSoundEnabled(next);
  };

  const handleToggleMotion = () => {
    soundEngine.playClick();
    setReducedMotion((prev) => !prev);
  };

  const handleToggleWatch = (itemId: string) => {
    setWatchedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleAdjustQuantity = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.max(0, Math.round((item.quantity + delta) * 10) / 10),
              lastUpdated: locale === 'bn' ? 'এইমাত্র' : 'Just now',
            }
          : item
      )
    );
  };

  const handleAddStock = (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const prevInventorySnapshot = inventory;
    const prevWasteSnapshot = wasteLogs;

    const entry: InventoryItem = {
      ...newItem,
      id: `inv-${Date.now()}`,
      lastUpdated: locale === 'bn' ? 'এইমাত্র' : 'Just now',
    };
    setInventory((prev) => [entry, ...prev]);

    const itemLabel = locale === 'bn' ? entry.nameBn : entry.nameEn;
    showToast({
      id: `toast-${Date.now()}`,
      kind: 'stock',
      title: locale === 'bn' ? `মজুদ যোগ হয়েছে: ${itemLabel}` : `Added Stock: ${itemLabel}`,
      subtitle: `${entry.quantity} ${entry.unit} · ${formatBdt(
        entry.quantity * entry.unitCostBdt,
        locale
      )}`,
      prevInventory: prevInventorySnapshot,
      prevWasteLogs: prevWasteSnapshot,
    });
  };

  const handleLogWasteOrRescue = (
    itemId: string,
    qty: number,
    disposition: WasteDisposition,
    note: string
  ) => {
    const target = inventory.find((i) => i.id === itemId);
    if (!target || target.quantity <= 0) return;

    const prevInventorySnapshot = inventory;
    const prevWasteSnapshot = wasteLogs;
    const actualQty = Math.min(target.quantity, qty);
    const valueBdt = Math.round(actualQty * target.unitCostBdt);
    const isRescue = DISPOSITION_LABELS[disposition].isRescue;

    const newLog: WasteLogEntry = {
      id: `wl-${Date.now()}`,
      itemId: target.id,
      itemNameEn: target.nameEn,
      itemNameBn: target.nameBn,
      quantity: actualQty,
      unit: target.unit,
      valueBdt,
      disposition,
      noteEn: note,
      noteBn: note,
      timestamp: locale === 'bn' ? 'আজ, এইমাত্র' : 'Today, now',
    };

    setWasteLogs((prev) => [newLog, ...prev]);
    setInventory((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? {
              ...item,
              quantity: Math.max(0, Math.round((item.quantity - actualQty) * 10) / 10),
              lastUpdated: locale === 'bn' ? 'এইমাত্র' : 'Just now',
            }
          : item
      )
    );

    const itemLabel = locale === 'bn' ? target.nameBn : target.nameEn;
    showToast({
      id: `toast-${Date.now()}`,
      kind: isRescue ? 'rescue' : 'waste',
      title: isRescue
        ? locale === 'bn'
          ? `উদ্ধার সম্পন্ন: ${itemLabel}`
          : `Rescued: ${itemLabel}`
        : locale === 'bn'
        ? `অপচয় নথিভুক্ত: ${itemLabel}`
        : `Logged Waste: ${itemLabel}`,
      subtitle: `${actualQty} ${target.unit} · ${isRescue ? '+' : '-'}${formatBdt(
        valueBdt,
        locale
      )}`,
      prevInventory: prevInventorySnapshot,
      prevWasteLogs: prevWasteSnapshot,
    });
  };

  const handleQuickDisposition = (
    item: InventoryItem,
    disposition: WasteDisposition,
    qty: number
  ) => {
    const note = DISPOSITION_LABELS[disposition][locale];
    if (DISPOSITION_LABELS[disposition].isRescue) {
      soundEngine.playChime();
    } else {
      soundEngine.playWasteThud();
    }
    handleLogWasteOrRescue(item.id, qty, disposition, note);
  };

  const handleReplayIntro = () => {
    soundEngine.playGlassPop();
    try {
      sessionStorage.removeItem(INTRO_SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
    setIntroVisible(true);
  };

  const handleResetDemo = () => {
    soundEngine.playChime();
    setInventory(INITIAL_INVENTORY);
    setWasteLogs(INITIAL_WASTE_LOGS);
    setForecastMultiplier(1.15);
    setOutletId(OUTLETS[0].id);
    setWatchedIds(['inv-2', 'inv-3', 'inv-8']);
    setInventorySearch('');
    setCategoryFilter('all');
    setToast(null);
  };

  const navItems: Array<{ id: ViewTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'inventory', label: t.navInventory, icon: Package },
    { id: 'rescue', label: t.navRescue, icon: HeartHandshake },
    { id: 'waste', label: t.navWaste, icon: ClipboardList },
    { id: 'forecast', label: t.navForecast, icon: BarChart3 },
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label ?? t.navOverview;

  return (
    <div className="relative min-h-screen flex flex-col bg-white text-[#0F172A] p-0 sm:p-3 lg:p-4 overflow-x-clip">
      {/* Crisp White Backdrop with Soft Pastel Refraction Halos */}
      <AmbientLightBackdrop reducedMotion={reducedMotion} />

      {/* Main White Liquid Glass Collage Frame */}
      <div className="glass-panel relative z-10 flex-1 min-w-0 sm:rounded-[28px] flex flex-col overflow-x-clip">
        {/* Frosted White Top Utility Header */}
        <header className="sticky top-0 z-30 bg-white/88 backdrop-blur-2xl border-b border-slate-200/70 sm:rounded-t-[28px] px-3.5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Left: Brand Emblem + View Title + Outlet Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { rotate: -6, scale: 1.06 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
              transition={SPRING_SNAPPY}
              onClick={() => {
                soundEngine.playTick();
                setActiveTab('overview');
              }}
              aria-label={t.brandName}
              className="w-10 h-10 rounded-2xl bg-[#141517] flex items-center justify-center shadow-sm shrink-0 cursor-pointer border border-white"
            >
              <div className="w-7 h-7 rounded-xl bg-[#F6F1E2] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-[#141517]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path
                    d="M5 19C5 11.268 11.268 5 19 5C19 12.732 12.732 19 5 19Z"
                    strokeLinejoin="round"
                  />
                  <path d="M7 17L16 8" strokeLinecap="round" />
                </svg>
              </div>
            </motion.button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#0F172A] leading-none whitespace-nowrap">
                  {t.brandName}
                </span>
                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-600 truncate leading-none hidden sm:block">
                  {activeNavLabel}
                </h1>
              </div>

              {/* Compact Kitchen Outlet Switcher */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <select
                  id="outlet-select"
                  aria-label={t.outletLabel}
                  value={outletId}
                  onChange={(e) => {
                    soundEngine.playTick(50);
                    setOutletId(e.target.value);
                  }}
                  className="max-w-[165px] sm:max-w-[240px] truncate bg-transparent text-[11px] font-semibold text-slate-500 hover:text-[#0F172A] focus:outline-none cursor-pointer"
                >
                  {OUTLETS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {locale === 'bn' ? o.nameBn : o.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* GPU-only Expandable Search */}
            <AnimatePresence>
              {headerSearchOpen && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.92, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: 10 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="hidden md:block w-48"
                >
                  <input
                    type="text"
                    autoFocus
                    value={inventorySearch}
                    onChange={(e) => {
                      setInventorySearch(e.target.value);
                      if (activeTab !== 'inventory') setActiveTab('inventory');
                    }}
                    placeholder={t.searchPlaceholder}
                    className="w-full px-3.5 py-1.5 text-xs bg-white/95 border border-slate-200 rounded-full text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.07 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
              onClick={() => {
                soundEngine.playClick();
                setHeaderSearchOpen((prev) => !prev);
                if (!headerSearchOpen && activeTab !== 'inventory') {
                  setActiveTab('inventory');
                }
              }}
              aria-label="Search inventory"
              className={`hidden sm:inline-flex p-2.5 rounded-full border transition-colors cursor-pointer ${
                headerSearchOpen
                  ? 'bg-[#141517] text-white border-[#141517]'
                  : 'glass-pill-cell text-slate-700 hover:text-[#0F172A]'
              }`}
            >
              <Search className="w-4 h-4" />
            </motion.button>

            {/* Expiry Notification Bell */}
            <div className="relative">
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { scale: 1.07, rotate: -10 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  soundEngine.playTick(140);
                  setNotificationsOpen((prev) => !prev);
                }}
                aria-label="Expiring item alerts"
                className="glass-pill-cell relative p-2 sm:p-2.5 rounded-full text-slate-700 hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {urgentItems.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444]" />
                )}
              </motion.button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={SPRING_SNAPPY}
                    className="glass-panel squircle-24 absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] p-4 z-50 bg-white/95"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {locale === 'bn' ? 'জরুরি সতর্কতা (২৪ ঘণ্টা)' : '24h Expiry Alerts'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs text-slate-500 hover:text-[#0F172A] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {urgentItems.length === 0 ? (
                      <p className="py-4 text-xs text-slate-600">{t.allCaughtUp}</p>
                    ) : (
                      <div className="divide-y divide-slate-200/60 max-h-60 overflow-y-auto">
                        {urgentItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setNotificationsOpen(false);
                              setActiveTab('rescue');
                            }}
                            className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 rounded-lg px-1.5 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#0F172A] truncate">
                                {locale === 'bn' ? item.nameBn : item.nameEn}
                              </p>
                              <p className="text-[11px] font-semibold text-[#D97706] tabular-nums">
                                {formatShelfLife(item.hoursUntilExpiry, locale)} · {item.quantity}{' '}
                                {item.unit}
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info / Replay Intro Trigger */}
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.05 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
              onClick={handleReplayIntro}
              title={locale === 'bn' ? 'অ্যাপ পরিচিতি দেখুন' : 'About / Replay Intro'}
              aria-label={locale === 'bn' ? 'অ্যাপ পরিচিতি দেখুন' : 'About / Replay Intro'}
              className="glass-pill-cell inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-full text-xs font-bold text-[#0F172A] hover:border-[#92E634] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="hidden lg:inline">
                {locale === 'bn' ? 'তথ্য' : 'Info'}
              </span>
            </motion.button>

            {/* Reset Demo Data */}
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.07, rotate: -30 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
              onClick={handleResetDemo}
              title={t.resetDemo}
              aria-label={t.resetDemo}
              className="glass-pill-cell hidden sm:inline-flex p-2.5 rounded-full text-slate-600 hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>

            {/* Sound Mute / Unmute Toggle */}
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.07 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute UI Sounds' : 'Enable UI Sounds'}
              aria-label={soundEnabled ? 'Mute UI Sounds' : 'Enable UI Sounds'}
              aria-pressed={soundEnabled}
              className="glass-pill-cell p-2 sm:p-2.5 rounded-full text-slate-700 hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </motion.button>

            {/* Reduced Motion Toggle */}
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.07 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              onClick={handleToggleMotion}
              title={reducedMotion ? 'Enable Full Motion' : 'Reduce Motion'}
              aria-label={reducedMotion ? 'Enable Full Motion' : 'Reduce Motion'}
              aria-pressed={!reducedMotion}
              className={`glass-pill-cell hidden md:inline-flex p-2.5 rounded-full transition-colors cursor-pointer ${
                !reducedMotion ? 'text-[#16A34A]' : 'text-slate-400'
              }`}
            >
              <Activity className="w-4 h-4" />
            </motion.button>

            {/* EN | বাংলা Switcher */}
            <div
              className="inline-flex items-center p-0.5 bg-slate-100/90 border border-slate-200/80 rounded-full"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  setLocale('en');
                }}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  locale === 'en' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTick();
                  setLocale('bn');
                }}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  locale === 'bn' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                বাংলা
              </button>
            </div>

            {/* Primary + Add Stock CTA */}
            <WaterRippleButton
              type="button"
              soundType="whoosh"
              reducedMotion={reducedMotion}
              onClick={() => setAddModalOpen(true)}
              className="glass-lime-accent px-3 sm:px-4 py-2 text-xs font-bold text-[#0F172A] rounded-full whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.addStock.replace(/^\+\s*/, '')}</span>
            </WaterRippleButton>
          </div>
        </header>

        {/* Active Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-28 max-w-[1360px] w-full mx-auto">
          <ScrollWobbleContainer reducedMotion={reducedMotion}>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key={`overview-${revealKey}`}
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <OverviewView
                    locale={locale}
                    inventory={inventory}
                    dishes={INITIAL_DISHES}
                    wasteLogs={wasteLogs}
                    forecastMultiplier={forecastMultiplier}
                    watchedIds={watchedIds}
                    reducedMotion={reducedMotion}
                    onToggleWatch={handleToggleWatch}
                    onQuickDisposition={handleQuickDisposition}
                    onQuickRestock={handleAdjustQuantity}
                    onNavigate={(tab) => {
                      soundEngine.playTick();
                      setActiveTab(tab);
                    }}
                    onSelectCategory={(cat) => {
                      setCategoryFilter(cat);
                      setActiveTab('inventory');
                    }}
                    onOpenWasteModal={() => setWasteModalState({ open: true, itemId: null })}
                  />
                </motion.div>
              )}

              {activeTab === 'inventory' && (
                <motion.div
                  key="inventory"
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <InventoryView
                    locale={locale}
                    inventory={inventory}
                    search={inventorySearch}
                    onSearchChange={setInventorySearch}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    watchedIds={watchedIds}
                    reducedMotion={reducedMotion}
                    onToggleWatch={handleToggleWatch}
                    onAdjustQuantity={handleAdjustQuantity}
                    onOpenAddModal={() => setAddModalOpen(true)}
                    onOpenRescueForItem={(id) => setRescueModalState({ open: true, itemId: id })}
                    onOpenWasteForItem={(id) => setWasteModalState({ open: true, itemId: id })}
                  />
                </motion.div>
              )}

              {activeTab === 'rescue' && (
                <motion.div
                  key="rescue"
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RescueView
                    locale={locale}
                    inventory={inventory}
                    wasteLogs={wasteLogs}
                    reducedMotion={reducedMotion}
                    onQuickRescue={(item, channel, qty) => {
                      handleQuickDisposition(item, channel, qty);
                    }}
                    onOpenRescueModal={(id) =>
                      setRescueModalState({ open: true, itemId: id ?? null })
                    }
                  />
                </motion.div>
              )}

              {activeTab === 'waste' && (
                <motion.div
                  key="waste"
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <WasteLogView
                    locale={locale}
                    wasteLogs={wasteLogs}
                    reducedMotion={reducedMotion}
                    onOpenWasteModal={() => setWasteModalState({ open: true, itemId: null })}
                  />
                </motion.div>
              )}

              {activeTab === 'forecast' && (
                <motion.div
                  key="forecast"
                  initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ForecastView
                    locale={locale}
                    dishes={INITIAL_DISHES}
                    inventory={inventory}
                    multiplier={forecastMultiplier}
                    reducedMotion={reducedMotion}
                    onChangeMultiplier={setForecastMultiplier}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom About & Quick Guide Recap */}
            <AboutGuideFooter
              locale={locale}
              reducedMotion={reducedMotion}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAddStock={() => setAddModalOpen(true)}
              onReplayIntro={handleReplayIntro}
            />
          </ScrollWobbleContainer>
        </main>
      </div>

      {/* Add Stock, Rescue & Log Waste Modals */}
      <AddStockModal
        open={addModalOpen}
        locale={locale}
        reducedMotion={reducedMotion}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddStock}
      />

      <RescueModal
        open={rescueModalState.open}
        locale={locale}
        inventory={inventory}
        preselectedItemId={rescueModalState.itemId}
        reducedMotion={reducedMotion}
        onClose={() => setRescueModalState({ open: false, itemId: null })}
        onRescue={(itemId, qty, channel, note) => {
          handleLogWasteOrRescue(itemId, qty, channel, note);
        }}
      />

      <LogWasteModal
        open={wasteModalState.open}
        locale={locale}
        inventory={inventory}
        preselectedItemId={wasteModalState.itemId}
        reducedMotion={reducedMotion}
        onClose={() => setWasteModalState({ open: false, itemId: null })}
        onSave={handleLogWasteOrRescue}
      />

      {/* Liquid-Glass Confirmation & Undo Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={SPRING_SNAPPY}
            role="status"
            aria-live="polite"
            className="glass-panel squircle-24 fixed bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 w-[calc(100vw-2rem)] sm:w-96 px-4 py-3 flex items-center justify-between gap-3 bg-white/95 shadow-[0_20px_48px_-14px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className={`w-4.5 h-4.5 shrink-0 ${
                  toast.kind === 'waste' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0F172A] truncate">{toast.title}</p>
                <p className="text-[11px] font-semibold text-slate-500 tabular-nums truncate">
                  {toast.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleUndoToast}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#92E634]/30 hover:bg-[#92E634] text-[11px] font-bold text-[#0F172A] transition-colors cursor-pointer"
              >
                <Undo2 className="w-3 h-3" />
                <span>{locale === 'bn' ? 'পূর্বাবস্থায়' : 'Undo'}</span>
              </button>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
                className="p-1 text-slate-400 hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(() => {
        const totalStockValueBdt = inventory.reduce(
          (sum, i) => sum + i.quantity * i.unitCostBdt,
          0
        );
        const rescuedValueBdt = wasteLogs
          .filter((w) => DISPOSITION_LABELS[w.disposition].isRescue)
          .reduce((sum, w) => sum + w.valueBdt, 0);
        const lossValueBdt = wasteLogs
          .filter((w) => !DISPOSITION_LABELS[w.disposition].isRescue)
          .reduce((sum, w) => sum + w.valueBdt, 0);

        const kitchenContext: KitchenChatContext = {
          locale,
          outletName: locale === 'bn' ? currentOutlet.nameBn : currentOutlet.nameEn,
          forecastMultiplier,
          totalStockValueBdt,
          rescuedValueBdt,
          lossValueBdt,
          urgentItems: urgentItems.slice(0, 6).map((i) => ({
            name: locale === 'bn' ? i.nameBn : i.nameEn,
            quantity: i.quantity,
            unit: i.unit,
            hoursLeft: i.hoursUntilExpiry,
            valueBdt: Math.round(i.quantity * i.unitCostBdt),
          })),
          allInventory: inventory.map((i) => ({
            name: locale === 'bn' ? i.nameBn : i.nameEn,
            category: i.category,
            quantity: i.quantity,
            unit: i.unit,
            hoursLeft: i.hoursUntilExpiry,
            minThreshold: i.minThreshold,
            valueBdt: Math.round(i.quantity * i.unitCostBdt),
          })),
          topDishes: INITIAL_DISHES.map((d) => ({
            name: locale === 'bn' ? d.nameBn : d.nameEn,
            targetPortions: Math.round(d.baselineDailyPortions * forecastMultiplier),
            sellingPriceBdt: d.sellingPriceBdt,
          })),
          recentWasteLogs: wasteLogs.slice(0, 6).map((w) => ({
            item: locale === 'bn' ? w.itemNameBn : w.itemNameEn,
            disposition: DISPOSITION_LABELS[w.disposition][locale],
            quantity: w.quantity,
            unit: w.unit,
            valueBdt: w.valueBdt,
          })),
        };

        const dockItems: DockItemData[] = [
          {
            icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            label: t.navOverview,
            active: activeTab === 'overview',
            onClick: () => setActiveTab('overview'),
          },
          {
            icon: <Package className="w-[18px] h-[18px]" />,
            label: t.navInventory,
            active: activeTab === 'inventory',
            onClick: () => setActiveTab('inventory'),
          },
          {
            icon: <HeartHandshake className="w-[18px] h-[18px]" />,
            label: t.navRescue,
            active: activeTab === 'rescue',
            onClick: () => setActiveTab('rescue'),
          },
          {
            icon: <ClipboardList className="w-[18px] h-[18px]" />,
            label: t.navWaste,
            active: activeTab === 'waste',
            onClick: () => setActiveTab('waste'),
          },
          {
            icon: <BarChart3 className="w-[18px] h-[18px]" />,
            label: t.navForecast,
            active: activeTab === 'forecast',
            onClick: () => setActiveTab('forecast'),
          },
          {
            icon: <Plus className="w-[18px] h-[18px]" />,
            label: t.addStock.replace(/^\+\s*/, ''),
            onClick: () => setAddModalOpen(true),
          },
          {
            icon: <MessageSquare className="w-[18px] h-[18px]" />,
            label: locale === 'bn' ? 'খাদক AI' : 'KHADOK AI',
            accent: true,
            active: chatOpen,
            onClick: () => setChatOpen((prev) => !prev),
          },
        ];

        return (
          <>
            {!introVisible && (
              <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[45] max-w-[calc(100vw-1rem)] pointer-events-auto">
                <MagnificationDock
                  items={dockItems}
                  reducedMotion={reducedMotion}
                />
              </div>
            )}

            <KhadokChatWidget
              locale={locale}
              inventory={inventory}
              kitchenContext={kitchenContext}
              reducedMotion={reducedMotion}
              hidden={introVisible}
              isOpen={chatOpen}
              onOpenChange={setChatOpen}
            />
          </>
        );
      })()}

      {introVisible && (
        <LiquidGlassIntro
          locale={locale}
          reducedMotion={reducedMotion}
          onRevealDashboard={() => setRevealKey((k) => k + 1)}
          onComplete={() => {
            try {
              sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
            } catch {
              // Ignore storage errors
            }
            setIntroVisible(false);
          }}
        />
      )}
    </div>
  );
}
