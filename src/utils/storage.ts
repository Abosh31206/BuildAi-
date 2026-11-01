import { CalculationHistoryItem } from '../types/calculator';

const STORAGE_KEY = 'buildai_kz_calc_history_v1';
const MAX_HISTORY_ITEMS = 50;

export function getHistory(): CalculationHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load history from localStorage', err);
    return [];
  }
}

export function saveHistoryItem(item: CalculationHistoryItem): CalculationHistoryItem[] {
  try {
    const current = getHistory();
    // Prepend new item, ensure unique id and cap at MAX_HISTORY_ITEMS
    const updated = [item, ...current.filter((i) => i.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save calculation to localStorage', err);
    return getHistory();
  }
}

export function removeHistoryItem(id: string): CalculationHistoryItem[] {
  try {
    const current = getHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete calculation from localStorage', err);
    return getHistory();
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear history from localStorage', err);
  }
}
