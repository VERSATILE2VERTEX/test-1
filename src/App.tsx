import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
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
import { DISPOSITION_LABELS, TRANSLATIONS } from './i18n/translations';
import {
  InventoryCategory,
  InventoryItem,
  Locale,
  ViewTab,
  WasteDisposition,
  WasteLogEntry,
} from './types';
import { formatShelfLife } from './utils/inventoryUtils';
import { OverviewView } from './components/OverviewView';
import { InventoryView } from './components/InventoryView';
import { ForecastView } from './components/ForecastView';
import { WasteLogView } from './components/WasteLogView';
import { AddStockModal, LogWasteModal } from './components/ActionModals';
import {
  AmbientLightBackdrop,
  ScrollWobbleContainer,
  SPRING_SNAPPY,
  WaterRippleButton,
} from './components/MotionPrimitives';
import { soundEngine } from './utils/soundEngine';
import { LiquidGlassIntro } from './components/LiquidGlassIntro';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
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
    const entry: InventoryItem = {
      ...newItem,
      id: `inv-${Date.now()}`,
      lastUpdated: locale === 'bn' ? 'এইমাত্র' : 'Just now',
    };
    setInventory((prev) => [entry, ...prev]);
  };

  const handleLogWaste = (
    itemId: string,
    qty: number,
    disposition: WasteDisposition,
    note: string
  ) => {
    const target = inventory.find((i) => i.id === itemId);
    if (!target) return;

    const actualQty = Math.min(target.quantity, qty);
    const valueBdt = Math.round(actualQty * target.unitCostBdt);

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
  };

  const handleQuickDisposition = (
    item: InventoryItem,
    disposition: WasteDisposition,
    qty: number
  ) => {
    const note = DISPOSITION_LABELS[disposition][locale];
    handleLogWaste(item.id, qty, disposition, note);
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
  };

  const navItems: Array<{ id: ViewTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'inventory', label: t.navInventory, icon: Package },
    { id: 'forecast', label: t.navForecast, icon: BarChart3 },
    { id: 'waste', label: t.navWaste, icon: ClipboardList },
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label ?? t.navOverview;

  return (
    <div className="relative min-h-screen flex bg-white text-[#0F172A] p-0 lg:p-4 gap-0 lg:gap-4 overflow-x-hidden">
      {/* Crisp White Backdrop with Soft Pastel Refraction Halos */}
      <AmbientLightBackdrop reducedMotion={reducedMotion} />

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Dark Charcoal Left Navigation Rail (Reference Image 1) */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-4 left-0 z-50 h-screen lg:h-[calc(100vh-2rem)] w-64 bg-[#141517] text-white lg:rounded-[28px] border border-slate-800/80 shadow-[0_24px_48px_-18px_rgba(15,23,42,0.28)] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Warm Ivory Squircle Brand Block */}
          <div className="px-5 pt-6 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={!reducedMotion ? { rotate: -6, scale: 1.07 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                transition={SPRING_SNAPPY}
                className="w-11 h-11 rounded-2xl bg-[#F6F1E2] flex items-center justify-center shadow-sm shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-[#141517]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                >
                  <path
                    d="M5 19C5 11.268 11.268 5 19 5C19 12.732 12.732 19 5 19Z"
                    strokeLinejoin="round"
                  />
                  <path d="M7 17L16 8" strokeLinecap="round" />
                </svg>
              </motion.div>
              <div>
                <span className="font-display text-2xl font-bold tracking-wide text-white block leading-none">
                  {t.brandName}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">{t.tagline}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Outlet Switcher */}
          <div className="px-4 pb-4 border-b border-white/10">
            <label htmlFor="outlet-select" className="block text-[11px] font-medium text-slate-400 mb-1.5">
              {t.outletLabel}
            </label>
            <select
              id="outlet-select"
              value={outletId}
              onChange={(e) => {
                soundEngine.playTick(50);
                setOutletId(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-white/8 border border-white/14 rounded-xl text-white focus:outline-none focus:border-[#92E634] cursor-pointer"
            >
              {OUTLETS.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#141517] text-white">
                  {locale === 'bn' ? o.nameBn : o.nameEn}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400 truncate px-0.5">
              {locale === 'bn' ? currentOutlet.neighborhoodBn : currentOutlet.neighborhoodEn}
            </p>
          </div>

          {/* Navigation with Spring Overshoot Icons & Lime Pill */}
          <nav className="p-3 space-y-1.5 mt-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileHover={!reducedMotion ? { x: 4 } : undefined}
                  whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
                  transition={SPRING_SNAPPY}
                  onClick={() => {
                    soundEngine.playTick();
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-[#0F172A]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={SPRING_SNAPPY}
                      className="glass-lime-accent absolute inset-0 rounded-2xl"
                    />
                  )}
                  <motion.span
                    className="relative z-10 inline-flex"
                    animate={
                      isActive && !reducedMotion
                        ? { scale: [1, 1.2, 1], rotate: [0, -6, 0] }
                        : { scale: 1, rotate: 0 }
                    }
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </motion.span>
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <motion.button
            type="button"
            whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
            onClick={() => {
              soundEngine.playChime();
              try {
                sessionStorage.removeItem(INTRO_SESSION_KEY);
              } catch {
                // Ignore storage errors
              }
              setMobileMenuOpen(false);
              setIntroVisible(true);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#92E634] bg-[#92E634]/10 border border-[#92E634]/25 rounded-xl hover:bg-[#92E634]/20 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'ইন্ট্রো পুনরায় দেখুন' : 'Replay Intro'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
            onClick={handleResetDemo}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-300 bg-white/6 border border-white/12 rounded-xl hover:bg-white/12 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDemo}</span>
          </motion.button>
        </div>
      </aside>

      {/* Main White Liquid Glass Collage Frame */}
      <div className="glass-panel relative z-10 flex-1 min-w-0 lg:rounded-[28px] flex flex-col overflow-x-clip">
        {/* Frosted White Header Bar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-2xl border-b border-slate-200/70 lg:rounded-t-[28px] px-4 sm:px-7 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setMobileMenuOpen(true);
              }}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-[#0F172A] rounded-xl hover:bg-slate-100 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-[32px] font-bold tracking-tight text-[#0F172A] truncate leading-none">
                {activeNavLabel}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block mt-1">
                {locale === 'bn' ? currentOutlet.nameBn : currentOutlet.nameEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Expandable Search */}
            <AnimatePresence>
              {headerSearchOpen && (
                <motion.div
                  initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden hidden md:block"
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
              whileHover={!reducedMotion ? { scale: 1.08 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
              onClick={() => {
                soundEngine.playClick();
                setHeaderSearchOpen((prev) => !prev);
                if (!headerSearchOpen && activeTab !== 'inventory') {
                  setActiveTab('inventory');
                }
              }}
              aria-label="Search inventory"
              className={`p-2.5 rounded-full border transition-colors cursor-pointer ${
                headerSearchOpen
                  ? 'bg-[#141517] text-white border-[#141517]'
                  : 'glass-pill-cell text-slate-700 hover:text-[#0F172A]'
              }`}
            >
              <Search className="w-4 h-4" />
            </motion.button>

            {/* Dampened Pendulum Swing Notification Bell */}
            <div className="relative">
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.92 } : undefined}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  soundEngine.playTick(140);
                  setNotificationsOpen((prev) => !prev);
                }}
                aria-label="Expiring item alerts"
                className="glass-pill-cell relative p-2.5 rounded-full text-slate-700 hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <motion.span
                  className="inline-flex"
                  style={{ transformOrigin: 'top center' }}
                  animate={
                    urgentItems.length > 0 && !reducedMotion
                      ? { rotate: [0, -12, 10, -7, 4, 0] }
                      : { rotate: 0 }
                  }
                  transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 6 }}
                >
                  <Bell className="w-4 h-4" />
                </motion.span>
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
                    className="glass-panel squircle-24 absolute right-0 mt-2 w-80 p-4 z-50 bg-white/92"
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
                              setActiveTab('inventory');
                              setInventorySearch(locale === 'bn' ? item.nameBn : item.nameEn);
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

            {/* Sound Mute / Unmute Toggle */}
            <motion.button
              type="button"
              whileHover={!reducedMotion ? { scale: 1.08 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute UI Sounds' : 'Enable UI Sounds'}
              aria-label={soundEnabled ? 'Mute UI Sounds' : 'Enable UI Sounds'}
              aria-pressed={soundEnabled}
              className="glass-pill-cell p-2.5 rounded-full text-slate-700 hover:text-[#0F172A] transition-colors cursor-pointer"
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
              whileHover={!reducedMotion ? { scale: 1.08 } : undefined}
              whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
              onClick={handleToggleMotion}
              title={reducedMotion ? 'Enable Full Motion' : 'Reduce Motion'}
              aria-label={reducedMotion ? 'Enable Full Motion' : 'Reduce Motion'}
              aria-pressed={!reducedMotion}
              className={`glass-pill-cell hidden sm:inline-flex p-2.5 rounded-full transition-colors cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
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
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                  locale === 'bn' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                বাংলা
              </button>
            </div>

            {/* Primary CTA Button with Water Ripple & Sheen */}
            <WaterRippleButton
              type="button"
              soundType="whoosh"
              reducedMotion={reducedMotion}
              onClick={() => setAddModalOpen(true)}
              className="glass-lime-accent px-4 py-2 text-xs font-bold text-[#0F172A] rounded-full whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.addStock.replace(/^\+\s*/, '')}</span>
            </WaterRippleButton>
          </div>
        </header>

        {/* Active Workspace Viewport with Scroll-Linked Jelly Wobble */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
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
                    onOpenWasteModal={() => setWasteModalOpen(true)}
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
                    onOpenWasteModal={() => setWasteModalOpen(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollWobbleContainer>
        </main>
      </div>

      <AddStockModal
        open={addModalOpen}
        locale={locale}
        reducedMotion={reducedMotion}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddStock}
      />

      <LogWasteModal
        open={wasteModalOpen}
        locale={locale}
        inventory={inventory}
        reducedMotion={reducedMotion}
        onClose={() => setWasteModalOpen(false)}
        onSave={handleLogWaste}
      />

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
