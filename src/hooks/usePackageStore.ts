import { create } from 'zustand';
import type {
  Package,
  ShelfConfig,
  DailyStats,
  CourierStats,
  ShelfOverview,
  FollowUpRecord,
  BatchEntryItem,
  ShelfLayerDetail,
} from '@/types';
import { DEFAULT_SHELF_CONFIG } from '@/types';
import {
  getPackages,
  savePackages,
  getShelfConfig,
  saveShelfConfig,
  generateId,
  isOverdue,
  isToday,
} from '@/utils/storage';
import { generateShelfNumber, getShelfOverview, isShelfFull, getShelfLayerDetail } from '@/utils/shelf';

interface BatchAddResult {
  success: Package[];
  failed: { item: BatchEntryItem; error: string }[];
}

interface PackageState {
  packages: Package[];
  shelfConfig: ShelfConfig;
  isLoaded: boolean;

  loadData: () => void;

  addPackage: (data: {
    trackingNumber: string;
    recipientName: string;
    phoneLast4: string;
    phoneFull?: string;
    courierCompany: string;
  }) => Package | { error: string };

  batchAddPackages: (items: BatchEntryItem[]) => BatchAddResult;

  pickPackage: (id: string) => void;
  pickPackages: (ids: string[]) => void;

  deletePackage: (id: string) => void;

  searchPackages: (keyword: string) => Package[];

  getDailyStats: () => DailyStats;

  getOverduePackages: () => Package[];

  getCourierStats: (year?: number, month?: number) => CourierStats[];

  updateShelfConfig: (config: ShelfConfig) => void;

  getShelfOverview: () => ShelfOverview;

  isShelfFull: () => boolean;

  addFollowUp: (
    packageId: string,
    data: Omit<FollowUpRecord, 'id' | 'packageId' | 'contactedAt'>
  ) => void;

  getPackageById: (id: string) => Package | undefined;

  getTodayReceivedPackages: () => Package[];

  getShelfLayerDetail: (zone: string, floor: number) => ShelfLayerDetail;
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

    if (isShelfFull(packages, shelfConfig)) {
      return { error: '货架库位已满，请先清理已取件包裹或扩大货架容量' };
    }

    const duplicate = packages.find(
      (p) =>
        p.trackingNumber === data.trackingNumber.trim() && p.status === 'pending'
    );
    if (duplicate) {
      return { error: `该单号已存在，货架号：${duplicate.shelfNumber}` };
    }

    const shelfNumber = generateShelfNumber(packages, shelfConfig);
    if (!shelfNumber) {
      return { error: '货架库位已满，请先清理已取件包裹或扩大货架容量' };
    }

    const newPackage: Package = {
      id: generateId(),
      trackingNumber: data.trackingNumber.trim(),
      recipientName: data.recipientName.trim(),
      phoneLast4: data.phoneLast4,
      phoneFull: data.phoneFull?.trim(),
      courierCompany: data.courierCompany,
      shelfNumber,
      status: 'pending',
      createdAt: Date.now(),
    };
    const updated = [...packages, newPackage];
    set({ packages: updated });
    savePackages(updated);
    return newPackage;
  },

  batchAddPackages: (items) => {
    const { packages, shelfConfig } = get();
    const currentPackages = [...packages];
    const success: Package[] = [];
    const failed: { item: BatchEntryItem; error: string }[] = [];

    for (const item of items) {
      if (isShelfFull(currentPackages, shelfConfig)) {
        failed.push({ item, error: '货架库位已满' });
        continue;
      }

      const duplicate = currentPackages.find(
        (p) =>
          p.trackingNumber === item.trackingNumber.trim() && p.status === 'pending'
      );
      if (duplicate) {
        failed.push({ item, error: `单号已存在，货架号：${duplicate.shelfNumber}` });
        continue;
      }

      if (!item.trackingNumber.trim()) {
        failed.push({ item, error: '快递单号不能为空' });
        continue;
      }
      if (!item.recipientName.trim()) {
        failed.push({ item, error: '收件人姓名不能为空' });
        continue;
      }
      if (!/^\d{4}$/.test(item.phoneLast4)) {
        failed.push({ item, error: '手机尾号格式不正确' });
        continue;
      }

      const shelfNumber = generateShelfNumber(currentPackages, shelfConfig);
      if (!shelfNumber) {
        failed.push({ item, error: '货架库位已满' });
        continue;
      }

      const newPackage: Package = {
        id: generateId(),
        trackingNumber: item.trackingNumber.trim(),
        recipientName: item.recipientName.trim(),
        phoneLast4: item.phoneLast4,
        phoneFull: item.phoneFull?.trim(),
        courierCompany: item.courierCompany,
        shelfNumber,
        status: 'pending',
        createdAt: Date.now(),
      };
      currentPackages.push(newPackage);
      success.push(newPackage);
    }

    set({ packages: currentPackages });
    savePackages(currentPackages);
    return { success, failed };
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

  getShelfOverview: () => {
    const { packages, shelfConfig } = get();
    return getShelfOverview(packages, shelfConfig);
  },

  isShelfFull: () => {
    const { packages, shelfConfig } = get();
    return isShelfFull(packages, shelfConfig);
  },

  addFollowUp: (packageId, data) => {
    const { packages } = get();
    const followUp: FollowUpRecord = {
      id: generateId(),
      packageId,
      contactedAt: Date.now(),
      ...data,
    };

    const updated = packages.map((p) => {
      if (p.id !== packageId) return p;
      const followUps = p.followUps ? [...p.followUps, followUp] : [followUp];
      return { ...p, followUps };
    });

    set({ packages: updated });
    savePackages(updated);
  },

  getPackageById: (id) => {
    const { packages } = get();
    return packages.find((p) => p.id === id);
  },

  getTodayReceivedPackages: () => {
    const { packages } = get();
    return packages
      .filter((p) => isToday(p.createdAt))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getShelfLayerDetail: (zone, floor) => {
    const { packages, shelfConfig } = get();
    return getShelfLayerDetail(packages, shelfConfig, zone, floor);
  },
}));
