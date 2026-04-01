const bootstrapElement = document.getElementById('bootstrap-data');
const bootstrapState = bootstrapElement ? JSON.parse(bootstrapElement.textContent) : {
  monthlyKilometers: {},
  transactions: [],
  notice: '',
  error: ''
};

const state = {
  monthlyKm: bootstrapState.monthlyKilometers || {},
  transactions: bootstrapState.transactions || [],
  range: 3,
  charts: {},
  deferredPrompt: null,
  filters: {
    monthlyKmYear: 'all',
    transactionsMonth: 'all'
  },
  ultrawideEnabled: window.localStorage.getItem('ladeschweinle-ultrawide') === 'true'
};

const THEMES = {
  dracula: { label: 'Dracula' },
  things3: { label: 'Things 3' },
  catppuccin: { label: 'Catppuccin' },
  tomorrow: { label: 'Tomorrow' },
  oledDark: { label: 'OLED Dark' }
};

const monthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric'
});

const shortMonthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'short',
  year: '2-digit'
});

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR'
});

const decimalFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const toast = document.getElementById('toast');
const appShellElement = document.querySelector('.app-shell');
const monthlyKmTableBody = document.getElementById('monthlyKmTableBody');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const monthlyKmFilter = document.getElementById('monthlyKmFilter');
const transactionsFilter = document.getElementById('transactionsFilter');
const summaryMetrics = document.getElementById('summaryMetrics');
const addMonthlyKmButton = document.getElementById('addMonthlyKmButton');
const addTransactionButton = document.getElementById('addTransactionButton');
const installButton = document.getElementById('installButton');
const ultrawideButton = document.getElementById('ultrawideButton');
const themeButton = document.getElementById('themeButton');
const settingsButton = document.getElementById('settingsButton');
const themePanel = document.getElementById('themePanel');
const themeBackdrop = document.getElementById('themeBackdrop');
const closeThemeButton = document.getElementById('closeThemeButton');
const themeOptions = document.getElementById('themeOptions');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const dangerActionButtons = document.querySelectorAll('[data-danger-action]');
const jsonImportForm = document.getElementById('jsonImportForm');
const csvImportForm = document.getElementById('csvImportForm');
const jsonImportInput = document.getElementById('jsonImportInput');
const csvImportInput = document.getElementById('csvImportInput');
const jsonPayloadInput = document.getElementById('jsonPayloadInput');
const csvTextInput = document.getElementById('csvTextInput');
const editorPanel = document.getElementById('editorPanel');
const editorBackdrop = document.getElementById('editorBackdrop');
const closeEditorButton = document.getElementById('closeEditorButton');
const editorForm = document.getElementById('editorForm');
const deleteEntryButton = document.getElementById('deleteEntryButton');
const editorType = document.getElementById('editorType');
const editorMode = document.getElementById('editorMode');
const editorId = document.getElementById('editorId');
const editorMonthValue = document.getElementById('editorMonthValue');
const monthlyEditorFields = document.getElementById('monthlyEditorFields');
const transactionEditorFields = document.getElementById('transactionEditorFields');
const editorMonthSelect = document.getElementById('editorMonthSelect');
const editorYearSelect = document.getElementById('editorYearSelect');
const editorKilometers = document.getElementById('editorKilometers');
const editorOdometer = document.getElementById('editorOdometer');
const editorOdometerHint = document.getElementById('editorOdometerHint');
const editorDate = document.getElementById('editorDate');
const editorKwh = document.getElementById('editorKwh');
const editorPricePerKwh = document.getElementById('editorPricePerKwh');
const editorFee = document.getElementById('editorFee');
const contentElement = document.querySelector('.content');
const editorTitle = document.getElementById('editorTitle');
const themeMetaTag = document.querySelector('meta[name="theme-color"]');
const confirmPanel = document.getElementById('confirmPanel');
const confirmBackdrop = document.getElementById('confirmBackdrop');
const closeConfirmButton = document.getElementById('closeConfirmButton');
const cancelConfirmButton = document.getElementById('cancelConfirmButton');
const confirmActionButton = document.getElementById('confirmActionButton');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');

state.theme = window.localStorage.getItem('ladeschweinle-theme') || 'things3';
state.pendingDangerAction = null;
state.monthlyKilometersAutoFilled = false;

function openThemeDialog() {
  themePanel.classList.add('open');
  themePanel.setAttribute('aria-hidden', 'false');
}

function closeThemeDialog() {
  themePanel.classList.remove('open');
  themePanel.setAttribute('aria-hidden', 'true');
}

