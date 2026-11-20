export type Locale = 'en' | 'bn';

export type ViewTab = 'overview' | 'inventory' | 'forecast' | 'waste';

export type InventoryCategory =
  | 'grains'
  | 'proteins'
  | 'produce'
  | 'spices_oil'
  | 'prepared';

export type StockStatus = 'nominal' | 'expiring' | 'low' | 'expired';

export interface InventoryItem {
  id: string;
  nameEn: string;
  nameBn: string;
  category: InventoryCategory;
  quantity: number;
  unit: 'kg' | 'L' | 'pcs' | 'portions';
  minThreshold: number;
  unitCostBdt: number;
  hoursUntilExpiry: number;
  supplierEn: string;
  supplierBn: string;
  storageType: 'ambient' | 'chilled' | 'frozen';
  lastUpdated: string;
}

export interface DishIngredientRequirement {
  inventoryId: string;
  qtyPerPortion: number;
}

export interface DishForecast {
  id: string;
  nameEn: string;
  nameBn: string;
  sellingPriceBdt: number;
  baselineDailyPortions: number;
  actualTodaySold: number;
  ingredients: DishIngredientRequirement[];
}

export interface DayForecastPoint {
  dayKey: string;
  labelEn: string;
  labelBn: string;
  contextEn: string;
  contextBn: string;
  predictedPortions: number;
  optimalPrepPortions: number;
  baselineWasteKg: number;
  projectedSavedBdt: number;
  multiplier: number;
}

export type WasteDisposition = 'spoiled' | 'overprep' | 'rescued_discount' | 'rescued_donation' | 'staff_meal';

export interface WasteLogEntry {
  id: string;
  itemId: string;
  itemNameEn: string;
  itemNameBn: string;
  quantity: number;
  unit: 'kg' | 'L' | 'pcs' | 'portions';
  valueBdt: number;
  disposition: WasteDisposition;
  noteEn: string;
  noteBn: string;
  timestamp: string;
}

export interface OutletProfile {
  id: string;
  nameEn: string;
  nameBn: string;
  neighborhoodEn: string;
  neighborhoodBn: string;
  typeEn: string;
  typeBn: string;
}
