import type { Package } from '@/types';
import { FOLLOW_UP_RESULT_LABELS } from '@/types';
import { formatDate, formatDateShort, isOverdue } from './storage';

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
    '下次提醒时间',
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
      lastFollowUp?.nextReminderAt ? formatDate(lastFollowUp.nextReminderAt) : '',
      lastFollowUp?.note || '',
    ];
  });

  const escapeCell = (cell: unknown) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
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
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    allDates.push(dateStr);
  }

  const monthPackages = packages.filter((pkg) => {
    const date = new Date(pkg.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  const total = monthPackages.length;
  const pickedCount = monthPackages.filter((p) => p.status === 'picked').length;
  const pendingCount = monthPackages.filter((p) => p.status === 'pending').length;
  const overdueCount = monthPackages.filter(
    (p) => p.status === 'pending' && isOverdue(p.createdAt)
  ).length;
  const pickupRate = total > 0 ? `${((pickedCount / total) * 100).toFixed(1)}%` : '0.0%';

  const companyStats: Record<string, number> = {};
  monthPackages.forEach((pkg) => {
    companyStats[pkg.courierCompany] =
      (companyStats[pkg.courierCompany] || 0) + 1;
  });
  const sorted = Object.entries(companyStats).sort((a, b) => b[1] - a[1]);

  const dailyStats: Record<string, { received: number; picked: number; overdueNew: number; pendingEnd: number }> = {};
  allDates.forEach((d) => {
    dailyStats[d] = { received: 0, picked: 0, overdueNew: 0, pendingEnd: 0 };
  });

  monthPackages.forEach((pkg) => {
    const createdDate = formatDateShort(pkg.createdAt);
    if (dailyStats[createdDate]) {
      dailyStats[createdDate].received += 1;
    }
    if (pkg.pickedAt) {
      const pickedDate = formatDateShort(pkg.pickedAt);
      if (pickedDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        if (dailyStats[pickedDate]) {
          dailyStats[pickedDate].picked += 1;
        }
      }
    }
  });

  const pendingPackagesByDay: Record<string, number> = {};
  allDates.forEach((d) => {
    const dayEnd = new Date(`${d}T23:59:59`).getTime();
    let pending = 0;
    let overdueOnDay = 0;
    packages.forEach((pkg) => {
      if (pkg.createdAt > dayEnd) return;
      const isPickedBefore = pkg.pickedAt && pkg.pickedAt <= dayEnd;
      if (!isPickedBefore) {
        pending += 1;
        const daysDiff = (dayEnd - pkg.createdAt) / (24 * 60 * 60 * 1000);
        if (daysDiff > 3) {
          overdueOnDay += 1;
        }
      }
    });
    pendingPackagesByDay[d] = pending;
    if (dailyStats[d]) {
      dailyStats[d].pendingEnd = pending;
      dailyStats[d].overdueNew = overdueOnDay;
    }
  });

  const trendHeaders = ['日期', '入库件数', '取件件数', '当日待取', '当日超期', '净增量'];
  const trendRows = allDates.map((d) => {
    const s = dailyStats[d];
    return [
      d,
      s.received,
      s.picked,
      s.pendingEnd,
      s.overdueNew,
      s.received - s.picked,
    ];
  });
  trendRows.push([
    '月合计',
    total,
    pickedCount + monthPackages.filter((p) => {
      if (!p.pickedAt) return false;
      const pd = formatDateShort(p.pickedAt);
      return pd.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
    }).length - pickedCount,
    pendingCount,
    overdueCount,
    total - pickedCount,
  ]);

  const safePercent = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '0.0%');

  const overviewHeaders = ['指标', '数值'];
  const overviewRows = [
    ['总入库件数', total],
    ['已取件数', pickedCount],
    ['待取件数', pendingCount],
    ['超期件数', overdueCount],
    ['取件率', pickupRate],
    ['日均入库', total > 0 ? (total / daysInMonth).toFixed(1) : '0'],
    ['入库峰值日', (() => {
      let maxDate = '';
      let maxVal = 0;
      allDates.forEach((d) => {
        if (dailyStats[d].received > maxVal) {
          maxVal = dailyStats[d].received;
          maxDate = d;
        }
      });
      return maxDate ? `${maxDate}（${maxVal}件）` : '无数据';
    })()],
  ];

  const summaryHeaders = ['排名', '快递公司', '入库数量', '占比'];
  let summaryRows: (string | number)[][] = [];
  if (sorted.length > 0) {
    summaryRows = sorted.map(([company, count], index) => [
      index + 1,
      company,
      count,
      safePercent(count, total),
    ]);
    summaryRows.push(['', '合计', total, '100.0%']);
  } else {
    summaryRows = [['-', '暂无数据', 0, '0.0%']];
  }

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

  const detailRows = monthPackages.length > 0
    ? monthPackages.map((pkg) => {
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
      })
    : [['', '', '', '', '', '', '', '', '', '', '', '', '', '', '本月暂无包裹数据']];

  const escapeCell = (cell: unknown) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

  const csvContent = [
    `===== ${year}年${month + 1}月 运营汇总 =====`,
    '',
    '--- 月度概览 ---',
    overviewHeaders.join(','),
    ...overviewRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 快递公司入库统计 ---',
    ...(sorted.length === 0 ? ['本月暂无快递入库记录'] : []),
    summaryHeaders.join(','),
    ...summaryRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 每日运营趋势 ---',
    trendHeaders.join(','),
    ...trendRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '',
    `===== ${year}年${month + 1}月 包裹明细 =====`,
    ...(monthPackages.length === 0 ? ['本月暂无包裹数据'] : []),
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
