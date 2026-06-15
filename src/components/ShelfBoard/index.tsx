import { useMemo } from 'react';
import { Layers, Package } from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import type { ShelfSlotInfo } from '@/types';

export default function ShelfBoard() {
  const getShelfOverview = usePackageStore((state) => state.getShelfOverview);
  const shelfConfig = usePackageStore((state) => state.shelfConfig);

  const overview = useMemo(() => getShelfOverview(), [getShelfOverview]);

  const getUsageColor = (used: number, total: number) => {
    const ratio = used / total;
    if (ratio >= 0.9) return 'bg-red-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (used: number, total: number) => {
    const ratio = used / total;
    if (ratio >= 0.9) return 'text-red-600';
    if (ratio >= 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-800">货架概览</h2>
            <p className="text-xs text-dark-400">
              {shelfConfig.zones.length}个区 × {shelfConfig.floors}层 × {shelfConfig.slotsPerFloor}位
            </p>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-xl font-bold text-lg ${
            overview.isFull
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          }`}
        >
          {overview.totalUsed} / {overview.totalCapacity}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-dark-500">整体使用率</span>
          <span
            className={`text-sm font-bold ${getUsageTextColor(
              overview.totalUsed,
              overview.totalCapacity
            )}`}
          >
            {((overview.totalUsed / overview.totalCapacity) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getUsageColor(
              overview.totalUsed,
              overview.totalCapacity
            )} transition-all duration-500`}
            style={{
              width: `${(overview.totalUsed / overview.totalCapacity) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-dark-400">
          <span>已用 {overview.totalUsed} 位</span>
          <span>剩余 {overview.totalAvailable} 位</span>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from(overview.zoneInfo.entries()).map(([zone, floors]) => (
          <div key={zone} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-dark-800 text-white rounded-lg flex items-center justify-center font-bold">
                  {zone}
                </div>
                <span className="font-semibold text-dark-700">{zone}区</span>
              </div>
              <div className="text-sm text-dark-500">
                {floors.reduce((sum, f) => sum + f.usedSlots, 0)} /{' '}
                {floors.reduce((sum, f) => sum + f.totalSlots, 0)}
              </div>
            </div>

            <div className="space-y-2">
              {floors.map((floor: ShelfSlotInfo) => (
                <div
                  key={floor.floor}
                  className="flex items-center gap-3"
                >
                  <span className="w-12 text-sm text-dark-500 font-medium">
                    {floor.floor}层
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden flex">
                    {Array.from({ length: floor.totalSlots }).map((_, i) => {
                      const isUsed = i < floor.usedSlots;
                      return (
                        <div
                          key={i}
                          className={`flex-1 border-r border-white last:border-r-0 transition-colors duration-200 ${
                            isUsed
                              ? floor.usedSlots / floor.totalSlots >= 0.9
                                ? 'bg-red-400'
                                : floor.usedSlots / floor.totalSlots >= 0.7
                                ? 'bg-yellow-400'
                                : 'bg-primary-400'
                              : 'bg-transparent'
                          }`}
                          title={`${i + 1}号${isUsed ? '已占用' : '空闲'}`}
                        />
                      );
                    })}
                  </div>
                  <span
                    className={`w-16 text-right text-sm font-medium ${getUsageTextColor(
                      floor.usedSlots,
                      floor.totalSlots
                    )}`}
                  >
                    {floor.availableSlots} 空位
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-6 text-xs text-dark-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary-400 rounded" />
            <span>正常使用</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-yellow-400 rounded" />
            <span>使用率≥70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-400 rounded" />
            <span>即将满仓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