function getThemeColorValue(variableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

function toAlphaColor(hexColor, alpha) {
  const sanitized = hexColor.replace('#', '');
  const color = sanitized.length === 3
    ? sanitized.split('').map((part) => part + part).join('')
    : sanitized;
  const red = parseInt(color.slice(0, 2), 16);
  const green = parseInt(color.slice(2, 4), 16);
  const blue = parseInt(color.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function applyTheme(themeName) {
  const resolvedTheme = Object.hasOwn(THEMES, themeName) ? themeName : 'things3';
  state.theme = resolvedTheme;
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  window.localStorage.setItem('ladeschweinle-theme', resolvedTheme);

  if (themeMetaTag) {
    themeMetaTag.setAttribute('content', getThemeColorValue('--bg'));
  }

  themeOptions.querySelectorAll('button[data-theme]').forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === resolvedTheme);
    button.setAttribute('aria-checked', String(button.dataset.theme === resolvedTheme));
  });

  if (Object.keys(state.charts).length) {
    renderCharts();
  }
}

function renderThemeOptions() {
  themeOptions.innerHTML = Object.entries(THEMES)
    .map(([value, theme]) => `
      <button class="theme-choice-button" type="button" role="radio" data-theme="${value}" aria-checked="false">
        <span>${theme.label}</span>
      </button>
    `)
    .join('');
}

function setupThemes() {
  renderThemeOptions();

  themeButton.addEventListener('click', openThemeDialog);
  closeThemeButton.addEventListener('click', closeThemeDialog);
  themeBackdrop.addEventListener('click', closeThemeDialog);
  themeOptions.addEventListener('click', (event) => {
    const target = event.target.closest('[data-theme]');
    if (!target) {
      return;
    }

    applyTheme(target.dataset.theme);
    closeThemeDialog();
  });

  applyTheme(state.theme);
}

