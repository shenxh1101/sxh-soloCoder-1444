import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  CheckCheck,
  PackageSearch,
  Filter,
  CheckSquare,
  Square,
  MinusSquare,
  List,
  Grid3X3,
  Check,
  Package,
  Phone,
  User,
  MapPin,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import PackageCard from '@/components/PackageCard';
import { isOverdue, getOverdueDays, formatDate } from '@/utils/storage';

type ViewMode = 'card' | 'list';

export default function Pickup() {
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterTriggered, setFilterTriggered] = useState(0);
  const [toast, setToast] = useState<{ type: 'success'; message: string } | null>(null);

  const searchPackages = usePackageStore((state) => state.searchPackages);
  const pickPackage = usePackageStore((state) => state.pickPackage);
  const pickPackages = usePackageStore((state) => state.pickPackages);

  const filterRef = useRef({ keyword: '', filterOverdue: false });

  const results = useMemo(() => {
    let pkgs = searchPackages(keyword);
    if (filterOverdue) {
      pkgs = pkgs.filter((p) => isOverdue(p.createdAt));
    }
    return pkgs.sort((a, b) => {
      const oa = isOverdue(a.createdAt) ? 0 : 1;
      const ob = isOverdue(b.createdAt) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return a.createdAt - b.createdAt;
    });
  }, [keyword, filterOverdue, searchPackages, filterTriggered]);

  const resultIds = useMemo(() => new Set(results.map((p) => p.id)), [results]);

  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => resultIds.has(id)),
    [selectedIds, resultIds]
  );

  useEffect(() => {
    const prev = filterRef.current;
    if (prev.keyword !== keyword || prev.filterOverdue !== filterOverdue) {
      filterRef.current = { keyword, filterOverdue };
      setSelectedIds([]);
      setFilterTriggered((n) => n + 1);
    }
  }, [keyword, filterOverdue]);

  useEffect(() => {
    if (validSelectedIds.length !== selectedIds.length) {
      setSelectedIds(validSelectedIds);
    }
  }, [validSelectedIds, selectedIds.length]);

  const handlePick = useCallback((id: string) => {
    if (!resultIds.has(id)) return;
    const pkg = results.find((p) => p.id === id);
    pickPackage(id);
    setSelectedIds((prev) => {
      const next = prev.filter((i) => i !== id);
      return next.filter((i) => resultIds.has(i));
    });
    if (pkg) {
      const overdue = isOverdue(pkg.createdAt);
      setToast({
        type: 'success',
        message: `${pkg.recipientName} 的${overdue ? '超期' : ''}包裹已取件（${pkg.shelfNumber}）`,
      });
      setTimeout(() => setToast(null), 2000);
    }
  }, [resultIds, pickPackage, results]);

  const handleSelect = useCallback((id: string) => {
    if (!resultIds.has(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev.filter((i) => resultIds.has(i)), id]
    );
  }, [resultIds]);

  const handleBatchPick = useCallback(() => {
    const safeIds = validSelectedIds.filter((id) => resultIds.has(id));
    if (safeIds.length === 0) return;
    if (safeIds.length !== validSelectedIds.length) {
      setSelectedIds(safeIds);
    }
    const pickedNormal = safeIds.filter((id) => {
      const pkg = results.find((p) => p.id === id);
      return pkg && !isOverdue(pkg.createdAt);
    }).length;
    const pickedOverdue = safeIds.length - pickedNormal;
    pickPackages(safeIds);
    setSelectedIds([]);
    setToast({
      type: 'success',
      message: `成功取件 ${safeIds.length} 件${pickedOverdue > 0 ? `（含超期件 ${pickedOverdue} 件）` : ''}`,
    });
    setTimeout(() => setToast(null), 2500);
  }, [validSelectedIds, resultIds, pickPackages, results]);

  const selectAll = useCallback(() => {
    if (results.length === 0) return;
    if (validSelectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((p) => p.id));
    }
  }, [results, validSelectedIds.length]);

  const isAllSelected = results.length > 0 && validSelectedIds.length === results.length;
  const isPartialSelected = validSelectedIds.length > 0 && validSelectedIds.length < results.length;

  const overdueCount = results.filter((p) => isOverdue(p.createdAt)).length;
  const normalCount = results.length - overdueCount;
  const selectedOverdueCount = useMemo(() =>
    validSelectedIds.filter((id) => {
      const pkg = results.find((p) => p.id === id);
      return pkg && isOverdue(pkg.createdAt);
    }).length
  , [validSelectedIds, results]);
  const selectedNormalCount = validSelectedIds.length - selectedOverdueCount;

  const SelectIcon = isPartialSelected
    ? MinusSquare
    : isAllSelected
    ? CheckSquare
    : Square;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-dark-800 mb-2">取件查询</h1>
          <p className="text-dark-500">搜索包裹位置，一键标记取件</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-dark-500 hover:text-dark-700'
            }`}
          >
            <List className="w-4 h-4" />
            清单模式
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'card'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-dark-500 hover:text-dark-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            卡片模式
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入手机尾号、单号、姓名或货架号搜索..."
              className="w-full pl-12 pr-24 py-3.5 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
              autoFocus
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-400 hover:text-dark-600 transition-colors"
                title="清除搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(keyword || filterOverdue) && (
            <button
              onClick={() => {
                setKeyword('');
                setFilterOverdue(false);
              }}
              className="px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-dark-600 rounded-xl font-medium flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              重置筛选
            </button>
          )}
          <button
            onClick={() => setFilterOverdue(!filterOverdue)}
            className={`px-5 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
              filterOverdue
                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                : 'bg-gray-100 text-dark-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            只看超期
          </button>
        </div>

        {validSelectedIds.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
            <div>
              <span className="text-primary-700 font-medium">
                已选择{' '}
                <span className="font-bold text-lg tabular-nums">
                  {validSelectedIds.length}
                </span>{' '}
                / {results.length} 个包裹
                <span className="text-primary-500 text-sm ml-2">
                  （仅当前筛选结果）
                </span>
              </span>
              <div className="flex gap-4 mt-1 text-xs">
                <span className="text-green-600 font-medium">
                  普通件 {selectedNormalCount} 件
                </span>
                <span className="text-red-600 font-medium">
                  超期件 {selectedOverdueCount} 件
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <SelectIcon className="w-4 h-4" />
                {isAllSelected ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleBatchPick}
                className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary-200"
              >
                <CheckCheck className="w-4 h-4" />
                批量取件 ({validSelectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-dark-500 text-sm">
            共找到{' '}
            <span className="font-semibold text-dark-700 tabular-nums">
              {results.length}
            </span>{' '}
            个待取包裹
            {results.length > 0 && (
              <span className="ml-3 text-xs">
                <span className="text-green-600 font-medium">
                  普通 {normalCount} 件
                </span>
                <span className="mx-2 text-dark-300">|</span>
                <span className="text-red-600 font-medium">
                  超期 {overdueCount} 件
                </span>
              </span>
            )}
          </p>
        </div>
        {results.length > 0 && (
          <button
            onClick={selectAll}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1.5"
          >
            <SelectIcon className="w-4 h-4" />
            {isAllSelected ? '取消全选' : `全选 ${results.length} 件`}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PackageSearch className="w-10 h-10 text-dark-300" />
          </div>
          <p className="text-dark-400 text-lg mb-2">没有找到相关包裹</p>
          <p className="text-dark-300 text-sm">
            {keyword ? '试试其他关键词搜索' : '暂无待取包裹'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              showPickButton
              onPick={handlePick}
              selected={validSelectedIds.includes(pkg.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-semibold text-dark-500 uppercase tracking-wider">
            <div className="col-span-1">选择</div>
            <div className="col-span-3">包裹信息</div>
            <div className="col-span-2">收件人</div>
            <div className="col-span-2">联系方式</div>
            <div className="col-span-2">货架位置</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
          <div className="divide-y divide-gray-50">
            {results.map((pkg) => {
              const overdue = isOverdue(pkg.createdAt);
              const overdueDays = getOverdueDays(pkg.createdAt);
              const isSelected = validSelectedIds.includes(pkg.id);
              return (
                <div
                  key={pkg.id}
                  className={`grid grid-cols-12 gap-4 items-center px-6 py-4 transition-colors ${
                    overdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'
                  } ${isSelected ? 'bg-primary-50/70 ring-1 ring-inset ring-primary-200' : ''}`}
                  onClick={() => handleSelect(pkg.id)}
                >
                  <div className="col-span-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(pkg.id);
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : 'border-2 border-gray-300 hover:border-primary-400 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="font-mono text-sm font-semibold text-dark-800 truncate">
                      {pkg.trackingNumber}
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                          overdue
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {pkg.courierCompany}
                      </span>
                      {overdue && (
                        <span className="text-red-600 font-bold">
                          超期{overdueDays - 3}天
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 text-sm text-dark-700">
                      <User className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                      <span className="font-medium truncate">{pkg.recipientName}</span>
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5 ml-5">
                      {formatDate(pkg.createdAt).slice(5)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                      <span className={pkg.phoneFull ? 'text-primary-600 font-mono font-medium' : 'text-dark-600'}>
                        {pkg.phoneFull || `尾号 ${pkg.phoneLast4}`}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                      <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                        {pkg.shelfNumber}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePick(pkg.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      <Package className="w-4 h-4" />
                      取件
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-dark-500">
            <span>
              显示 {results.length} 条结果 · 点击行快速勾选
            </span>
            <span>
              {validSelectedIds.length > 0
                ? `已选 ${validSelectedIds.length} 条，可点击右上角"批量取件"`
                : '支持批量操作'}
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-xl shadow-green-200">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
