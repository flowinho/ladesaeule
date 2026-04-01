function roundNumber(value) {
  return Number(value.toFixed(2));
}

function getMonthKey(dateValue) {
  return String(dateValue).slice(0, 7);
}

function buildMonthRange(monthsBack) {
  const months = [];
  const today = new Date();

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const current = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }

  return months;
}

function buildMonthlyStats({ monthlyKilometers, transactions, monthsBack }) {
  const months = buildMonthRange(monthsBack);
  const transactionTotals = {};

  for (const transaction of transactions) {
    const month = getMonthKey(transaction.date);
    if (!transactionTotals[month]) {
      transactionTotals[month] = {
        kwh: 0,
        cost: 0
      };
    }

    transactionTotals[month].kwh += Number(transaction.kwh) || 0;
    transactionTotals[month].cost += Number(transaction.totalCost) || 0;
  }

  const energyPerMonth = [];
  const kilometersPerMonth = [];
  const costPer100Km = [];
  const chargingCostPerMonth = [];

  for (const month of months) {
    const kilometers = Number(monthlyKilometers[month]) || 0;
    const totals = transactionTotals[month] || { kwh: 0, cost: 0 };
    const monthlyCostPer100Km = kilometers > 0 ? roundNumber((totals.cost / kilometers) * 100) : null;

    energyPerMonth.push(roundNumber(totals.kwh));
    kilometersPerMonth.push(roundNumber(kilometers));
    chargingCostPerMonth.push(roundNumber(totals.cost));
    costPer100Km.push(monthlyCostPer100Km);
  }

  return {
    months,
    energyPerMonth,
    kilometersPerMonth,
    chargingCostPerMonth,
    costPer100Km
  };
}

module.exports = {
  buildMonthlyStats
};