function showToast(message, variant = 'success') {
  if (!message) {
    return;
  }

  toast.textContent = message;
  toast.className = `toast visible ${variant}`;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function getAvailableMonthlyKmYears() {
  return Array.from(new Set(Object.keys(state.monthlyKm).map((month) => month.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
}

function getAvailableTransactionMonths() {
  return Array.from(new Set(state.transactions.map((transaction) => String(transaction.date).slice(0, 7)))).sort((a, b) => b.localeCompare(a));
}

function renderFilters() {
  const years = getAvailableMonthlyKmYears();
  const months = getAvailableTransactionMonths();

  monthlyKmFilter.innerHTML = ['<option value="all">Alle Jahre</option>', ...years.map((year) => `<option value="${year}">${year}</option>`)].join('');
  transactionsFilter.innerHTML = ['<option value="all">Alle Monate</option>', ...months.map((month) => `<option value="${month}">${formatMonthLong(month)}</option>`)].join('');

  if (!years.includes(state.filters.monthlyKmYear)) {
    state.filters.monthlyKmYear = 'all';
  }

  if (!months.includes(state.filters.transactionsMonth)) {
    state.filters.transactionsMonth = 'all';
  }

  monthlyKmFilter.value = state.filters.monthlyKmYear;
  transactionsFilter.value = state.filters.transactionsMonth;
}

function openSettings() {
  settingsPanel.classList.add('open');
  settingsPanel.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsPanel.setAttribute('aria-hidden', 'true');
}

function openEditor() {
  editorPanel.classList.add('open');
  editorPanel.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  editorPanel.classList.remove('open');
  editorPanel.setAttribute('aria-hidden', 'true');
}

function openConfirmDialog(title, message, action) {
  state.pendingDangerAction = action;
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmPanel.classList.add('open');
  confirmPanel.setAttribute('aria-hidden', 'false');
}

function closeConfirmDialog() {
  state.pendingDangerAction = null;
  confirmPanel.classList.remove('open');
  confirmPanel.setAttribute('aria-hidden', 'true');
}

function submitPost(url, fields) {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = url;
  form.hidden = true;

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

function formatMonthLabel(month) {
  const [year, monthPart] = month.split('-');
  return shortMonthFormatter.format(new Date(Number(year), Number(monthPart) - 1, 1));
}

function formatMonthLong(month) {
  const [year, monthPart] = month.split('-');
  return monthFormatter.format(new Date(Number(year), Number(monthPart) - 1, 1));
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getMonthlyEntry(month) {
  return state.monthlyKm[month] && typeof state.monthlyKm[month] === 'object'
    ? state.monthlyKm[month]
    : null;
}

function getMonthlyKilometersValue(month) {
  const entry = getMonthlyEntry(month);
  return Number(entry?.kilometers) || 0;
}

function getMonthlyOdometerValue(month) {
  const entry = getMonthlyEntry(month);
  return entry && Number.isFinite(Number(entry.odometer)) ? Number(entry.odometer) : null;
}

function getPreviousMonthKey(month) {
  const [year, monthPart] = month.split('-').map(Number);
  const previousDate = new Date(year, monthPart - 2, 1);
  return `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthRange(monthsBack) {
  const months = [];
  const today = new Date();

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const current = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
  }

  return months;
}

function buildMonthlyStats(monthsBack) {
  const months = buildMonthRange(monthsBack);
  const transactionTotals = {};
  const currentMonth = buildMonthRange(1)[0];

  state.transactions.forEach((transaction) => {
    const month = String(transaction.date).slice(0, 7);
    if (!transactionTotals[month]) {
      transactionTotals[month] = { kwh: 0, cost: 0, stops: 0 };
    }

    transactionTotals[month].kwh += Number(transaction.kwh) || 0;
    transactionTotals[month].cost += Number(transaction.totalCost) || 0;
    transactionTotals[month].stops += 1;
  });

  return {
    months,
    energyPerMonth: months.map((month) => {
      if (month === currentMonth && !transactionTotals[month]) {
        return null;
      }

      return Number((transactionTotals[month]?.kwh || 0).toFixed(2));
    }),
    kilometersPerMonth: months.map((month) => {
      if (month === currentMonth && state.monthlyKm[month] === undefined && !transactionTotals[month]) {
        return null;
      }

      return Number(getMonthlyKilometersValue(month).toFixed(2));
    }),
    chargingCostPerMonth: months.map((month) => {
      if (month === currentMonth && !transactionTotals[month]) {
        return null;
      }

      return Number((transactionTotals[month]?.cost || 0).toFixed(2));
    }),
    chargingStopsPerMonth: months.map((month) => {
      if (month === currentMonth && !transactionTotals[month]) {
        return null;
      }

      return transactionTotals[month]?.stops || 0;
    }),
    rangePerStopPerMonth: months.map((month) => {
      const kilometers = getMonthlyKilometersValue(month);
      const stops = transactionTotals[month]?.stops || 0;
      return stops > 0 && kilometers > 0 ? Number((kilometers / stops).toFixed(2)) : null;
    }),
    avgCostPerKwhPerMonth: months.map((month) => {
      const energy = transactionTotals[month]?.kwh || 0;
      const cost = transactionTotals[month]?.cost || 0;
      return energy > 0 ? Number((cost / energy).toFixed(3)) : null;
    }),
    consumptionPer100Km: months.map((month) => {
      const energy = transactionTotals[month]?.kwh || 0;
      const kilometers = getMonthlyKilometersValue(month);
      return kilometers > 0 ? Number(((energy / kilometers) * 100).toFixed(2)) : null;
    }),
    costPer100Km: months.map((month) => {
      const kilometers = getMonthlyKilometersValue(month);
      const cost = transactionTotals[month]?.cost || 0;
      return kilometers > 0 ? Number(((cost / kilometers) * 100).toFixed(2)) : null;
    })
  };
}

function getLastMonthKey() {
  const currentDate = new Date();
  const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  return `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
}

function averageValues(values) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (!validValues.length) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return Number((total / validValues.length).toFixed(2));
}

function buildSummaryStats() {
  const monthlyTransactionTotals = {};

  state.transactions.forEach((transaction) => {
    const month = String(transaction.date).slice(0, 7);

    if (!monthlyTransactionTotals[month]) {
      monthlyTransactionTotals[month] = { kwh: 0, cost: 0, stops: 0 };
    }

    monthlyTransactionTotals[month].kwh += Number(transaction.kwh) || 0;
    monthlyTransactionTotals[month].cost += Number(transaction.totalCost) || 0;
    monthlyTransactionTotals[month].stops += 1;
  });

  const kilometerMonths = Object.keys(state.monthlyKm);
  const energyMonths = Object.keys(monthlyTransactionTotals);
  const currentMonth = getLastMonthKey();
  const currentKilometers = getMonthlyKilometersValue(currentMonth);
  const currentEnergy = monthlyTransactionTotals[currentMonth]?.kwh || 0;
  const currentCost = monthlyTransactionTotals[currentMonth]?.cost || 0;
  const currentStops = monthlyTransactionTotals[currentMonth]?.stops || 0;
  const currentRangePerStop = currentStops > 0 && currentKilometers > 0
    ? Number((currentKilometers / currentStops).toFixed(2))
    : null;
  const currentCostPer100Km = currentKilometers > 0 ? Number(((currentCost / currentKilometers) * 100).toFixed(2)) : null;
  const currentAvgCostPerKwh = currentEnergy > 0 ? Number((currentCost / currentEnergy).toFixed(3)) : null;
  const currentConsumption = currentKilometers > 0 ? Number(((currentEnergy / currentKilometers) * 100).toFixed(2)) : null;

  return [
    {
      key: 'energy',
      label: 'Geladene Energie',
      icon: 'icon-bolt',
      average: averageValues(energyMonths.map((month) => Number(monthlyTransactionTotals[month].kwh.toFixed(2)))),
      current: Number(currentEnergy.toFixed(2)),
      formatter: (value) => `${decimalFormatter.format(value)} kWh`
    },
    {
      key: 'kilometers',
      label: 'Gefahrene Kilometer',
      icon: 'icon-car',
      average: averageValues(kilometerMonths.map((month) => Number(getMonthlyKilometersValue(month).toFixed(2)))),
      current: Number(currentKilometers.toFixed(2)),
      formatter: (value) => `${decimalFormatter.format(value)} km`
    },
    {
      key: 'cost-per-100',
      label: 'Kosten pro 100 km',
      icon: 'icon-euro',
      average: averageValues(kilometerMonths.map((month) => {
        const kilometers = getMonthlyKilometersValue(month);
        const monthlyCost = monthlyTransactionTotals[month]?.cost || 0;
        return kilometers > 0 ? Number(((monthlyCost / kilometers) * 100).toFixed(2)) : null;
      })),
      current: currentCostPer100Km,
      formatter: (value) => `${currencyFormatter.format(value)} / 100 km`
    },
    {
      key: 'absolute-cost',
      label: 'Absolute Kosten',
      icon: 'icon-receipt',
      average: averageValues(energyMonths.map((month) => Number(monthlyTransactionTotals[month].cost.toFixed(2)))),
      current: Number(currentCost.toFixed(2)),
      formatter: (value) => currencyFormatter.format(value)
    },
    {
      key: 'avg-cost-kwh',
      label: 'Ladekosten',
      icon: 'icon-charging',
      average: averageValues(energyMonths.map((month) => {
        const energy = monthlyTransactionTotals[month]?.kwh || 0;
        const cost = monthlyTransactionTotals[month]?.cost || 0;
        return energy > 0 ? Number((cost / energy).toFixed(3)) : null;
      })),
      current: currentAvgCostPerKwh,
      formatter: (value) => `${currencyFormatter.format(value)} / kWh`
    },
    {
      key: 'charging-stops',
      label: 'Ladestops',
      icon: 'icon-charging',
      average: averageValues(energyMonths.map((month) => monthlyTransactionTotals[month]?.stops || 0)),
      current: currentStops,
      formatter: (value) => `${decimalFormatter.format(value)} Stops`
    },
    {
      key: 'range-per-stop',
      label: 'Reichweite pro Ladestop',
      icon: 'icon-car',
      average: averageValues(kilometerMonths.map((month) => {
        const kilometers = getMonthlyKilometersValue(month);
        const stops = monthlyTransactionTotals[month]?.stops || 0;
        return stops > 0 && kilometers > 0 ? Number((kilometers / stops).toFixed(2)) : null;
      })),
      current: currentRangePerStop,
      formatter: (value) => `${decimalFormatter.format(value)} km / Stop`
    },
    {
      key: 'consumption',
      label: 'Verbrauch',
      icon: 'icon-chart',
      average: averageValues(kilometerMonths.map((month) => {
        const kilometers = getMonthlyKilometersValue(month);
        const energy = monthlyTransactionTotals[month]?.kwh || 0;
        return kilometers > 0 ? Number(((energy / kilometers) * 100).toFixed(2)) : null;
      })),
      current: currentConsumption,
      formatter: (value) => `${decimalFormatter.format(value)} kWh / 100 km`
    }
  ];
}

function getSummaryTrendClass(average, current) {
  if (!Number.isFinite(average) || !Number.isFinite(current)) {
    return 'summary-current summary-current--neutral';
  }

  if (current < average) {
    return 'summary-current summary-current--friendly';
  }

  if (current > average) {
    return 'summary-current summary-current--warning';
  }

  return 'summary-current summary-current--neutral';
}

function getSummaryTrendClassForMetric(metric, average, current) {
  if (metric.key === 'range-per-stop') {
    if (!Number.isFinite(average) || !Number.isFinite(current)) {
      return 'summary-current summary-current--neutral';
    }

    if (current > average) {
      return 'summary-current summary-current--friendly';
    }

    if (current < average) {
      return 'summary-current summary-current--warning';
    }

    return 'summary-current summary-current--neutral';
  }

  return getSummaryTrendClass(average, current);
}

function renderSummaryMetrics() {
  const currentMonthLabel = formatMonthLong(getLastMonthKey());
  const metrics = buildSummaryStats();

  summaryMetrics.innerHTML = metrics.map((metric) => {
    const averageValue = Number.isFinite(metric.average) ? metric.formatter(metric.average) : 'Kein Wert';
    const currentValue = Number.isFinite(metric.current) ? metric.formatter(metric.current) : 'Kein Wert';

    return `
      <article class="summary-card">
        <div class="summary-card-header">
          <span class="summary-icon" aria-hidden="true">
            <svg class="icon"><use href="/icons/material-symbols.svg#${metric.icon}"></use></svg>
          </span>
          <div>
            <h3>${metric.label}</h3>
            <p class="muted">Ø über alle Monate</p>
          </div>
        </div>
        <div class="summary-average">${averageValue}</div>
        <div class="${getSummaryTrendClassForMetric(metric, metric.average, metric.current)}">
          <span class="summary-current-label">${currentMonthLabel}</span>
          <span class="summary-current-value">${currentValue}</span>
        </div>
      </article>
    `;
  }).join('');
}

function populateMonthYearSelectors(monthSelectElement, yearSelectElement) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(2026, index, 1))
  }));

  monthSelectElement.innerHTML = months.map((month) => `<option value="${month.value}">${month.label}</option>`).join('');

  const years = new Set();
  const currentYear = new Date().getFullYear();

  for (let offset = -3; offset <= 3; offset += 1) {
    years.add(String(currentYear + offset));
  }

  Object.keys(state.monthlyKm).forEach((month) => years.add(month.slice(0, 4)));

  yearSelectElement.innerHTML = Array.from(years).sort().map((year) => `<option value="${year}">${year}</option>`).join('');
}

