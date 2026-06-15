import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCheck, PackageSearch, Filter } from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import PackageCard from '@/components/PackageCard';

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
      pkgs = pkgs.filter((p) => {
        const diff = Date.now() - p.createdAt;
        return diff > 3 * 24 * 60 * 60 * 1000;
      });
    }
    return pkgs.sort((a, b) => a.createdAt - b.createdAt);
  }, [keyword, filterOverdue, searchPackages]);

  useEffect(() => {
    setSelectedIds([]);
  }, [keyword, filterOverdue]);

  const handlePick = (id: string) => {
    pickPackage(id);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchPick = () => {
    if (selectedIds.length > 0) {
      pickPackages(selectedIds);
      setSelectedIds([]);
    }
  };

  const selectAll = () => {
    const resultIds = results.map((p) => p.id);
    if (selectedIds.length === results.length && results.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resultIds);
    }
  };

  const isAllSelected = results.length > 0 && selectedIds.length === results.length;

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

        {selectedIds.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-200">
            <span className="text-primary-700 font-medium">
              已选择 <span className="font-bold">{selectedIds.length}</span> 个包裹
              <span className="text-primary-500 text-sm ml-2">
                （仅当前筛选结果）
              </span>
            </span>
            <div className="flex gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
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
        <p className="text-dark-500 text-sm">
          共找到 <span className="font-semibold text-dark-700">{results.length}</span> 个待取包裹
        </p>
        {results.length > 0 && (
          <button
            onClick={selectAll}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
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
              selected={selectedIds.includes(pkg.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
