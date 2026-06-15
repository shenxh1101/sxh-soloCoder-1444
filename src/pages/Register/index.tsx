import { useState, useRef, useEffect } from 'react';
import { Copy, Check, PackagePlus, AlertCircle } from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import { COURIER_COMPANIES } from '@/types';

export default function Register() {
  const addPackage = usePackageStore((state) => state.addPackage);
  const packages = usePackageStore((state) => state.packages);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [courierCompany, setCourierCompany] = useState(COURIER_COMPANIES[0]);
  const [error, setError] = useState('');
  const [successPackage, setSuccessPackage] = useState<{
    shelfNumber: string;
    trackingNumber: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const trackingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackingInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!trackingNumber.trim()) {
      setError('请输入快递单号');
      return;
    }
    if (!recipientName.trim()) {
      setError('请输入收件人姓名');
      return;
    }
    if (!/^\d{4}$/.test(phoneLast4)) {
      setError('请输入正确的4位手机尾号');
      return;
    }

    const duplicate = packages.find(
      (p) =>
        p.trackingNumber === trackingNumber.trim() && p.status === 'pending'
    );
    if (duplicate) {
      setError(`该单号已存在，货架号：${duplicate.shelfNumber}`);
      return;
    }

    const newPkg = addPackage({
      trackingNumber: trackingNumber.trim(),
      recipientName: recipientName.trim(),
      phoneLast4,
      courierCompany,
    });

    setSuccessPackage({
      shelfNumber: newPkg.shelfNumber,
      trackingNumber: newPkg.trackingNumber,
    });

    setTrackingNumber('');
    setRecipientName('');
    setPhoneLast4('');

    setTimeout(() => {
      trackingInputRef.current?.focus();
    }, 100);
  };

  const copyShelfNumber = () => {
    if (successPackage) {
      navigator.clipboard.writeText(successPackage.shelfNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-800 mb-2">包裹登记</h1>
        <p className="text-dark-500">录入快递信息，系统自动分配货架号</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  快递单号
                </label>
                <input
                  ref={trackingInputRef}
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
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
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-lg rounded-xl shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <PackagePlus className="w-6 h-6" />
                登记入库
              </button>
            </form>
          </div>
        </div>

        <div>
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

          <div className="mt-6 bg-white rounded-2xl shadow-card p-6">
            <h3 className="font-semibold text-dark-700 mb-4">小提示</h3>
            <ul className="space-y-3 text-sm text-dark-500">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </span>
                <span>扫描枪扫描单号后自动跳到姓名输入框</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </span>
                <span>按回车键快速提交登记</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </span>
                <span>货架号自动分配，先到先得</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