function getSelectedMonthValue(monthSelectElement, yearSelectElement) {
  return `${yearSelectElement.value}-${monthSelectElement.value}`;
}

function renderMonthlyKmTable() {
  const entries = Object.entries(state.monthlyKm)
    .filter(([month]) => state.filters.monthlyKmYear === 'all' || month.startsWith(`${state.filters.monthlyKmYear}-`))
    .sort((a, b) => b[0].localeCompare(a[0]));

  if (!entries.length) {
    monthlyKmTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Noch keine Kilometerdaten vorhanden.</td></tr>';
    return;
  }

  monthlyKmTableBody.innerHTML = entries.map(([month, kilometers]) => `
    <tr>
      <td data-label="Monat">${formatMonthLong(month)}</td>
      <td data-label="Kilometer">${decimalFormatter.format(getMonthlyKilometersValue(month))} km</td>
      <td data-label="KM-Stand">${getMonthlyOdometerValue(month) !== null ? `${decimalFormatter.format(getMonthlyOdometerValue(month))} km` : '—'}</td>
      <td data-label="Aktion">
        <button class="icon-button table-icon-button" type="button" aria-label="Monatseintrag bearbeiten" data-entry-type="monthly-km" data-month="${month}" data-kilometers="${getMonthlyKilometersValue(month)}" data-odometer="${getMonthlyOdometerValue(month) ?? ''}">
          <svg class="icon"><use href="/icons/material-symbols.svg#icon-edit"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderTransactionsTable() {
  const visibleTransactions = state.transactions.filter((transaction) => (
    state.filters.transactionsMonth === 'all' || String(transaction.date).slice(0, 7) === state.filters.transactionsMonth
  ));

  if (!visibleTransactions.length) {
    transactionsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Noch keine Ladevorgänge vorhanden.</td></tr>';
    return;
  }

  transactionsTableBody.innerHTML = visibleTransactions.map((transaction) => `
    <tr>
      <td data-label="Datum">${formatDate(transaction.date)}</td>
      <td data-label="kWh">${decimalFormatter.format(transaction.kwh)}</td>
      <td data-label="Preis / kWh">${currencyFormatter.format(transaction.pricePerKwh)}</td>
      <td data-label="Gebühr">${currencyFormatter.format(transaction.fee)}</td>
      <td data-label="Gesamt">${currencyFormatter.format(transaction.totalCost)}</td>
      <td data-label="Aktion">
        <button class="icon-button table-icon-button" type="button" aria-label="Ladevorgang bearbeiten" data-entry-type="transaction" data-id="${transaction.id}">
          <svg class="icon"><use href="/icons/material-symbols.svg#icon-edit"></use></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function makeChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);

  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }

  state.charts[canvasId] = new Chart(ctx, config);
}

