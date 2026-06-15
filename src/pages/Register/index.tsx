import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Copy,
  Check,
  PackagePlus,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  FileText,
  Printer,
  X,
  ChevronRight,
  Phone,
  PieChart,
  MapPin,
  Truck,
  History,
  Calendar,
} from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import { COURIER_COMPANIES, type BatchEntryItem, type Package, type BatchSummaryItem, type BatchHistoryRecord } from '@/types';
import { formatDate } from '@/utils/storage';
import { parseShelfNumber } from '@/utils/shelf';

type Mode = 'single' | 'batch';

export default function Register() {
  const addPackage = usePackageStore((state) => state.addPackage);
  const batchAddPackages = usePackageStore((state) => state.batchAddPackages);
  const isShelfFull = usePackageStore((state) => state.isShelfFull);
  const getShelfOverview = usePackageStore((state) => state.getShelfOverview);
  const getTodayReceivedPackages = usePackageStore(
    (state) => state.getTodayReceivedPackages
  );
  const addBatchHistoryRecord = usePackageStore((state) => state.addBatchHistoryRecord);
  const getTodayBatchHistory = usePackageStore((state) => state.getTodayBatchHistory);
  const getBatchHistoryByDate = usePackageStore((state) => state.getBatchHistoryByDate);

  const [mode, setMode] = useState<Mode>('single');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [phoneFull, setPhoneFull] = useState('');
  const [courierCompany, setCourierCompany] = useState(COURIER_COMPANIES[0]);
  const [error, setError] = useState('');
  const [successPackage, setSuccessPackage] = useState<{
    shelfNumber: string;
    trackingNumber: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const [batchItems, setBatchItems] = useState<BatchEntryItem[]>([]);
  const [batchResult, setBatchResult] = useState<{
    success: Package[];
    failed: { item: BatchEntryItem; error: string }[];
  } | null>(null);
  const [showBatchResult, setShowBatchResult] = useState(false);

  const trackingInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const todayBatchHistory = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = refreshKey;
    return getTodayBatchHistory();
  }, [getTodayBatchHistory, refreshKey]);

  const selectedDateBatchHistory = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = refreshKey;
    return getBatchHistoryByDate(selectedHistoryDate);
  }, [getBatchHistoryByDate, selectedHistoryDate, refreshKey]);

  const handlePrevDay = () => {
    const d = new Date(selectedHistoryDate);
    d.setDate(d.getDate() - 1);
    setSelectedHistoryDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedHistoryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d.getTime() >= today.getTime()) return;
    d.setDate(d.getDate() + 1);
    setSelectedHistoryDate(d.toISOString().split('T')[0]);
  };

  const isSelectedDateToday = selectedHistoryDate === new Date().toISOString().split('T')[0];

  const batchSummary = useMemo((): BatchSummaryItem[] => {
    if (!batchResult) return [];
    const summaryMap = new Map<string, { count: number; zones: Set<string> }>();
    batchResult.success.forEach((pkg) => {
      const existing = summaryMap.get(pkg.courierCompany) || { count: 0, zones: new Set() };
      existing.count += 1;
      const { zone } = parseShelfNumber(pkg.shelfNumber);
      existing.zones.add(zone);
      summaryMap.set(pkg.courierCompany, existing);
    });
    return Array.from(summaryMap.entries())
      .map(([courierCompany, data]) => ({
        courierCompany,
        count: data.count,
        zones: Array.from(data.zones).sort(),
      }))
      .sort((a, b) => b.count - a.count);
  }, [batchResult]);

  useEffect(() => {
    if (mode === 'single') {
      trackingInputRef.current?.focus();
    }
  }, [mode]);

  const shelfOverview = getShelfOverview();
  const shelfFull = isShelfFull();

  const validateItem = (item: Omit<BatchEntryItem, 'shelfNumber' | 'error'>): string | null => {
    if (!item.trackingNumber.trim()) return '快递单号不能为空';
    if (!item.recipientName.trim()) return '收件人姓名不能为空';
    if (!/^\d{4}$/.test(item.phoneLast4)) return '手机尾号格式不正确';
    return null;
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessPackage(null);

    if (shelfFull) {
      setError('货架库位已满，请先清理已取件包裹或扩大货架容量');
      return;
    }

    const validationError = validateItem({
      trackingNumber,
      recipientName,
      phoneLast4,
      phoneFull,
      courierCompany,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = addPackage({
      trackingNumber: trackingNumber.trim(),
      recipientName: recipientName.trim(),
      phoneLast4,
      phoneFull: phoneFull.trim() || undefined,
      courierCompany,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setSuccessPackage({
      shelfNumber: result.shelfNumber,
      trackingNumber: result.trackingNumber,
    });

    setTrackingNumber('');
    setRecipientName('');
    setPhoneLast4('');
    setPhoneFull('');

    setTimeout(() => {
      trackingInputRef.current?.focus();
    }, 100);
  };

  const handleAddBatchItem = () => {
    setError('');

    const validationError = validateItem({
      trackingNumber,
      recipientName,
      phoneLast4,
      phoneFull,
      courierCompany,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const duplicate = batchItems.find(
      (item) => item.trackingNumber.trim() === trackingNumber.trim()
    );
    if (duplicate) {
      setError('该单号已在待入库列表中');
      return;
    }

    setBatchItems((prev) => [
      ...prev,
      {
        trackingNumber: trackingNumber.trim(),
        recipientName: recipientName.trim(),
        phoneLast4,
        phoneFull: phoneFull.trim() || undefined,
        courierCompany,
      },
    ]);

    setTrackingNumber('');
    setRecipientName('');
    setPhoneLast4('');
    setPhoneFull('');

    setTimeout(() => {
      trackingInputRef.current?.focus();
    }, 100);
  };

  const handleRemoveBatchItem = (index: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchSubmit = () => {
    if (batchItems.length === 0) {
      setError('请先添加至少一个包裹');
      return;
    }

    if (shelfFull) {
      setError('货架库位已满，请先清理已取件包裹或扩大货架容量');
      return;
    }

    const result = batchAddPackages(batchItems);
    setBatchResult(result);
    setShowBatchResult(true);
    setBatchItems([]);

    const summaryMap = new Map<string, { count: number; zones: Set<string> }>();
    result.success.forEach((pkg) => {
      const existing = summaryMap.get(pkg.courierCompany) || { count: 0, zones: new Set() };
      existing.count += 1;
      const { zone } = parseShelfNumber(pkg.shelfNumber);
      existing.zones.add(zone);
      summaryMap.set(pkg.courierCompany, existing);
    });
    const summary = Array.from(summaryMap.entries())
      .map(([cc, data]) => ({
        courierCompany: cc,
        count: data.count,
        zones: Array.from(data.zones).sort(),
      }))
      .sort((a, b) => b.count - a.count);

    addBatchHistoryRecord({
      success: result.success,
      failed: result.failed,
      summary,
    });
    setRefreshKey((k) => k + 1);
  };

  const copyShelfNumber = () => {
    if (successPackage) {
      navigator.clipboard.writeText(successPackage.shelfNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const printBatchResult = () => {
    if (!batchResult) return;
    window.print();
  };

  const todayPackages = getTodayReceivedPackages();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-dark-800">包裹登记</h1>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                mode === 'single'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <PackagePlus className="w-4 h-4" />
              单件入库
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                mode === 'batch'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              批量入库
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-dark-500">录入快递信息，系统自动分配货架号</p>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              shelfFull
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                shelfFull ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`}
            />
            {shelfFull
              ? '库位已满'
              : `剩余 ${shelfOverview.totalAvailable} / ${shelfOverview.totalCapacity} 位`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {mode === 'single' ? (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    快递单号
                  </label>
                  <input
                    ref={trackingInputRef}
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && trackingNumber.trim()) {
                        e.preventDefault();
                        nameInputRef.current?.focus();
                      }
                    }}
                    placeholder="请输入或扫描快递单号"
                    className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      收件人姓名
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="请输入收件人姓名"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      手机尾号
                    </label>
                    <input
                      type="text"
                      value={phoneLast4}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPhoneLast4(val);
                      }}
                      placeholder="后4位数字"
                      maxLength={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 font-mono text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      完整手机号 <span className="text-dark-400 font-normal">(选填，用于催件)</span>
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={phoneFull}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPhoneFull(val);
                    }}
                    placeholder="11位手机号，超期时方便电话联系"
                    maxLength={11}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    快递公司
                  </label>
                  <select
                    value={courierCompany}
                    onChange={(e) => setCourierCompany(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 bg-white"
                  >
                    {COURIER_COMPANIES.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={shelfFull}
                  className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl shadow-lg shadow-primary-200 disabled:shadow-none hover:shadow-xl hover:shadow-primary-300 disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <PackagePlus className="w-6 h-6" />
                  {shelfFull ? '库位已满，无法入库' : '登记入库'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-dark-800">
                    录入包裹信息
                  </h2>
                  <span className="px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm font-medium">
                    待入库 {batchItems.length} 件
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      快递单号
                    </label>
                    <input
                      ref={trackingInputRef}
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && trackingNumber.trim()) {
                          e.preventDefault();
                          nameInputRef.current?.focus();
                        }
                      }}
                      placeholder="请输入或扫描快递单号，按回车跳转到姓名"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-2">
                        收件人姓名
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && recipientName.trim()) {
                            e.preventDefault();
                            handleAddBatchItem();
                          }
                        }}
                        placeholder="请输入收件人姓名，按回车添加到列表"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-2">
                        手机尾号
                      </label>
                      <input
                        type="text"
                        value={phoneLast4}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPhoneLast4(val);
                        }}
                        placeholder="后4位数字"
                        maxLength={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 font-mono text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        完整手机号 <span className="text-dark-400 font-normal">(选填)</span>
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={phoneFull}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setPhoneFull(val);
                      }}
                      placeholder="11位手机号"
                      maxLength={11}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      快递公司
                    </label>
                    <select
                      value={courierCompany}
                      onChange={(e) => setCourierCompany(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 bg-white"
                    >
                      {COURIER_COMPANIES.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddBatchItem}
                    disabled={shelfFull}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-dark-700 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    添加到待入库列表
                  </button>
                </div>
              </div>

              {batchItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-dark-800">
                      待入库列表
                    </h2>
                    <button
                      onClick={() => setBatchItems([])}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      清空列表
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {batchItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                      >
                        <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium text-dark-700 truncate">
                            {item.trackingNumber}
                          </p>
                          <p className="text-xs text-dark-500">
                            {item.recipientName} · 尾号{item.phoneLast4} · {item.courierCompany}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveBatchItem(index)}
                          className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleBatchSubmit}
                    disabled={shelfFull}
                    className="w-full mt-4 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl shadow-lg shadow-primary-200 disabled:shadow-none hover:shadow-xl hover:shadow-primary-300 disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-6 h-6" />
                    确认批量入库 ({batchItems.length} 件)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          {mode === 'single' && (
            <div
              className={`bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl p-6 shadow-xl shadow-primary-200 sticky top-8 transition-all duration-500 ${
                successPackage ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
              }`}
            >
              <p className="text-white/80 text-sm font-medium mb-1">货架号</p>
              <div
                className={`text-5xl font-bold text-white font-mono mb-4 transition-all duration-300 ${
                  successPackage ? 'animate-bounce' : ''
                }`}
              >
                {successPackage ? successPackage.shelfNumber : '--'}
              </div>

              {successPackage && (
                <>
                  <div className="bg-white/20 rounded-xl p-4 mb-4">
                    <p className="text-white/70 text-xs mb-1">快递单号</p>
                    <p className="text-white font-mono text-sm">
                      {successPackage.trackingNumber}
                    </p>
                  </div>

                  <button
                    onClick={copyShelfNumber}
                    className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        复制货架号
                      </>
                    )}
                  </button>
                </>
              )}

              {!successPackage && (
                <p className="text-white/60 text-sm text-center mt-4">
                  登记成功后此处显示货架号
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-semibold text-dark-700 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              今日入库清单
            </h3>
            {todayPackages.length === 0 ? (
              <p className="text-sm text-dark-400 text-center py-4">
                今日暂无入库记录
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {todayPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-50"
                  >
                    <span className="font-mono font-bold text-primary-600 w-16">
                      {pkg.shelfNumber}
                    </span>
                    <ChevronRight className="w-4 h-4 text-dark-300" />
                    <span className="font-mono text-dark-600 truncate flex-1">
                      {pkg.trackingNumber.slice(-8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pkg.status === 'picked'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {pkg.status === 'picked' ? '已取' : '待取'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-dark-400">
              共 {todayPackages.length} 件入库
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-semibold text-dark-700 mb-4">操作提示</h3>
            <ul className="space-y-3 text-sm text-dark-500">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </span>
                <span>扫描枪扫描单号后按回车跳到姓名输入</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </span>
                <span>批量模式下，录入完一单按回车继续下一单</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </span>
                <span>库位满时请先在取件页面标记已取件释放库位</span>
              </li>
            </ul>
          </div>

          {todayBatchHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-dark-700 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-500" />
                  今日交接记录
                </h3>
                <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs font-bold rounded-full">
                  {todayBatchHistory.length} 批
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {todayBatchHistory.map((record, index) => (
                  <div
                    key={record.id}
                    className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-dark-400">
                        {record.batchNo.slice(-6)}
                      </span>
                      <span className="text-xs text-dark-500">
                        {formatDate(record.createdAt).slice(11)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary-600">
                        {record.successCount} 件
                      </span>
                      {record.failedCount > 0 && (
                        <span className="text-xs text-red-500">
                          失败 {record.failedCount}
                        </span>
                      )}
                      <span className="text-xs text-dark-400 ml-auto">
                        {record.summary.length} 家
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full mt-3 py-2 text-sm text-primary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                查看详细交接记录
              </button>
            </div>
          )}
        </div>
      </div>

      {showBatchResult && batchResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-dark-800">批量入库结果</h2>
                <p className="text-sm text-dark-500 mt-1">
                  {formatDate(Date.now())} 入库清单
                </p>
              </div>
              <button
                onClick={() => setShowBatchResult(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {batchResult.success.length}
                  </p>
                  <p className="text-sm text-green-600">成功入库</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {batchResult.failed.length}
                  </p>
                  <p className="text-sm text-red-600">入库失败</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-primary-600">
                    {batchSummary.length}
                  </p>
                  <p className="text-sm text-primary-600">快递公司</p>
                </div>
              </div>

              {batchSummary.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <PieChart className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-dark-700">入库清单摘要</h3>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {batchSummary.map((item, index) => (
                      <div
                        key={item.courierCompany}
                        className="flex items-center gap-4 p-3 bg-white rounded-lg"
                      >
                        <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <Truck className="w-4 h-4 text-dark-400" />
                          <span className="font-medium text-dark-700">
                            {item.courierCompany}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-primary-100 text-primary-600 rounded-full text-sm font-bold">
                          {item.count} 件
                        </span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-dark-400" />
                          <span className="text-xs text-dark-500">
                            {item.zones.join('、')}区
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {batchResult.success.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-dark-700 mb-3">成功入库清单</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {batchResult.success.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-xl"
                      >
                        <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </span>
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium text-dark-700">
                            {pkg.trackingNumber}
                          </p>
                          <p className="text-xs text-dark-500">
                            {pkg.recipientName} · {pkg.courierCompany}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-primary-600">
                          {pkg.shelfNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {batchResult.failed.length > 0 && (
                <div>
                  <h3 className="font-semibold text-dark-700 mb-3">入库失败清单</h3>
                  <div className="space-y-2">
                    {batchResult.failed.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-red-50 rounded-xl"
                      >
                        <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X className="w-4 h-4" />
                        </span>
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium text-dark-700">
                            {item.item.trackingNumber}
                          </p>
                          <p className="text-xs text-red-600">{item.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={printBatchResult}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-dark-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                打印入库清单
              </button>
              <button
                onClick={() => setShowBatchResult(false)}
                className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-800">
                    {isSelectedDateToday ? '今日' : selectedHistoryDate} 交接记录
                  </h2>
                  <p className="text-sm text-dark-500">
                    共 {selectedDateBatchHistory.length} 批 / 总入库{' '}
                    {selectedDateBatchHistory.reduce((s, r) => s + r.successCount, 0)} 件
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-600 transition-colors"
                  title="前一天"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedHistoryDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      if (val <= today) {
                        setSelectedHistoryDate(val);
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className="pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white"
                  />
                </div>
                <button
                  onClick={handleNextDay}
                  disabled={isSelectedDateToday}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                    isSelectedDateToday
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-dark-600'
                  }`}
                  title="后一天"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-dark-500 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {selectedDateBatchHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-dark-400">
                    {isSelectedDateToday
                      ? '今日暂无批量入库记录'
                      : `${selectedHistoryDate} 暂无批量入库记录`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateBatchHistory.map((record, idx) => (
                    <div
                      key={record.id}
                      className="border border-gray-200 rounded-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary-500 text-white rounded-xl flex items-center justify-center font-bold">
                            #{selectedDateBatchHistory.length - idx}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-dark-400">
                              批次号：{record.batchNo}
                            </p>
                            <p className="text-lg font-bold text-dark-800">
                              {formatDate(record.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {record.successCount}
                            </p>
                            <p className="text-xs text-green-600">成功</p>
                          </div>
                          {record.failedCount > 0 && (
                            <div className="text-center">
                              <p className="text-2xl font-bold text-red-600">
                                {record.failedCount}
                              </p>
                              <p className="text-xs text-red-600">失败</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Truck className="w-4 h-4 text-dark-400" />
                          <span className="text-sm font-medium text-dark-700">
                            快递公司分布
                          </span>
                        </div>
                        <div className="space-y-2">
                          {record.summary.map((item, sIdx) => (
                            <div
                              key={item.courierCompany}
                              className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg"
                            >
                              <span className="w-6 h-6 bg-white text-primary-600 rounded-full flex items-center justify-center text-xs font-bold border border-primary-200">
                                {sIdx + 1}
                              </span>
                              <span className="font-medium text-dark-700 text-sm flex-1">
                                {item.courierCompany}
                              </span>
                              <span className="px-2.5 py-1 bg-primary-100 text-primary-600 rounded-full text-xs font-bold">
                                {item.count} 件
                              </span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                                <span className="text-xs text-dark-500">
                                  {item.zones.join('、')}区
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
