import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, CheckCheck, PackageSearch, Filter, CheckSquare, Square } from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import PackageCard from '@/components/PackageCard';
import { isOverdue } from '@/utils/storage';

export default function Pickup() {
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOverdue, setFilterOverdue] = useState(false);

  const searchPackages = usePackageStore((state) => state.searchPackages);
  const pickPackage = usePackageStore((state) => state.pickPackage);
  const pickPackages = usePackageStore((state) => state.pickPackages);

  const results = useMemo(() => {
    let pkgs = searchPackages(keyword);
    if (filterOverdue) {
      pkgs = pkgs.filter((p) => isOverdue(p.createdAt));
    }
    return pkgs.sort((a, b) => a.createdAt - b.createdAt);
  }, [keyword, filterOverdue, searchPackages]);

  const resultIds = useMemo(() => new Set(results.map((p) => p.id)), [results]);

  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => resultIds.has(id)),
    [selectedIds, resultIds]
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [keyword, filterOverdue]);

  useEffect(() => {
    if (validSelectedIds.length !== selectedIds.length) {
      setSelectedIds(validSelectedIds);
    }
  }, [validSelectedIds, selectedIds.length]);

  const handlePick = (id: string) => {
    pickPackage(id);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleSelect = useCallback((id: string) => {
    if (!resultIds.has(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, [resultIds]);

  const handleBatchPick = () => {
    if (validSelectedIds.length > 0) {
      pickPackages(validSelectedIds);
      setSelectedIds([]);
    }
  };

  const selectAll = () => {
    if (validSelectedIds.length === results.length && results.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((p) => p.id));
    }
  };

  const isAllSelected = results.length > 0 && validSelectedIds.length === results.length;
  const isPartialSelected = validSelectedIds.length > 0 && validSelectedIds.length < results.length;

  const overdueCount = results.filter((p) => isOverdue(p.createdAt)).length;
  const normalCount = results.length - overdueCount;
  const selectedOverdueCount = validSelectedIds.filter((id) => {
    const pkg = results.find((p) => p.id === id);
    return pkg && isOverdue(pkg.createdAt);
  }).length;
  const selectedNormalCount = validSelectedIds.length - selectedOverdueCount;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-800 mb-2">取件查询</h1>
        <p className="text-dark-500">搜索包裹位置，一键标记取件</p>
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
              className="w-full pl-12 pr-4 py-3.5 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
              autoFocus
            />
          </div>
          <button
            onClick={() => setFilterOverdue(!filterOverdue)}
            className={`px-5 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 ${
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
                已选择 <span className="font-bold text-lg">{validSelectedIds.length}</span> 个包裹
                <span className="text-primary-500 text-sm ml-2">
                  （仅当前筛选结果）
                </span>
              </span>
              <div className="flex gap-4 mt-1 text-xs">
                <span className="text-green-600">
                  普通件 {selectedNormalCount} 件
                </span>
                <span className="text-red-600">
                  超期件 {selectedOverdueCount} 件
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isPartialSelected ? (
                  <CheckSquare className="w-4 h-4 opacity-50" />
                ) : isAllSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {isAllSelected ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleBatchPick}
                className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                批量取件
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-dark-500 text-sm">
            共找到 <span className="font-semibold text-dark-700">{results.length}</span> 个待取包裹
            {results.length > 0 && (
              <span className="ml-3 text-xs">
                <span className="text-green-600">普通 {normalCount} 件</span>
                <span className="mx-2 text-dark-300">|</span>
                <span className="text-red-600">超期 {overdueCount} 件</span>
              </span>
            )}
          </p>
        </div>
        {results.length > 0 && (
          <button
            onClick={selectAll}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1.5"
          >
            {isPartialSelected ? (
              <CheckSquare className="w-4 h-4 opacity-50" />
            ) : isAllSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {isAllSelected ? '取消全选' : '全选'}
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
      ) : (
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
      )}
    </div>
  );
}
