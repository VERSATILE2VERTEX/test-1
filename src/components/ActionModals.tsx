import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  HeartHandshake,
  PackagePlus,
  Sparkles,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS, DISPOSITION_LABELS, formatBdt, TRANSLATIONS } from '../i18n/translations';
import { InventoryCategory, InventoryItem, Locale, WasteDisposition } from '../types';
import { SPRING_SNAPPY, WaterRippleButton } from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

/* -------------------------------------------------------------------------- */
/* 1. ADD STOCK MODAL (Presets, Validation, Date/Hours Sync & Live Value)     */
/* -------------------------------------------------------------------------- */

interface AddStockModalProps {
  open: boolean;
  locale: Locale;
  reducedMotion?: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
}

interface StockPreset {
  labelEn: string;
  labelBn: string;
  nameEn: string;
  nameBn: string;
  category: InventoryCategory;
  quantity: string;
  unit: InventoryItem['unit'];
  unitCostBdt: string;
  minThreshold: string;
  hoursUntilExpiry: string;
  supplier: string;
  storageType: InventoryItem['storageType'];
}

const STOCK_PRESETS: StockPreset[] = [
  {
    labelEn: 'Hilsha Cut · 8 kg',
    labelBn: 'ইলিশ মাছ · ৮ কেজি',
    nameEn: 'Padma Hilsha Cut',
    nameBn: 'পদ্মার ইলিশ টুকরা',
    category: 'proteins',
    quantity: '8',
    unit: 'kg',
    unitCostBdt: '1150',
    minThreshold: '3',
    hoursUntilExpiry: '20',
    supplier: 'Jatrabari Fish Ghat',
    storageType: 'chilled',
  },
  {
    labelEn: 'Fresh Herbs · 3 kg',
    labelBn: 'ধনেপাতা · ৩ কেজি',
    nameEn: 'Fresh Coriander & Mint',
    nameBn: 'তাজা ধনেপাতা ও পুদিনা',
    category: 'produce',
    quantity: '3',
    unit: 'kg',
    unitCostBdt: '140',
    minThreshold: '1.5',
    hoursUntilExpiry: '16',
    supplier: 'Karwan Bazar Morning Lot',
    storageType: 'chilled',
  },
  {
    labelEn: 'Kacchi Batch · 20 p',
    labelBn: 'কাচ্চি ব্যাচ · ২০ প্লেট',
    nameEn: 'Prepared Kacchi Portions',
    nameBn: 'প্রস্তুত কাচ্চি ব্যাচ',
    category: 'prepared',
    quantity: '20',
    unit: 'portions',
    unitCostBdt: '220',
    minThreshold: '10',
    hoursUntilExpiry: '10',
    supplier: 'In-House Central Prep',
    storageType: 'chilled',
  },
  {
    labelEn: 'Chinigura Rice · 25 kg',
    labelBn: 'চিনিগুঁড়া চাল · ২৫ কেজি',
    nameEn: 'Chinigura Aromatic Rice',
    nameBn: 'চিনিগুঁড়া পোলাও চাল',
    category: 'grains',
    quantity: '25',
    unit: 'kg',
    unitCostBdt: '155',
    minThreshold: '15',
    hoursUntilExpiry: '720',
    supplier: 'Dinajpur Agro Mill',
    storageType: 'ambient',
  },
];

