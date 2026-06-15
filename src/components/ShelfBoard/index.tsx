import { useState, useMemo } from 'react';
import { Layers, Package, X, Phone, User } from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import type { ShelfSlotInfo, ShelfLayerDetail } from '@/types';
import { formatDate, isOverdue, getOverdueDays } from '@/utils/storage';

export default function ShelfBoard() {
  const getShelfOverview = usePackageStore((state) => state.getShelfOverview);
  const getShelfLayerDetail = usePackageStore((state) => state.getShelfLayerDetail);
  const shelfConfig = usePackageStore((state) => state.shelfConfig);
  const [selectedLayer, setSelectedLayer] = useState<{ zone: string; floor: number } | null>(null);

  const overview = useMemo(() => getShelfOverview(), [getShelfOverview]);
  const layerDetail = useMemo(() => {
    if (!selectedLayer) return null;
    return getShelfLayerDetail(selectedLayer.zone, selectedLayer.floor);
  }, [selectedLayer, getShelfLayerDetail]);

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

  const handleLayerClick = (zone: string, floor: number) => {
    setSelectedLayer({ zone, floor });
  };

  const closeModal = () => {
    setSelectedLayer(null);
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
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => handleLayerClick(zone, floor.floor)}
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
                              : 'bg-transparent group-hover:bg-gray-200'
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
        <div className="flex items-center justify-between">
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
          <span className="text-xs text-dark-400">点击楼层查看详情</span>
        </div>
      </div>

      {selectedLayer && layerDetail && (
        <ShelfLayerModal
          detail={layerDetail}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function ShelfLayerModal({
  detail,
  onClose,
}: {
  detail: ShelfLayerDetail;
  onClose: () => void;
}) {
  const usedCount = detail.slots.filter((s) => s.package !== null).length;
  const usageRatio = usedCount / detail.totalSlots;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-800">
                {detail.zone}区 {detail.floor}层 库位详情
              </h2>
              <p className="text-sm text-dark-500">
                已用 {usedCount} 位 / 共 {detail.totalSlots} 位
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-500">本层使用率</span>
              <span className="text-sm font-bold text-dark-700">
                {(usageRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  usageRatio >= 0.9 ? 'bg-red-500' : usageRatio >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usageRatio * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {detail.slots.map((slot) => {
              const pkg = slot.package;
              const isOverduePkg = pkg && isOverdue(pkg.createdAt);
              return (
                <div
                  key={slot.slotNumber}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 text-center transition-all ${
                    pkg
                      ? isOverduePkg
                        ? 'bg-red-50 border-red-300'
                        : 'bg-primary-50 border-primary-300'
                      : 'bg-gray-50 border-gray-200 border-dashed'
                  }`}
                  title={
                    pkg
                      ? `${pkg.trackingNumber}\n${pkg.recipientName}\n${pkg.phoneFull || '尾号' + pkg.phoneLast4}`
                      : `${slot.slotNumber}号 - 空闲`
                  }
                >
                  <span
                    className={`text-xs font-bold ${
                      pkg ? (isOverduePkg ? 'text-red-600' : 'text-primary-600') : 'text-gray-400'
                    }`}
                  >
                    {slot.slotNumber}
                  </span>
                  {pkg && (
                    <div className="w-full overflow-hidden mt-1">
                      <span className="text-[10px] text-dark-600 block truncate">
                        {pkg.trackingNumber.slice(-6)}
                      </span>
                      <span className="text-[9px] text-dark-400 block truncate">
                        {pkg.recipientName}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {usedCount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-dark-700 mb-3">本层包裹清单</h3>
              <div className="space-y-2">
                {detail.slots
                  .filter((s) => s.package !== null)
                  .map((slot) => {
                    const pkg = slot.package!;
                    const overdue = isOverdue(pkg.createdAt);
                    const overdueDays = getOverdueDays(pkg.createdAt);
                    return (
                      <div
                        key={slot.slotNumber}
                        className={`flex items-center gap-4 p-3 rounded-xl ${
                          overdue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                            overdue
                              ? 'bg-red-500 text-white'
                              : 'bg-primary-500 text-white'
                          }`}
                        >
                          {slot.slotNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-semibold text-dark-700">
                            {pkg.trackingNumber}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-dark-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {pkg.recipientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {pkg.phoneFull || `尾号${pkg.phoneLast4}`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {overdue && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                              超期{overdueDays}天
                            </span>
                          )}
                          <p className="text-xs text-dark-400 mt-1">
                            入库：{formatDate(pkg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
