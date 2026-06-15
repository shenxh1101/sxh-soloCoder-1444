export interface Package {
  id: string;
  trackingNumber: string;
  recipientName: string;
  phoneLast4: string;
  courierCompany: string;
  shelfNumber: string;
  status: 'pending' | 'picked';
  createdAt: number;
  pickedAt?: number;
}

export interface ShelfConfig {
  zones: string[];
  floors: number;
  slotsPerFloor: number;
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

export const DEFAULT_SHELF_CONFIG: ShelfConfig = {
  zones: ['A', 'B', 'C'],
  floors: 3,
  slotsPerFloor: 20,
};
