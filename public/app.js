const state = {
  monthlyKm: {},
  transactions: [],
  range: 6,
  charts: {},
  deferredPrompt: null
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
const monthlyKmForm = document.getElementById('monthlyKmForm');
const transactionForm = document.getElementById('transactionForm');
const monthlyKmTableBody = document.getElementById('monthlyKmTableBody');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const installButton = document.getElementById('installButton');
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const jsonImportForm = document.getElementById('jsonImportForm');
const csvImportForm = document.getElementById('csvImportForm');
const jsonImportInput = document.getElementById('jsonImportInput');
const csvImportInput = document.getElementById('csvImportInput');
const tariffSelect = document.getElementById('tariffSelect');
const editorPanel = document.getElementById('editorPanel');
const editorBackdrop = document.getElementById('editorBackdrop');
const closeEditorButton = document.getElementById('closeEditorButton');
const editorForm = document.getElementById('editorForm');
const deleteEntryButton = document.getElementById('deleteEntryButton');
const editorType = document.getElementById('editorType');
const editorId = document.getElementById('editorId');
const editorMonthValue = document.getElementById('editorMonthValue');
const monthlyEditorFields = document.getElementById('monthlyEditorFields');
const transactionEditorFields = document.getElementById('transactionEditorFields');
const editorMonthLabel = document.getElementById('editorMonthLabel');
const editorKilometers = document.getElementById('editorKilometers');
const editorDate = document.getElementById('editorDate');
const editorKwh = document.getElementById('editorKwh');
const editorPricePerKwh = document.getElementById('editorPricePerKwh');
const editorFee = document.getElementById('editorFee');

function showToast(message, variant = 'success') {
  toast.textContent = message;
  toast.className = `toast visible ${variant}`;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type'] && options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    headers,
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Anfrage fehlgeschlagen.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function populateMonthYearSelectors() {
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date(2026, index, 1))
  }));

  monthSelect.innerHTML = months.map((month) => `<option value="${month.value}">${month.label}</option>`).join('');

  const years = new Set();
  const currentYear = new Date().getFullYear();

  for (let offset = -3; offset <= 3; offset += 1) {
    years.add(String(currentYear + offset));
  }

  Object.keys(state.monthlyKm).forEach((month) => years.add(month.slice(0, 4)));

  yearSelect.innerHTML = Array.from(years)
    .sort()
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
}

function getSelectedMonthValue() {
  return `${yearSelect.value}-${monthSelect.value}`;
}

function setSelectedMonthValue(month) {
  const [year, monthPart] = month.split('-');
  populateMonthYearSelectors();
  yearSelect.value = year;
  monthSelect.value = monthPart;
}