function renderCharts() {
  const stats = buildMonthlyStats(state.range);
  const labels = stats.months.map(formatMonthLabel);
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: getThemeColorValue('--muted')
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: getThemeColorValue('--muted')
        },
        grid: {
          color: toAlphaColor(getThemeColorValue('--muted'), 0.2)
        }
      }
    }
  };

  makeChart('energyChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.energyPerMonth,
        borderColor: getThemeColorValue('--chart-energy'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-energy'), 0.18),
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 5
      }]
    },
    options: commonOptions
  });

  makeChart('kilometersChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.kilometersPerMonth,
        borderColor: getThemeColorValue('--chart-kilometers'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-kilometers'), 0.18),
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 5
      }]
    },
    options: commonOptions
  });

  makeChart('costChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.costPer100Km,
        borderColor: getThemeColorValue('--chart-cost'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-cost'), 0.18),
        fill: true,
        tension: 0.32,
        pointRadius: 4,
        pointHoverRadius: 5,
        spanGaps: true
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;
              return value === null ? 'Keine Kilometerdaten' : `${currencyFormatter.format(value)} / 100 km`;
            }
          }
        }
      }
    }
  });

  makeChart('absoluteCostChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.chargingCostPerMonth,
        borderColor: getThemeColorValue('--chart-absolute-cost'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-absolute-cost'), 0.18),
        fill: true,
        tension: 0.32,
        pointRadius: 4,
        pointHoverRadius: 5
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              return currencyFormatter.format(context.raw);
            }
          }
        }
      }
    }
  });

  makeChart('avgCostPerKwhChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.avgCostPerKwhPerMonth,
        borderColor: getThemeColorValue('--chart-avg-kwh'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-avg-kwh'), 0.18),
        fill: true,
        tension: 0.32,
        pointRadius: 4,
        pointHoverRadius: 5,
        spanGaps: true
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;
              return value === null ? 'Keine Ladedaten' : `${currencyFormatter.format(value)} / kWh`;
            }
          }
        }
      }
    }
  });

  makeChart('consumptionPer100KmChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.consumptionPer100Km,
        borderColor: getThemeColorValue('--chart-consumption'),
        backgroundColor: toAlphaColor(getThemeColorValue('--chart-consumption'), 0.18),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 5,
        spanGaps: true
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;
              return value === null ? 'Keine Kilometerdaten' : `${decimalFormatter.format(value)} kWh / 100 km`;
            }
          }
        }
      }
    }
  });

  makeChart('chargingStopsChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.chargingStopsPerMonth,
        borderColor: getThemeColorValue('--primary'),
        backgroundColor: toAlphaColor(getThemeColorValue('--primary'), 0.18),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 5
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              return `${decimalFormatter.format(context.raw)} Stops`;
            }
          }
        }
      }
    }
  });

  makeChart('rangePerStopChart', {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: stats.rangePerStopPerMonth,
        borderColor: getThemeColorValue('--info'),
        backgroundColor: toAlphaColor(getThemeColorValue('--info'), 0.18),
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 5,
        spanGaps: true
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;
              return value === null ? 'Keine Daten' : `${decimalFormatter.format(value)} km / Stop`;
            }
          }
        }
      }
    }
  });
}

