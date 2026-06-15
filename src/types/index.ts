export interface FollowUpRecord {
  id: string;
  packageId: string;
  contactedAt: number;
  result: 'not_answered' | 'will_pick' | 'delayed' | 'return_requested' | 'other';
  note: string;
  nextReminderAt?: number;
}

export interface Package {
  id: string;
  trackingNumber: string;
  recipientName: string;
  phoneLast4: string;
  phoneFull?: string;
  courierCompany: string;
  shelfNumber: string;
  status: 'pending' | 'picked';
  createdAt: number;
  pickedAt?: number;
  followUps?: FollowUpRecord[];
}

export interface ShelfConfig {
  zones: string[];
  floors: number;
  slotsPerFloor: number;
}

export interface ShelfSlotInfo {
  zone: string;
  floor: number;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
}

export interface ShelfOverview {
  totalCapacity: number;
  totalUsed: number;
  totalAvailable: number;
  zoneInfo: Map<string, ShelfSlotInfo[]>;
  isFull: boolean;
}

export interface BatchEntryItem {
  trackingNumber: string;
  recipientName: string;
  phoneLast4: string;
  phoneFull?: string;
  courierCompany: string;
  shelfNumber?: string;
  error?: string;
}

export interface DailyStats {
  todayReceived: number;
  todayPicked: number;
  pendingCount: number;
  overdueCount: number;
}

export interface CourierStats {
  company: string;
  count: number;
}

export const COURIER_COMPANIES = [
  '顺丰速运',
  '中通快递',
  '圆通速递',
  '申通快递',
  '韵达快递',
  '百世快递',
  '京东物流',
  '邮政EMS',
  '极兔速递',
  '德邦快递',
];

export const FOLLOW_UP_RESULT_LABELS: Record<FollowUpRecord['result'], string> = {
  not_answered: '无人接听',
  will_pick: '将尽快取件',
  delayed: '需延迟取件',
  return_requested: '要求退回',
  other: '其他',
};

export const DEFAULT_SHELF_CONFIG: ShelfConfig = {
  zones: ['A', 'B', 'C'],
  floors: 3,
  slotsPerFloor: 20,
};
