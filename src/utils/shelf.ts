import type { Package, ShelfConfig, ShelfOverview, ShelfSlotInfo, ShelfLayerDetail, ShelfSlotPackage } from '@/types';

export function generateShelfNumber(
  packages: Package[],
  config: ShelfConfig
): string | null {
  const { zones, floors, slotsPerFloor } = config;
  const usedShelves = new Set(
    packages.filter((p) => p.status === 'pending').map((p) => p.shelfNumber)
  );

  for (const zone of zones) {
    for (let floor = 1; floor <= floors; floor++) {
      for (let slot = 1; slot <= slotsPerFloor; slot++) {
        const shelfNumber = `${zone}-${floor}-${String(slot).padStart(2, '0')}`;
        if (!usedShelves.has(shelfNumber)) {
          return shelfNumber;
        }
      }
    }
  }

  return null;
}

export function isShelfFull(
  packages: Package[],
  config: ShelfConfig
): boolean {
  const totalCapacity = config.zones.length * config.floors * config.slotsPerFloor;
  const usedCount = packages.filter((p) => p.status === 'pending').length;
  return usedCount >= totalCapacity;
}

export function getShelfOverview(
  packages: Package[],
  config: ShelfConfig
): ShelfOverview {
  const { zones, floors, slotsPerFloor } = config;
  const pendingPackages = packages.filter((p) => p.status === 'pending');
  const usedShelves = new Set(pendingPackages.map((p) => p.shelfNumber));

  const totalCapacity = zones.length * floors * slotsPerFloor;
  const totalUsed = usedShelves.size;
  const totalAvailable = totalCapacity - totalUsed;

  const zoneInfo = new Map<string, ShelfSlotInfo[]>();

  for (const zone of zones) {
    const floorInfo: ShelfSlotInfo[] = [];
    for (let floor = 1; floor <= floors; floor++) {
      let used = 0;
      for (let slot = 1; slot <= slotsPerFloor; slot++) {
        const shelfNumber = `${zone}-${floor}-${String(slot).padStart(2, '0')}`;
        if (usedShelves.has(shelfNumber)) {
          used++;
        }
      }
      floorInfo.push({
        zone,
        floor,
        totalSlots: slotsPerFloor,
        usedSlots: used,
        availableSlots: slotsPerFloor - used,
      });
    }
    zoneInfo.set(zone, floorInfo);
  }

  return {
    totalCapacity,
    totalUsed,
    totalAvailable,
    zoneInfo,
    isFull: totalAvailable <= 0,
  };
}

export function parseShelfNumber(shelfNumber: string): {
  zone: string;
  floor: number;
  slot: number;
} {
  const parts = shelfNumber.split('-');
  return {
    zone: parts[0],
    floor: parseInt(parts[1], 10),
    slot: parseInt(parts[2], 10),
  };
}

export function getShelfLayerDetail(
  packages: Package[],
  config: ShelfConfig,
  zone: string,
  floor: number
): ShelfLayerDetail {
  const { slotsPerFloor } = config;
  const pendingPackages = packages.filter((p) => p.status === 'pending');

  const slotMap = new Map<number, Package>();
  pendingPackages.forEach((pkg) => {
    const parsed = parseShelfNumber(pkg.shelfNumber);
    if (parsed.zone === zone && parsed.floor === floor) {
      slotMap.set(parsed.slot, pkg);
    }
  });

  const slots: ShelfSlotPackage[] = [];
  for (let i = 1; i <= slotsPerFloor; i++) {
    slots.push({
      slotNumber: i,
      package: slotMap.get(i) || null,
    });
  }

  return {
    zone,
    floor,
    totalSlots: slotsPerFloor,
    slots,
  };
}

export function buildShelfNumber(zone: string, floor: number, slot: number): string {
  return `${zone}-${floor}-${String(slot).padStart(2, '0')}`;
}

export interface EmptySlotInfo {
  zone: string;
  floor: number;
  slot: number;
  shelfNumber: string;
}

export function getAllEmptySlots(
  packages: Package[],
  config: ShelfConfig
): EmptySlotInfo[] {
  const { zones, floors, slotsPerFloor } = config;
  const usedShelves = new Set(
    packages.filter((p) => p.status === 'pending').map((p) => p.shelfNumber)
  );

  const emptySlots: EmptySlotInfo[] = [];
  for (const zone of zones) {
    for (let floor = 1; floor <= floors; floor++) {
      for (let slot = 1; slot <= slotsPerFloor; slot++) {
        const shelfNumber = buildShelfNumber(zone, floor, slot);
        if (!usedShelves.has(shelfNumber)) {
          emptySlots.push({ zone, floor, slot, shelfNumber });
        }
      }
    }
  }
  return emptySlots;
}