function applyUltrawideMode() {
  const canUseUltrawide = window.innerWidth >= 1600;
  const active = canUseUltrawide && state.ultrawideEnabled;

  appShellElement.classList.toggle('ultrawide-active', active);
  contentElement.classList.toggle('ultrawide-active', active);
  ultrawideButton.classList.toggle('active', active);
  ultrawideButton.disabled = !canUseUltrawide;
  ultrawideButton.setAttribute('aria-pressed', String(active));

  if (!canUseUltrawide) {
    appShellElement.classList.remove('ultrawide-active');
    contentElement.classList.remove('ultrawide-active');
  }
}

function setMonthlyEditorActive(active) {
  monthlyEditorFields.classList.toggle('hidden', !active);
  editorMonthSelect.disabled = !active;
  editorYearSelect.disabled = !active;
  editorKilometers.disabled = !active;
  editorOdometer.disabled = !active;
  editorKilometers.required = active;
  if (!active) {
    editorOdometerHint.textContent = '';
  }
}

function setTransactionEditorActive(active) {
  transactionEditorFields.classList.toggle('hidden', !active);
  editorDate.disabled = !active;
  editorKwh.disabled = !active;
  editorPricePerKwh.disabled = !active;
  editorFee.disabled = !active;
  editorDate.required = active;
  editorKwh.required = active;
  editorPricePerKwh.required = active;
}

function setEditorHeading(mode, type) {
  const labels = {
    'monthly-km': mode === 'create' ? 'Monat hinzufügen' : 'Monat bearbeiten',
    transaction: mode === 'create' ? 'Ladevorgang hinzufügen' : 'Ladevorgang bearbeiten'
  };

  editorTitle.textContent = labels[type] || 'Eintrag';
}

function populateEditorMonth(month) {
  const [year, monthPart] = month.split('-');
  editorYearSelect.value = year;
  editorMonthSelect.value = monthPart;
  editorMonthValue.value = month;
}

function syncEditorMonthValue() {
  editorMonthValue.value = getSelectedMonthValue(editorMonthSelect, editorYearSelect);
  updateMonthlyEditorAutoCalculation();
}

