import type { Package } from '@/types';
import { FOLLOW_UP_RESULT_LABELS } from '@/types';
import { formatDate } from './storage';

export function exportToCSV(packages: Package[]): void {
  const headers = [
    '快递单号',
    '收件人姓名',
    '手机尾号',
    '完整手机号',
    '快递公司',
    '货架号',
    '状态',
    '入库时间',
    '取件时间',
    '超期天数',
    '催件次数',
    '上次催件结果',
    '上次催件时间',
    '催件备注',
  ];

  const rows = packages.map((pkg) => {
    const followUps = pkg.followUps || [];
    const lastFollowUp =
      followUps.length > 0 ? followUps[followUps.length - 1] : null;
    const isPending = pkg.status === 'pending';
    const overdueDays = isPending
      ? Math.max(0, Math.floor((Date.now() - pkg.createdAt) / (24 * 60 * 60 * 1000)) - 3)
      : '';

    return [
      pkg.trackingNumber,
      pkg.recipientName,
      pkg.phoneLast4,
      pkg.phoneFull || '',
      pkg.courierCompany,
      pkg.shelfNumber,
      pkg.status === 'pending' ? '待取件' : '已取件',
      formatDate(pkg.createdAt),
      pkg.pickedAt ? formatDate(pkg.pickedAt) : '',
      overdueDays,
      followUps.length,
      lastFollowUp ? FOLLOW_UP_RESULT_LABELS[lastFollowUp.result] : '',
      lastFollowUp ? formatDate(lastFollowUp.contactedAt) : '',
      lastFollowUp?.note || '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `包裹统计_${new Date().toISOString().split('T')[0]}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlyStats(
  packages: Package[],
  year: number,
  month: number
): void {
  const monthPackages = packages.filter((pkg) => {
    const date = new Date(pkg.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const companyStats: Record<string, number> = {};
  monthPackages.forEach((pkg) => {
    companyStats[pkg.courierCompany] =
      (companyStats[pkg.courierCompany] || 0) + 1;
  });

  const sorted = Object.entries(companyStats).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

  const headers = ['排名', '快递公司', '入库数量', '占比'];
  const rows = sorted.map(([company, count], index) => [
    index + 1,
    company,
    count,
    `${((count / total) * 100).toFixed(1)}%`,
  ]);
  rows.push(['', '合计', total, '100%']);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `快递公司月度统计_${year}年${month + 1}月.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