function renderMonthlyKmTable() {
  const entries = Object.entries(state.monthlyKm).sort((a, b) => b[0].localeCompare(a[0]));

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
  if (!state.transactions.length) {
    transactionsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Noch keine Ladevorgänge vorhanden.</td></tr>';
    return;
  }

  transactionsTableBody.innerHTML = state.transactions.map((transaction) => `
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

function renderCharts(stats) {
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
}

async function loadStats() {
  const stats = await requestJson(`/api/stats?range=${state.range}`);
  renderCharts(stats);
}

async function refreshData() {
  const [monthlyKm, transactions] = await Promise.all([
    requestJson('/api/monthly-km'),
    requestJson('/api/transactions')
  ]);

  state.monthlyKm = monthlyKm;
  state.transactions = transactions;

  populateMonthYearSelectors();
  renderMonthlyKmTable();
  renderTransactionsTable();
  await loadStats();
}

async function handleMonthlyKmSubmit(event) {
  event.preventDefault();
  const formData = new FormData(monthlyKmForm);
  const month = getSelectedMonthValue();
  const kilometers = formData.get('kilometers');

  try {
    await requestJson(`/api/monthly-km/${month}`, {
      method: 'PUT',
      body: JSON.stringify({ kilometers })
    });

    await refreshData();
    showToast('Kilometer für den Monat gespeichert.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleTransactionSubmit(event) {
  event.preventDefault();
  const formData = new FormData(transactionForm);
  const payload = {
    date: formData.get('date'),
    kwh: formData.get('kwh'),
    pricePerKwh: formData.get('pricePerKwh'),
    fee: formData.get('fee')
  };

  try {
    await requestJson('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    transactionForm.reset();
    transactionForm.elements.date.valueAsDate = new Date();
    await refreshData();
    showToast('Ladevorgang gespeichert.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openMonthlyEditor(month, kilometers) {
  editorType.value = 'monthly-km';
  editorMonthValue.value = month;
  editorMonthLabel.value = formatMonthLong(month);
  editorKilometers.value = kilometers;
  monthlyEditorFields.classList.remove('hidden');
  transactionEditorFields.classList.add('hidden');
  openEditor();
}

function openTransactionEditor(transactionId) {
  const transaction = state.transactions.find((entry) => entry.id === transactionId);
  if (!transaction) {
    return;
  }

  editorType.value = 'transaction';
  editorId.value = transaction.id;
  editorDate.value = transaction.date;
  editorKwh.value = transaction.kwh;
  editorPricePerKwh.value = transaction.pricePerKwh;
  editorFee.value = transaction.fee;
  monthlyEditorFields.classList.add('hidden');
  transactionEditorFields.classList.remove('hidden');
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

async function handleEditorSubmit(event) {
  event.preventDefault();

  try {
    if (editorType.value === 'monthly-km') {
      await requestJson(`/api/monthly-km/${editorMonthValue.value}`, {
        method: 'PUT',
        body: JSON.stringify({ kilometers: editorKilometers.value })
      });
    } else if (editorType.value === 'transaction') {
      await requestJson(`/api/transactions/${editorId.value}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: editorDate.value,
          kwh: editorKwh.value,
          pricePerKwh: editorPricePerKwh.value,
          fee: editorFee.value
        })
      });
    }

    await refreshData();
    closeEditor();
    showToast('Eintrag gespeichert.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleDeleteEntry() {
  try {
    if (editorType.value === 'monthly-km') {
      await requestJson(`/api/monthly-km/${editorMonthValue.value}`, {
        method: 'DELETE'
      });
    } else if (editorType.value === 'transaction') {
      await requestJson(`/api/transactions/${editorId.value}`, {
        method: 'DELETE'
      });
    }

    await refreshData();
    closeEditor();
    showToast('Eintrag gelöscht.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleSettingsClick(event) {
  const exportButton = event.target.closest('[data-export]');
  if (!exportButton) {
    return;
  }

  const exportType = exportButton.dataset.export;
  const endpoint = exportType === 'all'
    ? '/api/export/all'
    : exportType === 'monthly-km'
      ? '/api/export/monthly-km'
      : '/api/export/transactions';

  const filename = exportType === 'all'
    ? 'ladesaeule-export.json'
    : exportType === 'monthly-km'
      ? 'monthly-km.json'
      : 'transactions.json';

  try {
    const data = await requestJson(endpoint);
    downloadJson(filename, data);
    showToast('Export heruntergeladen.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleJsonImport(event) {
  event.preventDefault();
  const file = jsonImportInput.files[0];

  if (!file) {
    showToast('Bitte eine JSON-Datei auswählen.', 'error');
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await requestJson('/api/import/json', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    jsonImportForm.reset();
    await refreshData();
    showToast('JSON-Datei importiert.');
  } catch (error) {
    showToast(error.message || 'JSON-Import fehlgeschlagen.', 'error');
  }
}

async function handleCsvImport(event) {
  event.preventDefault();
  const file = csvImportInput.files[0];

  if (!file) {
    showToast('Bitte eine CSV-Datei auswählen.', 'error');
    return;
  }

  try {
    const csvText = await file.text();
    const result = await requestJson(`/api/import/csv?tariff=${encodeURIComponent(tariffSelect.value)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: csvText
    });

    csvImportForm.reset();
    await refreshData();
    showToast(`${result.added} Ladevorgänge importiert.`);
  } catch (error) {
    showToast(error.message || 'CSV-Import fehlgeschlagen.', 'error');
  }
}

function setupRangeControls() {
  document.querySelectorAll('.range-chip').forEach((button) => {
    button.addEventListener('click', async () => {
      document.querySelectorAll('.range-chip').forEach((chip) => chip.classList.remove('active'));
      button.classList.add('active');
      state.range = Number(button.dataset.range);

      try {
        await loadStats();
      } catch (error) {
        showToast(error.message, 'error');
      }
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
  settingsPanel.addEventListener('click', handleSettingsClick);
}

function setupEditor() {
  closeEditorButton.addEventListener('click', closeEditor);
  editorBackdrop.addEventListener('click', closeEditor);
  editorForm.addEventListener('submit', handleEditorSubmit);
  deleteEntryButton.addEventListener('click', handleDeleteEntry);
}

function setDefaultDates() {
  const currentDate = new Date();
  populateMonthYearSelectors();
  yearSelect.value = String(currentDate.getFullYear());
  monthSelect.value = String(currentDate.getMonth() + 1).padStart(2, '0');
  transactionForm.elements.date.valueAsDate = currentDate;
}

async function init() {
  setupRangeControls();
  setupInstallPrompt();
  setupSettings();
  setupEditor();
  registerServiceWorker();
  setDefaultDates();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSettings();
      closeEditor();
    }
  });

  monthlyKmForm.addEventListener('submit', handleMonthlyKmSubmit);
  transactionForm.addEventListener('submit', handleTransactionSubmit);
  jsonImportForm.addEventListener('submit', handleJsonImport);
  csvImportForm.addEventListener('submit', handleCsvImport);
  monthlyKmTableBody.addEventListener('click', handleTableClick);
  transactionsTableBody.addEventListener('click', handleTableClick);

  try {
    await refreshData();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();