function updateMonthlyEditorAutoCalculation() {
  const month = editorMonthValue.value || getSelectedMonthValue(editorMonthSelect, editorYearSelect);
  const previousMonth = getPreviousMonthKey(month);
  const previousOdometer = getMonthlyOdometerValue(previousMonth);
  const odometerValue = editorOdometer.value === '' ? null : Number.parseFloat(editorOdometer.value);
  const kilometersValue = editorKilometers.value.trim();

  if (previousOdometer !== null) {
    editorOdometerHint.textContent = `KM-Stand Vormonat (${formatMonthLong(previousMonth)}): ${decimalFormatter.format(previousOdometer)} km. Wenn das Kilometerfeld leer bleibt, wird der Wert automatisch vorgeschlagen.`;
  } else {
    editorOdometerHint.textContent = 'Kein KM-Stand des Vormonats vorhanden. Gefahrene Kilometer bitte manuell eingeben.';
  }

  if ((kilometersValue === '' || state.monthlyKilometersAutoFilled) && previousOdometer !== null && Number.isFinite(odometerValue)) {
    const calculatedKilometers = Number((odometerValue - previousOdometer).toFixed(2));

    if (Number.isFinite(calculatedKilometers) && calculatedKilometers >= 0) {
      editorKilometers.value = String(calculatedKilometers);
      state.monthlyKilometersAutoFilled = true;
    } else if (state.monthlyKilometersAutoFilled || kilometersValue === '') {
      editorKilometers.value = '';
      state.monthlyKilometersAutoFilled = false;
    }
  }
}

function openCreateMonthlyEditor() {
  const currentDate = new Date();

  editorType.value = 'monthly-km';
  editorMode.value = 'create';
  editorId.value = '';
  editorKilometers.value = '';
  editorOdometer.value = '';
  state.monthlyKilometersAutoFilled = false;
  setMonthlyEditorActive(true);
  setTransactionEditorActive(false);
  setEditorHeading('create', 'monthly-km');
  populateEditorMonth(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
  updateMonthlyEditorAutoCalculation();
  deleteEntryButton.classList.add('hidden');
  openEditor();
}

function openMonthlyEditor(month, kilometers, odometer) {
  editorType.value = 'monthly-km';
  editorMode.value = 'edit';
  editorId.value = '';
  populateEditorMonth(month);
  editorKilometers.value = kilometers;
  editorOdometer.value = odometer || '';
  state.monthlyKilometersAutoFilled = false;
  setMonthlyEditorActive(true);
  setTransactionEditorActive(false);
  setEditorHeading('edit', 'monthly-km');
  updateMonthlyEditorAutoCalculation();
  deleteEntryButton.classList.remove('hidden');
  openEditor();
}

function openCreateTransactionEditor() {
  const currentDate = new Date();

  editorType.value = 'transaction';
  editorMode.value = 'create';
  editorId.value = '';
  editorDate.value = currentDate.toISOString().slice(0, 10);
  editorKwh.value = '';
  editorPricePerKwh.value = '';
  editorFee.value = '';
  setMonthlyEditorActive(false);
  setTransactionEditorActive(true);
  setEditorHeading('create', 'transaction');
  deleteEntryButton.classList.add('hidden');
  openEditor();
}

function openTransactionEditor(transactionId) {
  const transaction = state.transactions.find((entry) => entry.id === transactionId);
  if (!transaction) {
    return;
  }

  editorType.value = 'transaction';
  editorMode.value = 'edit';
  editorId.value = transaction.id;
  editorDate.value = transaction.date;
  editorKwh.value = transaction.kwh;
  editorPricePerKwh.value = transaction.pricePerKwh;
  editorFee.value = transaction.fee;
  setMonthlyEditorActive(false);
  setTransactionEditorActive(true);
  setEditorHeading('edit', 'transaction');
  deleteEntryButton.classList.remove('hidden');
  openEditor();
}

function handleTableClick(event) {
  const entryButton = event.target.closest('[data-entry-type]');
  if (!entryButton) {
    return;
  }

  if (entryButton.dataset.entryType === 'monthly-km') {
    openMonthlyEditor(entryButton.dataset.month, entryButton.dataset.kilometers, entryButton.dataset.odometer);
    return;
  }

  if (entryButton.dataset.entryType === 'transaction') {
    openTransactionEditor(entryButton.dataset.id);
  }
}

function handleEditorSubmit(event) {
  event.preventDefault();

  if (editorType.value === 'monthly-km') {
    submitPost('/monthly-km', {
      month: editorMonthValue.value,
      kilometers: editorKilometers.value,
      odometer: editorOdometer.value
    });
    return;
  }

  if (editorType.value === 'transaction' && editorMode.value === 'create') {
    submitPost('/transactions', {
      date: editorDate.value,
      kwh: editorKwh.value,
      pricePerKwh: editorPricePerKwh.value,
      fee: editorFee.value
    });
    return;
  }

  if (editorType.value === 'transaction') {
    submitPost(`/transactions/${editorId.value}/update`, {
      date: editorDate.value,
      kwh: editorKwh.value,
      pricePerKwh: editorPricePerKwh.value,
      fee: editorFee.value
    });
  }
}

function handleDeleteEntry() {
  if (editorType.value === 'monthly-km') {
    submitPost(`/monthly-km/${editorMonthValue.value}/delete`, {});
    return;
  }

  if (editorType.value === 'transaction') {
    submitPost(`/transactions/${editorId.value}/delete`, {});
  }
}

async function handleJsonImport(event) {
  event.preventDefault();
  const file = jsonImportInput.files[0];

  if (!file) {
    showToast('Bitte eine JSON-Datei auswählen.', 'error');
    return;
  }

  jsonPayloadInput.value = await file.text();
  jsonImportForm.submit();
}

async function handleCsvImport(event) {
  event.preventDefault();
  const file = csvImportInput.files[0];

  if (!file) {
    showToast('Bitte eine CSV-Datei auswählen.', 'error');
    return;
  }

  csvTextInput.value = await file.text();
  csvImportForm.submit();
}

function setupRangeControls() {
  document.querySelectorAll('.range-chip').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.range-chip').forEach((chip) => chip.classList.remove('active'));
      button.classList.add('active');
      state.range = Number(button.dataset.range);
      renderCharts();
    });
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    installButton.classList.remove('hidden');
  });

  installButton.addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }

    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    state.deferredPrompt = null;
    installButton.classList.add('hidden');
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function setupSettings() {
  settingsButton.addEventListener('click', openSettings);
  closeSettingsButton.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);

  dangerActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openConfirmDialog(
        button.dataset.dangerTitle || 'Aktion bestätigen',
        button.dataset.dangerMessage || 'Möchtest du diese Aktion wirklich ausführen?',
        button.dataset.dangerAction || ''
      );
    });
  });
}

