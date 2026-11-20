import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { CATEGORY_LABELS, DISPOSITION_LABELS, TRANSLATIONS } from '../i18n/translations';
import { InventoryCategory, InventoryItem, Locale, WasteDisposition } from '../types';
import { SPRING_SNAPPY, WaterRippleButton } from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface AddStockModalProps {
  open: boolean;
  locale: Locale;
  reducedMotion?: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
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
  const [unitCostBdt, setUnitCostBdt] = useState('120');
  const [minThreshold, setMinThreshold] = useState('5');
  const [hoursUntilExpiry, setHoursUntilExpiry] = useState('48');
  const [supplier, setSupplier] = useState('Karwan Bazar Wholesale');
  const [storageType, setStorageType] = useState<InventoryItem['storageType']>('chilled');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    soundEngine.playChime();
    onSave({
      nameEn: nameEn.trim(),
      nameBn: nameBn.trim() || nameEn.trim(),
      category,
      quantity: Math.max(0.1, parseFloat(quantity) || 1),
      unit,
      minThreshold: Math.max(0, parseFloat(minThreshold) || 1),
      unitCostBdt: Math.max(1, parseFloat(unitCostBdt) || 100),
      hoursUntilExpiry: Math.max(1, parseInt(hoursUntilExpiry, 10) || 24),
      supplierEn: supplier.trim() || 'Local Market',
      supplierBn: supplier.trim() || 'স্থানীয় বাজার',
      storageType,
    });
    setNameEn('');
    setNameBn('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={SPRING_SNAPPY}
            className="glass-panel squircle-24 w-full max-w-lg overflow-hidden text-[#0F172A]"
          >
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0F172A]">{t.modalAddTitle}</h2>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: 90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                aria-label="Close"
                className="p-1.5 text-slate-500 hover:text-[#0F172A] rounded-full hover:bg-white/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldItemNameEn}</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g., Hilsha Fish Cut"
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldItemNameBn}</label>
                  <input
                    type="text"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    placeholder="যেমন: ইলিশ মাছ"
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldCategory}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/90 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {(Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat][locale]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldStorage}</label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value as InventoryItem['storageType'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/90 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="ambient">{t.storageAmbient}</option>
                    <option value="chilled">{t.storageChilled}</option>
                    <option value="frozen">{t.storageFrozen}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldQty}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldUnit}</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as InventoryItem['unit'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/90 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="portions">portions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldCost}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitCostBdt}
                    onChange={(e) => setUnitCostBdt(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldThreshold}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldExpiryHours}</label>
                  <input
                    type="number"
                    min="1"
                    value={hoursUntilExpiry}
                    onChange={(e) => setHoursUntilExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldSupplier}</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
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
                  {t.save}
                </WaterRippleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LogWasteModalProps {
  open: boolean;
  locale: Locale;
  inventory: InventoryItem[];
  reducedMotion?: boolean;
  onClose: () => void;
  onSave: (itemId: string, quantity: number, disposition: WasteDisposition, note: string) => void;
}

export const LogWasteModal: React.FC<LogWasteModalProps> = ({
  open,
  locale,
  inventory,
  reducedMotion = false,
  onClose,
  onSave,
}) => {
  const t = TRANSLATIONS[locale];
  const [itemId, setItemId] = useState(inventory[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [disposition, setDisposition] = useState<WasteDisposition>('rescued_discount');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && !itemId && inventory[0]) {
      setItemId(inventory[0].id);
    }
  }, [open, itemId, inventory]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedItem = inventory.find((i) => i.id === itemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    soundEngine.playChime();
    const qty = Math.max(0.1, parseFloat(quantity) || 1);
    onSave(itemId, qty, disposition, note.trim() || DISPOSITION_LABELS[disposition][locale]);
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
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={SPRING_SNAPPY}
            className="glass-panel squircle-24 w-full max-w-md overflow-hidden text-[#0F172A]"
          >
            <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0F172A]">{t.modalWasteTitle}</h2>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: 90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={() => {
                  soundEngine.playClick();
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldSelectItem}</label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/90 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {locale === 'bn' ? item.nameBn : item.nameEn} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t.fieldQty} {selectedItem ? `(${selectedItem.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldDisposition}</label>
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value as WasteDisposition)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white/90 text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  >
                    {(Object.keys(DISPOSITION_LABELS) as WasteDisposition[]).map((dispKey) => (
                      <option key={dispKey} value={dispKey}>
                        {DISPOSITION_LABELS[dispKey][locale]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.fieldNote}</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={locale === 'bn' ? 'যেমন: সন্ধ্যা ৮টার ছাড়ে বিক্রি' : 'e.g., Evening 25% discount bundle'}
                  className="w-full px-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
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
                  {t.save}
                </WaterRippleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
