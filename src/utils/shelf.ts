import type { Package, ShelfConfig, ShelfOverview, ShelfSlotInfo, ShelfLayerDetail, ShelfSlotPackage } from '@/types';

export interface RearrangeSuggestion {
  targetSlot: EmptySlotInfo;
  packagesToMove: {
    pkg: Package;
    reason: string;
    priority: number;
  }[];
}

export interface MoveCandidate {
  pkg: Package;
  reason: string;
  priority: number;
  distance: number;
}

export function calculateRearrangeSuggestions(
  packages: Package[],
  config: ShelfConfig,
  targetSlot: EmptySlotInfo
): RearrangeSuggestion {
  const pendingPackages = packages.filter((p) => p.status === 'pending');
  const candidates: MoveCandidate[] = [];

  pendingPackages.forEach((pkg) => {
    if (pkg.shelfNumber === targetSlot.shelfNumber) return;

    const parsed = parseShelfNumber(pkg.shelfNumber);
    let reason = '';
    let priority = 0;
    let distance = 0;

    if (parsed.zone === targetSlot.zone) {
      distance += Math.abs(parsed.floor - targetSlot.floor) * 100;
    } else {
      distance += 1000 + Math.abs(parsed.floor - targetSlot.floor) * 100;
    }
    distance += Math.abs(parsed.slot - targetSlot.slot);

    const sameZonePackages = pendingPackages.filter(
      (p) =>
        p.shelfNumber !== pkg.shelfNumber &&
        parseShelfNumber(p.shelfNumber).zone === targetSlot.zone &&
        parseShelfNumber(p.shelfNumber).floor === targetSlot.floor &&
        p.courierCompany === pkg.courierCompany
    );
    if (sameZonePackages.length > 0) {
      reason = `同层已有 ${sameZonePackages.length} 件${pkg.courierCompany}，挪过去方便找件`;
      priority = 100 + sameZonePackages.length * 10;
    }

    if (!reason) {
      const sameCompanyInZone = pendingPackages.filter(
        (p) =>
          p.shelfNumber !== pkg.shelfNumber &&
          parseShelfNumber(p.shelfNumber).zone === targetSlot.zone &&
          p.courierCompany === pkg.courierCompany
      );
      if (sameCompanyInZone.length > 0) {
        reason = `同区已有 ${sameCompanyInZone.length} 件${pkg.courierCompany}，收拢到同一区`;
        priority = 50 + sameCompanyInZone.length * 5;
      }
    }

    if (!reason) {
      const samePhonePackages = pendingPackages.filter(
        (p) =>
          p.shelfNumber !== pkg.shelfNumber &&
          parseShelfNumber(p.shelfNumber).zone === targetSlot.zone &&
          parseShelfNumber(p.shelfNumber).floor === targetSlot.floor &&
          p.phoneLast4 === pkg.phoneLast4
      );
      if (samePhonePackages.length > 0) {
        reason = `同层尾号 ${pkg.phoneLast4} 有 ${samePhonePackages.length} 件，可能是同一收件人`;
        priority = 80 + samePhonePackages.length * 10;
      }
    }

    if (!reason) {
      if (parsed.zone !== targetSlot.zone) {
        reason = `跨区到 ${targetSlot.zone} 区，可减少跨区找件`;
        priority = 10;
      }
    }

    if (priority > 0) {
      candidates.push({ pkg, reason, priority, distance });
    }
  });

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.distance - b.distance;
  });

  return {
    targetSlot,
    packagesToMove: candidates.slice(0, 10).map((c) => ({
      pkg: c.pkg,
      reason: c.reason,
      priority: c.priority,
    })),
  };
}

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
