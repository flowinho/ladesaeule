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
  range: 6,
  charts: {},
  deferredPrompt: null,
  filters: {
    monthlyKmYear: 'all',
    transactionsMonth: 'all'
  },
  ultrawideEnabled: window.localStorage.getItem('ladeschweinle-ultrawide') === 'true'
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
const addMonthlyKmButton = document.getElementById('addMonthlyKmButton');
const addTransactionButton = document.getElementById('addTransactionButton');
const installButton = document.getElementById('installButton');
const ultrawideButton = document.getElementById('ultrawideButton');
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const settingsBackdrop = document.getElementById('settingsBackdrop');
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
const editorDate = document.getElementById('editorDate');
const editorKwh = document.getElementById('editorKwh');
const editorPricePerKwh = document.getElementById('editorPricePerKwh');
const editorFee = document.getElementById('editorFee');
const contentElement = document.querySelector('.content');
const editorTitle = document.getElementById('editorTitle');

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

  state.transactions.forEach((transaction) => {
    const month = String(transaction.date).slice(0, 7);
    if (!transactionTotals[month]) {
      transactionTotals[month] = { kwh: 0, cost: 0 };
    }

    transactionTotals[month].kwh += Number(transaction.kwh) || 0;
    transactionTotals[month].cost += Number(transaction.totalCost) || 0;
  });

  return {
    months,
    energyPerMonth: months.map((month) => Number((transactionTotals[month]?.kwh || 0).toFixed(2))),
    kilometersPerMonth: months.map((month) => Number((Number(state.monthlyKm[month]) || 0).toFixed(2))),
    chargingCostPerMonth: months.map((month) => Number((transactionTotals[month]?.cost || 0).toFixed(2))),
    avgCostPerKwhPerMonth: months.map((month) => {
      const energy = transactionTotals[month]?.kwh || 0;
      const cost = transactionTotals[month]?.cost || 0;
      return energy > 0 ? Number((cost / energy).toFixed(3)) : null;
    }),
    consumptionPer100Km: months.map((month) => {
      const energy = transactionTotals[month]?.kwh || 0;
      const kilometers = Number(state.monthlyKm[month]) || 0;
      return kilometers > 0 ? Number(((energy / kilometers) * 100).toFixed(2)) : null;
    }),
    costPer100Km: months.map((month) => {
      const kilometers = Number(state.monthlyKm[month]) || 0;
      const cost = transactionTotals[month]?.cost || 0;
      return kilometers > 0 ? Number(((cost / kilometers) * 100).toFixed(2)) : null;
    })
  };
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
    monthlyKmTableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Noch keine Kilometerdaten vorhanden.</td></tr>';
    return;
  }

  monthlyKmTableBody.innerHTML = entries.map(([month, kilometers]) => `
    <tr>
      <td data-label="Monat">${formatMonthLong(month)}</td>
      <td data-label="Kilometer">${decimalFormatter.format(kilometers)} km</td>
      <td data-label="Aktion">
        <button class="icon-button table-icon-button" type="button" aria-label="Monatseintrag bearbeiten" data-entry-type="monthly-km" data-month="${month}" data-kilometers="${kilometers}">
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
          color: '#627087'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#627087'
        },
        grid: {
          color: 'rgba(98, 112, 135, 0.12)'
        }
      }
    }
  };

  makeChart('energyChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: stats.energyPerMonth,
        backgroundColor: 'rgba(47, 111, 237, 0.78)',
        borderRadius: 12,
        borderSkipped: false
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
        borderColor: '#188a54',
        backgroundColor: 'rgba(24, 138, 84, 0.15)',
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
        borderColor: '#f08c2b',
        backgroundColor: 'rgba(240, 140, 43, 0.14)',
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
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: stats.chargingCostPerMonth,
        backgroundColor: 'rgba(28, 111, 166, 0.78)',
        borderRadius: 12,
        borderSkipped: false
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
        borderColor: '#2556ba',
        backgroundColor: 'rgba(37, 86, 186, 0.12)',
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
        borderColor: '#6d7f2a',
        backgroundColor: 'rgba(109, 127, 42, 0.14)',
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
}

function openCreateMonthlyEditor() {
  const currentDate = new Date();

  editorType.value = 'monthly-km';
  editorMode.value = 'create';
  editorId.value = '';
  editorKilometers.value = '';
  monthlyEditorFields.classList.remove('hidden');
  transactionEditorFields.classList.add('hidden');
  setEditorHeading('create', 'monthly-km');
  populateEditorMonth(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
  deleteEntryButton.classList.add('hidden');
  openEditor();
}

function openMonthlyEditor(month, kilometers) {
  editorType.value = 'monthly-km';
  editorMode.value = 'edit';
  editorId.value = '';
  populateEditorMonth(month);
  editorKilometers.value = kilometers;
  monthlyEditorFields.classList.remove('hidden');
  transactionEditorFields.classList.add('hidden');
  setEditorHeading('edit', 'monthly-km');
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
  monthlyEditorFields.classList.add('hidden');
  transactionEditorFields.classList.remove('hidden');
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
  monthlyEditorFields.classList.add('hidden');
  transactionEditorFields.classList.remove('hidden');
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
    openMonthlyEditor(entryButton.dataset.month, entryButton.dataset.kilometers);
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
      kilometers: editorKilometers.value
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
}

function setupEditor() {
  closeEditorButton.addEventListener('click', closeEditor);
  editorBackdrop.addEventListener('click', closeEditor);
  editorForm.addEventListener('submit', handleEditorSubmit);
  deleteEntryButton.addEventListener('click', handleDeleteEntry);
  editorMonthSelect.addEventListener('change', syncEditorMonthValue);
  editorYearSelect.addEventListener('change', syncEditorMonthValue);
}

function init() {
  setupRangeControls();
  setupInstallPrompt();
  setupSettings();
  setupEditor();
  registerServiceWorker();
  populateMonthYearSelectors(editorMonthSelect, editorYearSelect);
  renderFilters();
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
      closeSettings();
      closeEditor();
    }
  });

  showToast(bootstrapState.notice, 'success');
  showToast(bootstrapState.error, 'error');
}

init();
