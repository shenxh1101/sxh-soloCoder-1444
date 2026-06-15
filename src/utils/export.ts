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

  const pendingCount = monthPackages.filter((p) => p.status === 'pending').length;
  const pickedCount = monthPackages.filter((p) => p.status === 'picked').length;
  const overdueCount = monthPackages.filter((p) => {
    if (p.status !== 'pending') return false;
    return (Date.now() - p.createdAt) > 3 * 24 * 60 * 60 * 1000;
  }).length;

  const summaryHeaders = ['排名', '快递公司', '入库数量', '占比'];
  const summaryRows = sorted.map(([company, count], index) => [
    index + 1,
    company,
    count,
    `${((count / total) * 100).toFixed(1)}%`,
  ]);
  summaryRows.push(['', '合计', total, '100%']);

  const overviewHeaders = ['指标', '数值'];
  const overviewRows = [
    ['总入库件数', total],
    ['已取件数', pickedCount],
    ['待取件数', pendingCount],
    ['超期件数', overdueCount],
    ['取件率', `${((pickedCount / total) * 100).toFixed(1)}%`],
  ];

  const detailHeaders = [
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
    '下次提醒时间',
    '催件备注',
  ];

  const detailRows = monthPackages.map((pkg) => {
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
      lastFollowUp?.nextReminderAt ? formatDate(lastFollowUp.nextReminderAt) : '',
      lastFollowUp?.note || '',
    ];
  });

  const escapeCell = (cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`;

  const csvContent = [
    `===== ${year}年${month + 1}月 运营汇总 =====`,
    '',
    '--- 月度概览 ---',
    overviewHeaders.join(','),
    ...overviewRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 快递公司入库统计 ---',
    summaryHeaders.join(','),
    ...summaryRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '',
    `===== ${year}年${month + 1}月 包裹明细 =====`,
    detailHeaders.join(','),
    ...detailRows.map((row) => row.map(escapeCell).join(',')),
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
    `月度运营报表_${year}年${month + 1}月.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
