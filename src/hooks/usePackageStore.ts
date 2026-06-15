import { create } from 'zustand';
import type { Package, ShelfConfig, DailyStats, CourierStats } from '@/types';
import { DEFAULT_SHELF_CONFIG } from '@/types';
import {
  getPackages,
  savePackages,
  getShelfConfig,
  saveShelfConfig,
  generateId,
  isOverdue,
  isToday,
  isThisMonth,
} from '@/utils/storage';
import { generateShelfNumber } from '@/utils/shelf';

interface PackageState {
  packages: Package[];
  shelfConfig: ShelfConfig;
  isLoaded: boolean;

  loadData: () => void;

  addPackage: (data: {
    trackingNumber: string;
    recipientName: string;
    phoneLast4: string;
    courierCompany: string;
  }) => Package;

  pickPackage: (id: string) => void;
  pickPackages: (ids: string[]) => void;

  deletePackage: (id: string) => void;

  searchPackages: (keyword: string) => Package[];

  getDailyStats: () => DailyStats;

  getOverduePackages: () => Package[];

  getCourierStats: (year?: number, month?: number) => CourierStats[];

  updateShelfConfig: (config: ShelfConfig) => void;
}

export const usePackageStore = create<PackageState>((set, get) => ({
  packages: [],
  shelfConfig: DEFAULT_SHELF_CONFIG,
  isLoaded: false,

  loadData: () => {
    const packages = getPackages();
    const shelfConfig = getShelfConfig();
    set({ packages, shelfConfig, isLoaded: true });
  },

  addPackage: (data) => {
    const { packages, shelfConfig } = get();
    const shelfNumber = generateShelfNumber(packages, shelfConfig);
    const newPackage: Package = {
      id: generateId(),
      ...data,
      shelfNumber,
      status: 'pending',
      createdAt: Date.now(),
    };
    const updated = [...packages, newPackage];
    set({ packages: updated });
    savePackages(updated);
    return newPackage;
  },

  pickPackage: (id) => {
    const { packages } = get();
    const updated = packages.map((p) =>
      p.id === id ? { ...p, status: 'picked' as const, pickedAt: Date.now() } : p
    );
    set({ packages: updated });
    savePackages(updated);
  },

  pickPackages: (ids) => {
    const { packages } = get();
    const idSet = new Set(ids);
    const updated = packages.map((p) =>
      idSet.has(p.id)
        ? { ...p, status: 'picked' as const, pickedAt: Date.now() }
        : p
    );
    set({ packages: updated });
    savePackages(updated);
  },

  deletePackage: (id) => {
    const { packages } = get();
    const updated = packages.filter((p) => p.id !== id);
    set({ packages: updated });
    savePackages(updated);
  },

  searchPackages: (keyword) => {
    const { packages } = get();
    if (!keyword.trim()) {
      return packages.filter((p) => p.status === 'pending');
    }
    const kw = keyword.trim().toLowerCase();
    return packages.filter((p) => {
      if (p.status !== 'pending') return false;
      return (
        p.trackingNumber.toLowerCase().includes(kw) ||
        p.recipientName.toLowerCase().includes(kw) ||
        p.phoneLast4.includes(kw) ||
        p.shelfNumber.toLowerCase().includes(kw)
      );
    });
  },

  getDailyStats: () => {
    const { packages } = get();
    const todayReceived = packages.filter(
      (p) => isToday(p.createdAt)
    ).length;
    const todayPicked = packages.filter(
      (p) => p.status === 'picked' && p.pickedAt && isToday(p.pickedAt)
    ).length;
    const pendingCount = packages.filter((p) => p.status === 'pending').length;
    const overdueCount = packages.filter(
      (p) => p.status === 'pending' && isOverdue(p.createdAt)
    ).length;

    return { todayReceived, todayPicked, pendingCount, overdueCount };
  },

  getOverduePackages: () => {
    const { packages } = get();
    return packages
      .filter((p) => p.status === 'pending' && isOverdue(p.createdAt))
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  getCourierStats: (year, month) => {
    const { packages } = get();
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth();

    const stats: Record<string, number> = {};
    packages.forEach((p) => {
      const date = new Date(p.createdAt);
      if (date.getFullYear() === targetYear && date.getMonth() === targetMonth) {
        stats[p.courierCompany] = (stats[p.courierCompany] || 0) + 1;
      }
    });

    return Object.entries(stats)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count);
  },

  updateShelfConfig: (config) => {
    set({ shelfConfig: config });
    saveShelfConfig(config);
  },
}));
