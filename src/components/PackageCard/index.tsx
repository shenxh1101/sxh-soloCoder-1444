import { Package, MapPin, Clock, Phone, User, Check } from 'lucide-react';
import type { Package as PackageType } from '@/types';
import { formatDate, isOverdue, getOverdueDays } from '@/utils/storage';

interface PackageCardProps {
  pkg: PackageType;
  onPick?: (id: string) => void;
  showPickButton?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export default function PackageCard({
  pkg,
  onPick,
  showPickButton = false,
  selected = false,
  onSelect,
}: PackageCardProps) {
  const overdue = isOverdue(pkg.createdAt);
  const overdueDays = getOverdueDays(pkg.createdAt);
  const isPicked = pkg.status === 'picked';

  const cardClass = `relative rounded-2xl p-5 border-2 transition-all duration-300 ${
    isPicked
      ? 'bg-gray-50 border-gray-200 opacity-60'
      : overdue
      ? 'bg-red-50 border-red-300 shadow-card hover:shadow-card-hover'
      : 'bg-white border-gray-100 shadow-card hover:shadow-card-hover hover:border-primary-200'
  } ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`;

  return (
    <div className={cardClass}>
      {onSelect && (
        <button
          onClick={() => onSelect(pkg.id)}
          className="absolute top-4 right-4 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: selected ? '#FF6B35' : '#E5E7EB',
            backgroundColor: selected ? '#FF6B35' : 'white',
          }}
        >
          {selected && <Check className="w-4 h-4 text-white" />}
        </button>
      )}

      {overdue && !isPicked && (
        <span className="absolute top-4 right-4 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
          超期{overdueDays}天
        </span>
      )}

      {isPicked && (
        <span className="absolute top-4 right-4 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
          已取件
        </span>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPicked
                ? 'bg-gray-200'
                : overdue
                ? 'bg-red-100'
                : 'bg-gradient-to-br from-primary-400 to-primary-600'
            }`}
          >
            <Package
              className={`w-6 h-6 ${
                isPicked ? 'text-gray-500' : overdue ? 'text-red-600' : 'text-white'
              }`}
            />
          </div>
          <div>
            <p className="text-xs text-dark-400">单号</p>
            <p className="font-mono font-semibold text-dark-800 text-sm">
              {pkg.trackingNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-orange-50 mb-3">
          <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-dark-400">货架位置</p>
            <p className="text-xl font-bold text-primary-600 font-mono">
              {pkg.shelfNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-dark-600">
          <User className="w-4 h-4 text-dark-400" />
          <span>{pkg.recipientName}</span>
        </div>
        <div className="flex items-center gap-2 text-dark-600">
          <Phone className="w-4 h-4 text-dark-400" />
          <span>
            {pkg.phoneFull ? (
              <span className="font-mono text-primary-600 font-medium">
                {pkg.phoneFull}
              </span>
            ) : (
              `尾号 ${pkg.phoneLast4}`
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-dark-600">
          <Clock className="w-4 h-4 text-dark-400" />
          <span>{formatDate(pkg.createdAt)}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs px-3 py-1 bg-dark-100 text-dark-600 rounded-full">
          {pkg.courierCompany}
        </span>
        {showPickButton && !isPicked && (
          <button
            onClick={() => onPick?.(pkg.id)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            标记取件
          </button>
        )}
      </div>
    </div>
  );
}