function setupEditor() {
  closeEditorButton.addEventListener('click', closeEditor);
  editorBackdrop.addEventListener('click', closeEditor);
  editorForm.addEventListener('submit', handleEditorSubmit);
  deleteEntryButton.addEventListener('click', handleDeleteEntry);
  editorMonthSelect.addEventListener('change', syncEditorMonthValue);
  editorYearSelect.addEventListener('change', syncEditorMonthValue);
  editorOdometer.addEventListener('input', updateMonthlyEditorAutoCalculation);
  editorKilometers.addEventListener('input', () => {
    state.monthlyKilometersAutoFilled = false;
  });
}

function setupConfirmDialog() {
  closeConfirmButton.addEventListener('click', closeConfirmDialog);
  cancelConfirmButton.addEventListener('click', closeConfirmDialog);
  confirmBackdrop.addEventListener('click', closeConfirmDialog);
  confirmActionButton.addEventListener('click', () => {
    if (!state.pendingDangerAction) {
      closeConfirmDialog();
      return;
    }

    submitPost(state.pendingDangerAction, {});
  });
}

function init() {
  setupThemes();
  setupRangeControls();
  setupInstallPrompt();
  setupSettings();
  setupEditor();
  setupConfirmDialog();
  registerServiceWorker();
  populateMonthYearSelectors(editorMonthSelect, editorYearSelect);
  renderFilters();
  renderSummaryMetrics();
  renderMonthlyKmTable();
  renderTransactionsTable();
  renderCharts();
  applyUltrawideMode();

  monthlyKmFilter.addEventListener('change', () => {
    state.filters.monthlyKmYear = monthlyKmFilter.value;
    renderMonthlyKmTable();
  });

  transactionsFilter.addEventListener('change', () => {
    state.filters.transactionsMonth = transactionsFilter.value;
    renderTransactionsTable();
  });

  ultrawideButton.addEventListener('click', () => {
    if (window.innerWidth < 1600) {
      return;
    }

    state.ultrawideEnabled = !state.ultrawideEnabled;
    window.localStorage.setItem('ladeschweinle-ultrawide', String(state.ultrawideEnabled));
    applyUltrawideMode();
  });

  window.addEventListener('resize', applyUltrawideMode);
  addMonthlyKmButton.addEventListener('click', openCreateMonthlyEditor);
  addTransactionButton.addEventListener('click', openCreateTransactionEditor);

  jsonImportForm.addEventListener('submit', handleJsonImport);
  csvImportForm.addEventListener('submit', handleCsvImport);
  monthlyKmTableBody.addEventListener('click', handleTableClick);
  transactionsTableBody.addEventListener('click', handleTableClick);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeThemeDialog();
      closeSettings();
      closeEditor();
      closeConfirmDialog();
    }
  });

  showToast(bootstrapState.notice, 'success');
  showToast(bootstrapState.error, 'error');
}

init();
