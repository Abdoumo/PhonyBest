const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.join(__dirname, 'admin_front');
let dashboardPath = path.join(FRONTEND_PATH, 'src/pages/DashboardPage.jsx');

if (fs.existsSync(dashboardPath)) {
  let dbCode = fs.readFileSync(dashboardPath, 'utf8');
  
  if (!dbCode.includes('const mg = stats?.modemGridStats')) {
    // Add modemGridStats variable
    dbCode = dbCode.replace(
      '  const s = stats?.stats || {};\n  const chart = stats?.chartData?.length ? stats.chartData : mockChart;',
      '  const s = stats?.stats || {};\n  const mg = stats?.modemGridStats || {};\n  const chart = stats?.chartData?.length ? stats.chartData : mockChart;'
    );
    
    // Update the stat cards array
    const oldCards = `  const statCards = [
    { label: t("رصيدي الحالي"), value: isAdmin ? t('لا محدود') : \`\${(s.myWalletBalance || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiDollarSign, color: 'success' },
    { label: t("أرباح اليوم"), value: \`\${(s.todayEarnings || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiTrendingUp, color: 'accent', trend: '+12.5%', up: true },
    { label: t('المعاملات'), value: s.totalTransactions || 0, icon: FiActivity, color: 'info', trend: '+8.3%', up: true },
    { label: t('عمليات فاشلة'), value: s.failedOperations || 0, icon: FiAlertTriangle, color: 'danger', trend: '-2.1%', up: false },
    isAdmin && { label: t('شرائح نشطة'), value: s.activeSims || 0, icon: FiCpu, color: 'success' },
    isAdmin && { label: t('إجمالي المحافظ (للكل)'), value: \`\${(s.totalWalletBalance || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiUsers, color: 'warning' },
  ].filter(Boolean);`;

    const newCards = `  const statCards = [
    { label: t("رصيدي الحالي"), value: isAdmin ? t('لا محدود') : \`\${(s.myWalletBalance || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiDollarSign, color: 'success' },
    { label: t("أرباح اليوم"), value: \`\${(s.todayEarnings || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiTrendingUp, color: 'accent', trend: '+12.5%', up: true },
    { label: t('المعاملات'), value: s.totalTransactions || 0, icon: FiActivity, color: 'info', trend: '+8.3%', up: true },
    { label: t('عمليات فاشلة'), value: s.failedOperations || 0, icon: FiAlertTriangle, color: 'danger', trend: '-2.1%', up: false },
    isAdmin && { label: t('شرائح نشطة (ModemGrid)'), value: (mg.onlineDongles !== undefined ? mg.onlineDongles : s.activeSims) || 0, icon: FiCpu, color: 'success' },
    isAdmin && { label: t('رصيد المودمات (ModemGrid)'), value: \`\${(mg.totalBalance || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiDollarSign, color: 'info' },
    isAdmin && { label: t('إجمالي المحافظ (للكل)'), value: \`\${(s.totalWalletBalance || 0).toLocaleString()} \${t('د.ج')}\`, icon: FiUsers, color: 'warning' },
  ].filter(Boolean);`;

    dbCode = dbCode.replace(oldCards, newCards);
    fs.writeFileSync(dashboardPath, dbCode);
    console.log('✅ Patched admin_front/src/pages/DashboardPage.jsx');
  } else {
    console.log('DashboardPage already patched.');
  }
} else {
  console.log('⚠️ Could not find DashboardPage.jsx');
}
