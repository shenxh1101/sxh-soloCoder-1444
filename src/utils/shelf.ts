import type { Package, ShelfConfig } from '@/types';

export function generateShelfNumber(
  packages: Package[],
  config: ShelfConfig
): string {
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

  const zone = zones[0];
  const floor = 1;
  const slot = packages.length + 1;
  return `${zone}-${floor}-${String(slot).padStart(2, '0')}`;
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
