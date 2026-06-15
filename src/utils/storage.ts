import type { Package, ShelfConfig, BatchHistoryRecord } from '@/types';
import { DEFAULT_SHELF_CONFIG } from '@/types';

const STORAGE_KEY_PACKAGES = 'package_list';
const STORAGE_KEY_SHELF_CONFIG = 'shelf_config';
const STORAGE_KEY_BATCH_HISTORY = 'batch_history';

export function getPackages(): Package[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PACKAGES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePackages(packages: Package[]): void {
  localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(packages));
}

export function getShelfConfig(): ShelfConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SHELF_CONFIG);
    return data ? JSON.parse(data) : DEFAULT_SHELF_CONFIG;
  } catch {
    return DEFAULT_SHELF_CONFIG;
  }
}

export function saveShelfConfig(config: ShelfConfig): void {
  localStorage.setItem(STORAGE_KEY_SHELF_CONFIG, JSON.stringify(config));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDateShort(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isOverdue(createdAt: number, days = 3): boolean {
  const now = Date.now();
  return now - createdAt > days * 24 * 60 * 60 * 1000;
}

export function getOverdueDays(createdAt: number): number {
  const diff = Date.now() - createdAt;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
}

export function isThisMonth(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth()
  );
}

export function getBatchHistory(): BatchHistoryRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BATCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBatchHistory(history: BatchHistoryRecord[]): void {
  localStorage.setItem(STORAGE_KEY_BATCH_HISTORY, JSON.stringify(history));
}

export function addBatchHistory(record: BatchHistoryRecord): BatchHistoryRecord[] {
  const history = getBatchHistory();
  const updated = [record, ...history].slice(0, 500);
  saveBatchHistory(updated);
  return updated;
}

export function getBatchHistoryByDate(dateStr: string): BatchHistoryRecord[] {
  return getBatchHistory().filter((r) => r.date === dateStr);
}

export function generateBatchNo(): string {
  const now = new Date();
  const prefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `P${prefix}${random}`;
}
