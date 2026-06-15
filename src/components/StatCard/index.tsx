import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  iconBgColor: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  iconBgColor,
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-6 ${gradient} shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-4xl font-bold text-white mt-2 tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={`w-14 h-14 rounded-xl ${iconBgColor} flex items-center justify-center backdrop-blur-sm`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}
