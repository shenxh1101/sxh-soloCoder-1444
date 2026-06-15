import { useState } from 'react';
import {
  PackagePlus,
  PackageCheck,
  Clock,
  AlertTriangle,
  Download,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import StatCard from '@/components/StatCard';
import ShelfBoard from '@/components/ShelfBoard';
import OverdueFollowUpCard from '@/components/OverdueFollowUpCard';
import { exportToCSV, exportMonthlyStats } from '@/utils/export';

export default function Statistics() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const packages = usePackageStore((state) => state.packages);
  const getDailyStats = usePackageStore((state) => state.getDailyStats);
  const getOverduePackages = usePackageStore((state) => state.getOverduePackages);
  const getCourierStats = usePackageStore((state) => state.getCourierStats);

  const dailyStats = getDailyStats();
  const overduePackages = getOverduePackages();
  const courierStats = getCourierStats(selectedMonth.year, selectedMonth.month);
  const maxCourierCount = Math.max(...courierStats.map((s) => s.count), 1);

  const prevMonth = () => {
    setSelectedMonth((prev) => {
      const date = new Date(prev.year, prev.month - 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const nextMonth = () => {
    setSelectedMonth((prev) => {
      const date = new Date(prev.year, prev.month + 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const handleExportAll = () => {
    exportToCSV(packages);
  };

  const handleExportMonthly = () => {
    exportMonthlyStats(packages, selectedMonth.year, selectedMonth.month);
  };

  const monthTotal = courierStats.reduce((sum, s) => sum + s.count, 0);

  const needsReminderCount = overduePackages.filter((pkg) => {
    const followUps = pkg.followUps || [];
    return followUps.some((f) => {
      if (!f.nextReminderAt) return false;
      const reminderDate = new Date(f.nextReminderAt);
      const today = new Date();
      return (
        reminderDate.getFullYear() === today.getFullYear() &&
        reminderDate.getMonth() === today.getMonth() &&
        reminderDate.getDate() <= today.getDate()
      );
    });
  }).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-800 mb-2">数据统计</h1>
        <p className="text-dark-500">查看运营数据，管理超期包裹</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="今日收件"
          value={dailyStats.todayReceived}
          icon={PackagePlus}
          gradient="bg-gradient-to-br from-primary-400 to-primary-600"
          iconBgColor="bg-white/20"
        />
        <StatCard
          title="今日取件"
          value={dailyStats.todayPicked}
          icon={PackageCheck}
          gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          iconBgColor="bg-white/20"
        />
        <StatCard
          title="待取包裹"
          value={dailyStats.pendingCount}
          icon={Clock}
          gradient="bg-gradient-to-br from-blue-400 to-blue-600"
          iconBgColor="bg-white/20"
        />
        <StatCard
          title="超期包裹"
          value={dailyStats.overdueCount}
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-red-400 to-red-600"
          iconBgColor="bg-white/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <ShelfBoard />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary-500" />
                <h2 className="text-lg font-bold text-dark-800">
                  快递公司入库统计
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-dark-700 min-w-[100px] text-center">
                  {selectedMonth.year}年{selectedMonth.month + 1}月
                </span>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {courierStats.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-dark-400">本月暂无数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courierStats.map((stat, index) => (
                  <div key={stat.company} className="flex items-center gap-4">
                    <span className="w-6 text-center text-sm font-bold text-dark-400">
                      {index + 1}
                    </span>
                    <span className="w-24 text-sm text-dark-700 font-medium truncate">
                      {stat.company}
                    </span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-lg transition-all duration-700 ease-out"
                        style={{
                          width: `${(stat.count / maxCourierCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-bold text-dark-700 tabular-nums">
                      {stat.count}件
                    </span>
                    <span className="w-14 text-right text-xs text-dark-400">
                      {((stat.count / monthTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-500">
                  本月总计入库
                  <span className="font-bold text-primary-600 text-lg ml-2">
                    {monthTotal}
                  </span>
                  件
                </p>
              </div>
              <button
                onClick={handleExportMonthly}
                className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出月度报表
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-800">超期催件管理</h2>
              <p className="text-sm text-dark-500">
                共 {overduePackages.length} 件超期包裹
                {needsReminderCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">
                    {needsReminderCount} 件今日待提醒
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {overduePackages.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <PackageCheck className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-dark-400 text-sm">暂无超期包裹</p>
            <p className="text-dark-300 text-xs mt-1">
              所有包裹都在正常取件周期内
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overduePackages.map((pkg) => (
              <OverdueFollowUpCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-dark-800 mb-1">数据导出</h2>
            <p className="text-sm text-dark-500">
              导出所有包裹数据（包含催件记录），共 {packages.length} 条记录
            </p>
          </div>
          <button
            onClick={handleExportAll}
            className="px-6 py-3 bg-dark-800 hover:bg-dark-900 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            导出全部数据
          </button>
        </div>
      </div>
    </div>
  );
}
