import { useState } from 'react';
import {
  Phone,
  MapPin,
  User,
  Clock,
  MessageSquare,
  Plus,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { usePackageStore } from '@/hooks/usePackageStore';
import {
  FOLLOW_UP_RESULT_LABELS,
  type FollowUpRecord,
  type Package,
} from '@/types';
import { formatDate, getOverdueDays } from '@/utils/storage';

interface FollowUpModalProps {
  pkg: Package;
  onClose: () => void;
}

function FollowUpModal({ pkg, onClose }: FollowUpModalProps) {
  const addFollowUp = usePackageStore((state) => state.addFollowUp);

  const [result, setResult] = useState<FollowUpRecord['result']>('not_answered');
  const [note, setNote] = useState('');
  const [nextReminderDays, setNextReminderDays] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextReminderAt = nextReminderDays
      ? Date.now() + parseInt(nextReminderDays) * 24 * 60 * 60 * 1000
      : undefined;

    addFollowUp(pkg.id, {
      result,
      note: note.trim(),
      nextReminderAt,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark-800">电话催件记录</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-bold text-primary-600 text-lg">
                {pkg.shelfNumber}
              </span>
              <span
                className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full"
              >
                超期{getOverdueDays(pkg.createdAt)}天
              </span>
            </div>
            <p className="font-mono text-sm text-dark-600 mb-1">
              {pkg.trackingNumber}
            </p>
            <div className="flex items-center gap-2 text-sm text-dark-500">
              <User className="w-4 h-4" />
              <span>{pkg.recipientName}</span>
              {pkg.phoneFull && (
                <span className="font-mono text-primary-600 font-medium">
                  {pkg.phoneFull}
                </span>
              )}
              {!pkg.phoneFull && (
                <span className="text-dark-300">尾号 {pkg.phoneLast4}</span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                联系结果
              </label>
              <select
                value={result}
                onChange={(e) =>
                  setResult(e.target.value as FollowUpRecord['result'])
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 bg-white"
              >
                {Object.entries(FOLLOW_UP_RESULT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  备注说明
                </span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="记录沟通内容、特殊要求等..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  下次提醒（天后）
                </span>
              </label>
              <input
                type="number"
                value={nextReminderDays}
                onChange={(e) => setNextReminderDays(e.target.value)}
                min="1"
                max="30"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200"
              />
              <p className="text-xs text-dark-400 mt-1">
                填写后会在对应日期显示待提醒
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              保存记录
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface OverdueFollowUpCardProps {
  pkg: Package;
}

export default function OverdueFollowUpCard({ pkg }: OverdueFollowUpCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const overdueDays = getOverdueDays(pkg.createdAt);
  const followUps = pkg.followUps || [];

  const needsReminderToday = followUps.some((f) => {
    if (!f.nextReminderAt) return false;
    const reminderDate = new Date(f.nextReminderAt);
    const today = new Date();
    return (
      reminderDate.getFullYear() === today.getFullYear() &&
      reminderDate.getMonth() === today.getMonth() &&
      reminderDate.getDate() <= today.getDate()
    );
  });

  const lastFollowUp = followUps.length > 0 ? followUps[followUps.length - 1] : null;

  return (
    <>
      <div
        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
          needsReminderToday
            ? 'bg-orange-50 border-orange-300'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary-600">
              {pkg.shelfNumber}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                needsReminderToday
                  ? 'bg-orange-500 text-white animate-pulse'
                  : 'bg-red-500 text-white'
              }`}
            >
              {needsReminderToday ? '今日待提醒' : `超期${overdueDays}天`}
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <Phone className="w-4 h-4" />
            {lastFollowUp ? '再次联系' : '电话催件'}
          </button>
        </div>

        <div className="font-mono text-sm font-medium text-dark-700 mb-1">
          {pkg.trackingNumber}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark-500 mb-2">
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {pkg.recipientName}
          </span>
          {pkg.phoneFull ? (
            <span className="flex items-center gap-1 font-mono text-primary-600">
              <Phone className="w-4 h-4" />
              {pkg.phoneFull}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              尾号 {pkg.phoneLast4}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDate(pkg.createdAt)}
          </span>
        </div>

        <div className="text-sm text-dark-500 flex items-center gap-1 mb-2">
          <MapPin className="w-4 h-4" />
          <span>{pkg.courierCompany}</span>
        </div>

        {lastFollowUp && (
          <div className="mt-2 pt-2 border-t border-red-100">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-sm text-dark-500 hover:text-dark-700"
            >
              <span>
                上次联系：{formatDate(lastFollowUp.contactedAt)} ·{' '}
                {FOLLOW_UP_RESULT_LABELS[lastFollowUp.result]}
              </span>
              {followUps.length > 1 && (
                <span className="flex items-center gap-1">
                  {followUps.length}条记录
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              )}
            </button>

            {showHistory && followUps.length > 0 && (
              <div className="mt-3 space-y-2">
                {[...followUps].reverse().map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-white rounded-lg text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dark-400">
                        {formatDate(f.contactedAt)}
                      </span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs font-medium rounded-full">
                        {FOLLOW_UP_RESULT_LABELS[f.result]}
                      </span>
                    </div>
                    {f.note && (
                      <p className="text-dark-600">{f.note}</p>
                    )}
                    {f.nextReminderAt && (
                      <p className="text-xs text-dark-400 mt-1">
                        下次提醒：{formatDate(f.nextReminderAt).split(' ')[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <FollowUpModal pkg={pkg} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
