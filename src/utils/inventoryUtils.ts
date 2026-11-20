import { formatNum, TRANSLATIONS } from '../i18n/translations';
import { InventoryItem, Locale, StockStatus } from '../types';

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.hoursUntilExpiry <= 0) return 'expired';
  if (item.hoursUntilExpiry <= 24) return 'expiring';
  if (item.quantity <= item.minThreshold) return 'low';
  return 'nominal';
}

export function formatShelfLife(hours: number, locale: Locale): string {
  const t = TRANSLATIONS[locale];
  if (hours <= 0) return t.expiredLabel;
  if (hours < 48) {
    return `${formatNum(hours, locale, 0)}${t.hoursLeft}`;
  }
  const days = Math.floor(hours / 24);
  return `${formatNum(days, locale, 0)}${t.daysLeft}`;
}

export function getStatusLabel(status: StockStatus, locale: Locale): string {
  const t = TRANSLATIONS[locale];
  switch (status) {
    case 'expired':
      return t.filterExpired;
    case 'expiring':
      return t.filterExpiring;
    case 'low':
      return t.filterLow;
    default:
      return t.filterNominal;
  }
}

export function getStatusTextClass(status: StockStatus): string {
  switch (status) {
    case 'expired':
      return 'text-[#DC2626] font-semibold';
    case 'expiring':
      return 'text-[#D97706] font-semibold';
    case 'low':
      return 'text-[#D97706] font-medium';
    default:
      return 'text-[#16A34A] font-medium';
  }
}