function computeBestBeforeDateInput(hours: number): string {
  const safeHours = Math.max(1, hours || 24);
  const d = new Date(Date.now() + safeHours * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  open,
  locale,
  reducedMotion = false,
  onClose,
  onSave,
}) => {
  const t = TRANSLATIONS[locale];
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('produce');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState<InventoryItem['unit']>('kg');
  const [unitCostBdt, setUnitCostBdt] = useState('140');
  const [minThreshold, setMinThreshold] = useState('4');
  const [hoursUntilExpiry, setHoursUntilExpiry] = useState('48');
  const [supplier, setSupplier] = useState('Karwan Bazar Wholesale');
  const [storageType, setStorageType] = useState<InventoryItem['storageType']>('chilled');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      soundEngine.playGlassPop();
      setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundEngine.playGlassPop();
        onClose();
      }
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const applyPreset = (p: StockPreset) => {
    soundEngine.playTick(70);
    setNameEn(p.nameEn);
    setNameBn(p.nameBn);
    setCategory(p.category);
    setQuantity(p.quantity);
    setUnit(p.unit);
    setUnitCostBdt(p.unitCostBdt);
    setMinThreshold(p.minThreshold);
    setHoursUntilExpiry(p.hoursUntilExpiry);
    setSupplier(p.supplier);
    setStorageType(p.storageType);
    setErrorMsg(null);
  };

  const parsedQty = parseFloat(quantity);
  const parsedCost = parseFloat(unitCostBdt);
  const parsedHours = parseInt(hoursUntilExpiry, 10);
  const liveTotalBdt =
    Number.isFinite(parsedQty) && parsedQty > 0 && Number.isFinite(parsedCost) && parsedCost > 0
      ? parsedQty * parsedCost
      : 0;

  const freshnessLabel =
    !Number.isFinite(parsedHours) || parsedHours <= 0
      ? locale === 'bn'
        ? 'মেয়াদোত্তীর্ণ'
        : 'Expired'
      : parsedHours <= 24
      ? locale === 'bn'
        ? 'শীঘ্রই মেয়াদ শেষ'
        : 'Expiring Soon'
      : locale === 'bn'
      ? 'সতেজ / স্বাভাবিক'
      : 'Fresh / Healthy';

  const handleDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const targetMs = new Date(`${dateStr}T23:59:00`).getTime();
    const diffHours = Math.max(1, Math.round((targetMs - Date.now()) / (3600 * 1000)));
    setHoursUntilExpiry(String(diffHours));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) {
      setErrorMsg(locale === 'bn' ? 'অনুগ্রহ করে আইটেমের নাম লিখুন।' : 'Please enter an item or batch name.');
      soundEngine.playWasteThud();
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setErrorMsg(locale === 'bn' ? 'সঠিক পরিমাণ (০-এর বেশি) দিন।' : 'Quantity must be greater than 0.');
      soundEngine.playWasteThud();
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
      setErrorMsg(locale === 'bn' ? 'সঠিক একক মূল্য দিন।' : 'Unit cost must be greater than ৳0.');
      soundEngine.playWasteThud();
      return;
    }

    soundEngine.playClick();
    onSave({
      nameEn: nameEn.trim(),
      nameBn: nameBn.trim() || nameEn.trim(),
      category,
      quantity: Math.round(parsedQty * 10) / 10,
      unit,
      minThreshold: Math.max(0, parseFloat(minThreshold) || 1),
      unitCostBdt: Math.round(parsedCost),
      hoursUntilExpiry: Math.max(1, Number.isFinite(parsedHours) ? parsedHours : 24),
      supplierEn: supplier.trim() || 'Local Market',
      supplierBn: supplier.trim() || 'স্থানীয় বাজার',
      storageType,
    });
    setNameEn('');
    setNameBn('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => {
            soundEngine.playGlassPop();
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={t.modalAddTitle}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel squircle-24 w-full max-w-xl overflow-hidden text-[#0F172A] my-auto"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="glass-lime-accent w-8 h-8 rounded-xl flex items-center justify-center">
                  <PackagePlus className="w-4 h-4 text-[#0F172A]" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0F172A] leading-tight">
                    {t.modalAddTitle}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'bn'
                      ? 'প্রিসেট বাটনে ট্যাপ করুন অথবা কাস্টম তথ্য লিখুন'
                      : 'Tap a quick preset or enter custom stock details'}
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: 90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={() => {
                  soundEngine.playGlassPop();
                  onClose();
                }}
                aria-label="Close"
                className="p-1.5 text-slate-500 hover:text-[#0F172A] rounded-full hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 text-sm">
              {/* Quick Preset Chips */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                  {locale === 'bn' ? 'দ্রুত প্রিসেট' : 'Quick Presets'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STOCK_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.labelEn}
                      type="button"
                      whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
                      whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
                      onClick={() => applyPreset(preset)}
                      className="px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 hover:border-[#92E634] hover:bg-[#92E634]/15 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {locale === 'bn' ? preset.labelBn : preset.labelEn}
                    </motion.button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldItemNameEn} *
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => {
                      setNameEn(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g., Sonali Chicken"
                    className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldItemNameBn}
                  </label>
                  <input
                    type="text"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="যেমন: সোনালী মুরগি"
                    className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldCategory}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/95 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat][locale]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldStorage}
                  </label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value as InventoryItem['storageType'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/95 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ambient">{t.storageAmbient}</option>
                    <option value="chilled">{t.storageChilled}</option>
                    <option value="frozen">{t.storageFrozen}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldQty} *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldUnit}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as InventoryItem['unit'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/95 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="portions">portions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldCost} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={unitCostBdt}
                    onChange={(e) => {
                      setUnitCostBdt(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              {/* Expiry Quick-Select + Best Before Date + Hours + Supplier */}
              <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {locale === 'bn' ? 'মেয়াদ / সতেজতা নির্ধারণ' : 'Freshness & Shelf-Life'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { h: 12, label: '12h' },
                      { h: 24, label: '24h' },
                      { h: 48, label: '48h' },
                      { h: 168, label: '7d' },
                      { h: 720, label: '30d' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setHoursUntilExpiry(String(opt.h));
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                          Number(hoursUntilExpiry) === opt.h
                            ? 'bg-[#92E634] text-[#0F172A]'
                            : 'bg-white border border-slate-200 text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t.fieldExpiryHours}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={hoursUntilExpiry}
                      onChange={(e) => setHoursUntilExpiry(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {locale === 'bn' ? 'মেয়াদের তারিখ' : 'Best-Before Date'}
                    </label>
                    <input
                      type="date"
                      value={computeBestBeforeDateInput(parsedHours)}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t.fieldThreshold}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fieldSupplier}
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* Live Batch Value Preview + Footer */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/70">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="font-bold text-[#0F172A] tabular-nums">
                    {formatBdt(liveTotalBdt, locale)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span
                    className={`font-semibold ${
                      parsedHours <= 24 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {freshnessLabel}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playGlassPop();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-full hover:bg-white cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <WaterRippleButton
                    type="submit"
                    soundType="click"
                    reducedMotion={reducedMotion}
                    className="glass-lime-accent px-5 py-2 text-xs font-bold text-[#0F172A] rounded-full cursor-pointer"
                  >
                    {t.save}
                  </WaterRippleButton>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. RESCUE MODAL (Surplus & Near-Expiry Recovery Action)                    */
/* -------------------------------------------------------------------------- */

interface RescueModalProps {
  open: boolean;
  locale: Locale;
  inventory: InventoryItem[];
  preselectedItemId?: string | null;
  reducedMotion?: boolean;
  onClose: () => void;
  onRescue: (
    itemId: string,
    quantity: number,
    channel: 'rescued_discount' | 'rescued_donation' | 'staff_meal' | 'meal_prep',
    note: string
  ) => void;
}

const RESCUE_CHANNELS: Array<{
  key: 'rescued_discount' | 'staff_meal' | 'rescued_donation' | 'meal_prep';
  labelEn: string;
  labelBn: string;
}> = [
  { key: 'rescued_discount', labelEn: '25% Discount', labelBn: '২৫% ছাড়ে বিক্রি' },
  { key: 'staff_meal', labelEn: 'Staff Meal', labelBn: 'স্টাফ মিল' },
  { key: 'rescued_donation', labelEn: 'Community', labelBn: 'কমিউনিটি দান' },
  { key: 'meal_prep', labelEn: 'Meal Prep', labelBn: 'মিল প্রেপ' },
];

export const RescueModal: React.FC<RescueModalProps> = ({
  open,
  locale,
  inventory,
  preselectedItemId,
  reducedMotion = false,
  onClose,
  onRescue,
}) => {
  const t = TRANSLATIONS[locale];
  const availableItems = inventory.filter((i) => i.quantity > 0);
  const [itemId, setItemId] = useState(preselectedItemId || availableItems[0]?.id || '');
  const [quantity, setQuantity] = useState('2');
  const [channel, setChannel] =
    useState<(typeof RESCUE_CHANNELS)[number]['key']>('rescued_discount');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    soundEngine.playGlassPop();
    const targetId =
      (preselectedItemId && availableItems.some((i) => i.id === preselectedItemId)
        ? preselectedItemId
        : availableItems[0]?.id) ?? '';
    setItemId(targetId);
    const matched = availableItems.find((i) => i.id === targetId);
    if (matched) {
      setQuantity(String(Math.min(matched.quantity, Math.max(1, Math.round(matched.quantity * 0.5 * 10) / 10))));
    }
    setNote('');
  }, [open, preselectedItemId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundEngine.playGlassPop();
        onClose();
      }
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedItem = availableItems.find((i) => i.id === itemId) ?? availableItems[0];
  const qtyNum = Math.min(selectedItem?.quantity ?? 0, Math.max(0.1, parseFloat(quantity) || 0));
  const savedBdt = Math.round(qtyNum * (selectedItem?.unitCostBdt ?? 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || qtyNum <= 0) return;
    soundEngine.playChime();
    onRescue(
      selectedItem.id,
      qtyNum,
      channel,
      note.trim() || DISPOSITION_LABELS[channel][locale]
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => {
            soundEngine.playGlassPop();
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.modalRescueTitle}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel squircle-24 w-full max-w-md overflow-hidden text-[#0F172A]"
          >
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4 text-emerald-700" />
                </span>
                <h2 className="font-display text-lg font-bold text-[#0F172A]">
                  {t.modalRescueTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playGlassPop();
                  onClose();
                }}
                aria-label="Close"
                className="p-1.5 text-slate-500 hover:text-[#0F172A] rounded-full hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fieldSelectItem}
                </label>
                <select
                  value={selectedItem?.id ?? ''}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setItemId(nextId);
                    const nextItem = availableItems.find((i) => i.id === nextId);
                    if (nextItem) {
                      setQuantity(
                        String(
                          Math.min(
                            nextItem.quantity,
                            Math.max(1, Math.round(nextItem.quantity * 0.5 * 10) / 10)
                          )
                        )
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/95 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {locale === 'bn' ? item.nameBn : item.nameEn} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    {t.fieldQty} {selectedItem ? `(${selectedItem.unit})` : ''}
                  </label>
                  {selectedItem && (
                    <div className="flex gap-1">
                      {[0.25, 0.5, 1].map((ratio) => {
                        const val = Math.max(
                          0.1,
                          Math.round(selectedItem.quantity * ratio * 10) / 10
                        );
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => {
                              soundEngine.playTick();
                              setQuantity(String(val));
                            }}
                            className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-[#92E634]/40 text-[11px] font-bold text-slate-700 cursor-pointer"
                          >
                            {ratio === 1 ? (locale === 'bn' ? 'সব' : 'All') : `${ratio * 100}%`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedItem?.quantity ?? undefined}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {locale === 'bn' ? 'উদ্ধারের মাধ্যম' : 'Rescue Channel'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESCUE_CHANNELS.map((ch) => {
                    const active = channel === ch.key;
                    return (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setChannel(ch.key);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#92E634]/25 border-[#92E634] text-[#0F172A]'
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        {locale === 'bn' ? ch.labelBn : ch.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fieldNote}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    locale === 'bn' ? 'যেমন: সন্ধ্যা ৮টার ছাড়ে বিক্রি' : 'e.g., Evening 25% flash special'
                  }
                  className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-200/70">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15803D] tabular-nums">
                  <Sparkles className="w-3.5 h-3.5" />
                  {locale === 'bn' ? 'রক্ষা হবে:' : 'Saves:'} {formatBdt(savedBdt, locale)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playGlassPop();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-full hover:bg-white cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <WaterRippleButton
                    type="submit"
                    soundType="chime"
                    reducedMotion={reducedMotion}
                    className="glass-lime-accent px-5 py-2 text-xs font-bold text-[#0F172A] rounded-full cursor-pointer"
                  >
                    {locale === 'bn' ? 'উদ্ধার নিশ্চিত করুন' : 'Confirm Rescue'}
                  </WaterRippleButton>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. LOG WASTE MODAL (Reason Tags, Impact Preview & Soft Waste Thud)         */
/* -------------------------------------------------------------------------- */

interface LogWasteModalProps {
  open: boolean;
  locale: Locale;
  inventory: InventoryItem[];
  preselectedItemId?: string | null;
  reducedMotion?: boolean;
  onClose: () => void;
  onSave: (itemId: string, quantity: number, disposition: WasteDisposition, note: string) => void;
}

const WASTE_REASON_TAGS: Array<{
  key: 'spoiled' | 'prep_trim' | 'overprep' | 'damaged';
  labelEn: string;
  labelBn: string;
}> = [
  { key: 'spoiled', labelEn: 'Expired / Spoiled', labelBn: 'মেয়াদোত্তীর্ণ / নষ্ট' },
  { key: 'prep_trim', labelEn: 'Prep Trim', labelBn: 'প্রস্তুতি ছাঁটাই' },
  { key: 'overprep', labelEn: 'Overproduction', labelBn: 'অতিরিক্ত উৎপাদন' },
  { key: 'damaged', labelEn: 'Damaged', labelBn: 'ক্ষতিগ্রস্ত' },
];

export const LogWasteModal: React.FC<LogWasteModalProps> = ({
  open,
  locale,
  inventory,
  preselectedItemId,
  reducedMotion = false,
  onClose,
  onSave,
}) => {
  const t = TRANSLATIONS[locale];
  const availableItems = inventory.filter((i) => i.quantity > 0);
  const [itemId, setItemId] = useState(preselectedItemId || availableItems[0]?.id || '');
  const [quantity, setQuantity] = useState('1');
  const [disposition, setDisposition] = useState<WasteDisposition>('spoiled');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    soundEngine.playGlassPop();
    const targetId =
      (preselectedItemId && availableItems.some((i) => i.id === preselectedItemId)
        ? preselectedItemId
        : availableItems[0]?.id) ?? '';
    setItemId(targetId);
    setQuantity('1');
    setDisposition('spoiled');
    setNote('');
  }, [open, preselectedItemId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundEngine.playGlassPop();
        onClose();
      }
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedItem = availableItems.find((i) => i.id === itemId) ?? availableItems[0];
  const qtyNum = Math.min(selectedItem?.quantity ?? 0, Math.max(0.1, parseFloat(quantity) || 0));
  const impactBdt = Math.round(qtyNum * (selectedItem?.unitCostBdt ?? 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || qtyNum <= 0) return;
    soundEngine.playWasteThud();
    onSave(
      selectedItem.id,
      qtyNum,
      disposition,
      note.trim() || DISPOSITION_LABELS[disposition][locale]
    );
    setNote('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => {
            soundEngine.playGlassPop();
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.modalWasteTitle}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel squircle-24 w-full max-w-md overflow-hidden text-[#0F172A]"
          >
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-red-600" />
                </span>
                <h2 className="font-display text-lg font-bold text-[#0F172A]">
                  {t.modalWasteTitle}
                </h2>
              </div>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: 90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={() => {
                  soundEngine.playGlassPop();
                  onClose();
                }}
                aria-label="Close"
                className="p-1.5 text-slate-500 hover:text-[#0F172A] rounded-full hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fieldSelectItem}
                </label>
                <select
                  value={selectedItem?.id ?? ''}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/95 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {locale === 'bn' ? item.nameBn : item.nameEn} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">
                    {t.fieldQty} {selectedItem ? `(${selectedItem.unit})` : ''}
                  </label>
                  {selectedItem && (
                    <div className="flex gap-1">
                      {[0.5, 1, 2, selectedItem.quantity].map((val, i) => {
                        const clamped = Math.min(selectedItem.quantity, val);
                        return (
                          <button
                            key={`${val}-${i}`}
                            type="button"
                            onClick={() => {
                              soundEngine.playTick();
                              setQuantity(String(Math.round(clamped * 10) / 10));
                            }}
                            className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-red-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                          >
                            {i === 3 ? (locale === 'bn' ? 'সব' : 'All') : clamped}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedItem?.quantity ?? undefined}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {locale === 'bn' ? 'অপচয়ের কারণ' : 'Waste Reason Tag'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WASTE_REASON_TAGS.map((tag) => {
                    const active = disposition === tag.key;
                    return (
                      <button
                        key={tag.key}
                        type="button"
                        onClick={() => {
                          soundEngine.playTick();
                          setDisposition(tag.key);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-white/80 border-slate-200 text-slate-600 hover:text-[#0F172A]'
                        }`}
                      >
                        {locale === 'bn' ? tag.labelBn : tag.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fieldNote}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'যেমন: চিলার সমস্যায় পাতা নষ্ট'
                      : 'e.g., Leaf wilt or prep trim discard'
                  }
                  className="w-full px-3 py-2 bg-white/95 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-200/70">
                <span className="text-xs font-bold text-[#DC2626] tabular-nums">
                  {locale === 'bn' ? 'ক্ষতি:' : 'Impact:'} -{formatBdt(impactBdt, locale)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playGlassPop();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-full hover:bg-white cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.96 } : undefined}
                    className="px-5 py-2 text-xs font-bold bg-[#141517] hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                  >
                    {locale === 'bn' ? 'অপচয় লিখুন' : 'Record Waste'}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
