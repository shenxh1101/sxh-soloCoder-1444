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
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const allDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    allDates.push(`${monthPrefix}-${String(d).padStart(2, '0')}`);
  }

  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const receivedInMonth = packages.filter(
    (p) => p.createdAt >= monthStart && p.createdAt <= monthEnd
  );
  const pickedInMonth = packages.filter(
    (p) => p.pickedAt && p.pickedAt >= monthStart && p.pickedAt <= monthEnd
  );

  const totalReceived = receivedInMonth.length;
  const totalPicked = pickedInMonth.length;
  const pendingAtMonthEnd = packages.filter((p) => {
    if (p.createdAt > monthEnd) return false;
    return !p.pickedAt || p.pickedAt > monthEnd;
  }).length;
  const overdueAtMonthEnd = packages.filter((p) => {
    if (p.createdAt > monthEnd) return false;
    if (p.pickedAt && p.pickedAt <= monthEnd) return false;
    return (monthEnd - p.createdAt) > 3 * 24 * 60 * 60 * 1000;
  }).length;

  const safePercent = (a: number, b: number) =>
    b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '0.0%';
  const pickupRate = totalReceived > 0
    ? safePercent(totalPicked, totalReceived)
    : '0.0%';

  const companies = new Set<string>();
  packages.forEach((p) => companies.add(p.courierCompany));
  const companyList = Array.from(companies).sort();

  const dailyStats: Record<
    string,
    {
      received: number;
      picked: number;
      pendingEnd: number;
      overdueEnd: number;
      receivedByCompany: Record<string, number>;
    }
  > = {};
  allDates.forEach((d) => {
    const receivedByCompany: Record<string, number> = {};
    companyList.forEach((c) => (receivedByCompany[c] = 0));
    dailyStats[d] = {
      received: 0,
      picked: 0,
      pendingEnd: 0,
      overdueEnd: 0,
      receivedByCompany,
    };
  });

  packages.forEach((pkg) => {
    const createdDate = formatDateShort(pkg.createdAt);
    if (dailyStats[createdDate]) {
      dailyStats[createdDate].received += 1;
      dailyStats[createdDate].receivedByCompany[pkg.courierCompany] =
        (dailyStats[createdDate].receivedByCompany[pkg.courierCompany] || 0) + 1;
    }
    if (pkg.pickedAt) {
      const pickedDate = formatDateShort(pkg.pickedAt);
      if (dailyStats[pickedDate]) {
        dailyStats[pickedDate].picked += 1;
      }
    }
  });

  allDates.forEach((d) => {
    const dayEnd = new Date(`${d}T23:59:59`).getTime();
    let pending = 0;
    let overdue = 0;
    packages.forEach((pkg) => {
      if (pkg.createdAt > dayEnd) return;
      const pickedBeforeEnd = pkg.pickedAt && pkg.pickedAt <= dayEnd;
      if (!pickedBeforeEnd) {
        pending += 1;
        const daysDiff = (dayEnd - pkg.createdAt) / (24 * 60 * 60 * 1000);
        if (daysDiff > 3) overdue += 1;
      }
    });
    dailyStats[d].pendingEnd = pending;
    dailyStats[d].overdueEnd = overdue;
  });

  const companyStats: Record<string, number> = {};
  receivedInMonth.forEach((pkg) => {
    companyStats[pkg.courierCompany] =
      (companyStats[pkg.courierCompany] || 0) + 1;
  });
  const sortedCompanies = Object.entries(companyStats).sort((a, b) => b[1] - a[1]);

  const overviewHeaders = ['指标', '数值', '说明'];
  const overviewRows = [
    ['总入库件数', totalReceived, `按入库日期（${monthPrefix}）统计`],
    ['总取件数', totalPicked, `按取件日期（${monthPrefix}）统计，含跨月包裹`],
    ['月末待取件数', pendingAtMonthEnd, `截止月末未取件数`],
    ['月末超期件数', overdueAtMonthEnd, `入库超过3天且月末仍未取`],
    ['取件率', pickupRate, `本月取件数 / 本月入库数`],
    ['日均入库', totalReceived > 0 ? (totalReceived / daysInMonth).toFixed(1) : '0', ''],
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
    })(), ''],
    ['取件峰值日', (() => {
      let maxDate = '';
      let maxVal = 0;
      allDates.forEach((d) => {
        if (dailyStats[d].picked > maxVal) {
          maxVal = dailyStats[d].picked;
          maxDate = d;
        }
      });
      return maxDate ? `${maxDate}（${maxVal}件）` : '无数据';
    })(), ''],
  ];

  const trendHeaders = [
    '日期',
    '入库件数',
    '取件件数',
    '当日待取',
    '当日超期',
    '净增量',
    ...companyList,
  ];
  const trendRows = allDates.map((d) => {
    const s = dailyStats[d];
    return [
      d,
      s.received,
      s.picked,
      s.pendingEnd,
      s.overdueEnd,
      s.received - s.picked,
      ...companyList.map((c) => s.receivedByCompany[c] || 0),
    ];
  });
  trendRows.push([
    '月合计',
    totalReceived,
    totalPicked,
    pendingAtMonthEnd,
    overdueAtMonthEnd,
    totalReceived - totalPicked,
    ...companyList.map((c) => companyStats[c] || 0),
  ]);

  const summaryHeaders = ['排名', '快递公司', '入库数量', '占比'];
  let summaryRows: (string | number)[][] = [];
  if (sortedCompanies.length > 0) {
    summaryRows = sortedCompanies.map(([company, count], index) => [
      index + 1,
      company,
      count,
      safePercent(count, totalReceived),
    ]);
    summaryRows.push(['', '合计', totalReceived, '100.0%']);
  } else {
    summaryRows = [['-', '暂无数据', 0, '0.0%']];
  }

  const pickupTrendHeaders = ['日期', ...companyList, '合计'];
  const pickupByCompanyDaily: Record<string, Record<string, number>> = {};
  allDates.forEach((d) => {
    pickupByCompanyDaily[d] = {};
    companyList.forEach((c) => (pickupByCompanyDaily[d][c] = 0));
  });
  pickedInMonth.forEach((pkg) => {
    const pickedDate = formatDateShort(pkg.pickedAt!);
    if (pickupByCompanyDaily[pickedDate]) {
      pickupByCompanyDaily[pickedDate][pkg.courierCompany] += 1;
    }
  });
  const pickupTrendRows = allDates.map((d) => {
    const dayData = pickupByCompanyDaily[d];
    const dayTotal = companyList.reduce((s, c) => s + (dayData[c] || 0), 0);
    return [d, ...companyList.map((c) => dayData[c] || 0), dayTotal];
  });
  pickupTrendRows.push([
    '月合计',
    ...companyList.map((c) =>
      pickedInMonth.filter((p) => p.courierCompany === c).length
    ),
    totalPicked,
  ]);

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

  const detailPackages = packages.filter((pkg) => {
    if (pkg.createdAt >= monthStart && pkg.createdAt <= monthEnd) return true;
    if (pkg.pickedAt && pkg.pickedAt >= monthStart && pkg.pickedAt <= monthEnd) return true;
    return false;
  }).sort((a, b) => a.createdAt - b.createdAt);

  const detailRows = detailPackages.length > 0
    ? detailPackages.map((pkg) => {
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
    `===== ${year}年${month + 1}月 运营月报 =====`,
    '',
    '说明：入库数按入库日期统计，取件数按实际取件日期统计（含上月入库本月取件）',
    '',
    '--- 1. 月度概览 ---',
    overviewHeaders.join(','),
    ...overviewRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 2. 快递公司入库统计 ---',
    ...(sortedCompanies.length === 0 ? ['本月暂无快递入库记录'] : []),
    summaryHeaders.join(','),
    ...summaryRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 3. 每日运营趋势（含各公司入库）---',
    trendHeaders.join(','),
    ...trendRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '--- 4. 各快递公司每日取件走势 ---',
    pickupTrendHeaders.join(','),
    ...pickupTrendRows.map((row) => row.map(escapeCell).join(',')),
    '',
    '',
    `===== ${year}年${month + 1}月 包裹明细 =====`,
    '说明：包含本月入库、本月取件的所有包裹（含上月入库本月取件）',
    ...(detailPackages.length === 0 ? ['本月暂无包裹数据'] : []),
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
