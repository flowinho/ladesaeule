const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  DATA_DIR,
  ensureDataFiles,
  readMonthlyKilometers,
  writeMonthlyKilometers,
  readTransactions,
  writeTransactions
} = require('./lib/storage');
const {
  parseMonth,
  parseMonthlyKilometersPayload,
  parseTransactionPayload,
  normalizeImportedMonthlyKilometers,
  normalizeImportedTransactions
} = require('./lib/validation');
const {
  parseMercedesBenzPublicChargeCsv,
  mergeTransactionsBySignature
} = require('./lib/importers');

const app = express();
const PORT = process.env.PORT || 1337;
const HOST = process.env.HOST || '0.0.0.0';
const INDEX_PATH = path.join(__dirname, 'public', 'index.html');

ensureDataFiles();

app.use(express.urlencoded({ extended: false, limit: '3mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/vendor/chart', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

function buildPageState(req) {
  return {
    monthlyKilometers: readMonthlyKilometers(),
    transactions: readTransactions().sort((a, b) => b.date.localeCompare(a.date)),
    notice: typeof req.query.notice === 'string' ? req.query.notice : '',
    error: typeof req.query.error === 'string' ? req.query.error : ''
  };
}

function serializeState(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderIndex(req, res) {
  const template = fs.readFileSync(INDEX_PATH, 'utf8');
  const state = buildPageState(req);
  const bootstrapScript = `<script id="bootstrap-data" type="application/json">${serializeState(state)}</script>`;
  res.send(template.replace('<script src="/vendor/chart/chart.umd.js"></script>', `${bootstrapScript}\n    <script src="/vendor/chart/chart.umd.js"></script>`));
}

function redirectWithMessage(res, type, message) {
  const query = new URLSearchParams({ [type]: message });
  res.redirect(`/?${query.toString()}`);
}

app.get('/', (req, res) => {
  renderIndex(req, res);
});

app.post('/monthly-km', (req, res) => {
  try {
    const month = parseMonth(req.body.month);
    const kilometers = parseMonthlyKilometersPayload({ kilometers: req.body.kilometers });
    const monthlyKilometers = readMonthlyKilometers();

    monthlyKilometers[month] = kilometers;
    writeMonthlyKilometers(monthlyKilometers);

    redirectWithMessage(res, 'notice', 'Kilometer für den Monat gespeichert.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'Speichern fehlgeschlagen.');
  }
});

app.post('/monthly-km/:month/delete', (req, res) => {
  try {
    const month = parseMonth(req.params.month);
    const monthlyKilometers = readMonthlyKilometers();

    if (!(month in monthlyKilometers)) {
      throw new Error('Eintrag nicht gefunden.');
    }

    delete monthlyKilometers[month];
    writeMonthlyKilometers(monthlyKilometers);

    redirectWithMessage(res, 'notice', 'Eintrag gelöscht.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'Löschen fehlgeschlagen.');
  }
});

app.post('/transactions', (req, res) => {
  try {
    const transaction = parseTransactionPayload(req.body);
    const transactions = readTransactions();

    transactions.push(transaction);
    writeTransactions(transactions);

    redirectWithMessage(res, 'notice', 'Ladevorgang gespeichert.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'Speichern fehlgeschlagen.');
  }
});

app.post('/transactions/:id/update', (req, res) => {
  try {
    const transactions = readTransactions();
    const index = transactions.findIndex((entry) => entry.id === req.params.id);

    if (index === -1) {
      throw new Error('Eintrag nicht gefunden.');
    }

    const transaction = parseTransactionPayload(req.body);
    transaction.id = transactions[index].id;
    transactions[index] = transaction;
    writeTransactions(transactions);

    redirectWithMessage(res, 'notice', 'Eintrag gespeichert.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'Speichern fehlgeschlagen.');
  }
});

app.post('/transactions/:id/delete', (req, res) => {
  try {
    const transactions = readTransactions();
    const nextTransactions = transactions.filter((entry) => entry.id !== req.params.id);

    if (nextTransactions.length === transactions.length) {
      throw new Error('Eintrag nicht gefunden.');
    }

    writeTransactions(nextTransactions);
    redirectWithMessage(res, 'notice', 'Eintrag gelöscht.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'Löschen fehlgeschlagen.');
  }
});

app.get('/export/all.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="ladesaeule-export.json"');
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    monthlyKilometers: readMonthlyKilometers(),
    transactions: readTransactions()
  });
});

app.get('/export/monthly-km.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="monthly-km.json"');
  res.json(readMonthlyKilometers());
});

app.get('/export/transactions.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.json"');
  res.json(readTransactions());
});

app.post('/import/json', (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload || '');

    let nextMonthlyKilometers = null;
    let nextTransactions = null;

    if ('monthlyKilometers' in payload || 'transactions' in payload) {
      if ('monthlyKilometers' in payload) {
        nextMonthlyKilometers = normalizeImportedMonthlyKilometers(payload.monthlyKilometers);
      }

      if ('transactions' in payload) {
        nextTransactions = normalizeImportedTransactions(payload.transactions);
      }
    } else if (Array.isArray(payload)) {
      nextTransactions = normalizeImportedTransactions(payload);
    } else {
      nextMonthlyKilometers = normalizeImportedMonthlyKilometers(payload);
    }

    if (nextMonthlyKilometers) {
      writeMonthlyKilometers(nextMonthlyKilometers);
    }

    if (nextTransactions) {
      writeTransactions(nextTransactions);
    }

    redirectWithMessage(res, 'notice', 'JSON-Datei importiert.');
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'JSON-Import fehlgeschlagen.');
  }
});

app.post('/import/csv', (req, res) => {
  try {
    const tariff = typeof req.body.tariff === 'string' ? req.body.tariff : '';
    const csvText = typeof req.body.csvText === 'string' ? req.body.csvText : '';

    if (!csvText.trim()) {
      throw new Error('CSV-Datei ist leer.');
    }

    if (tariff !== 'mercedes-benz-public-charge') {
      throw new Error('Tarif wird derzeit nicht unterstützt.');
    }

    const parsedTransactions = parseMercedesBenzPublicChargeCsv(csvText);
    const existingTransactions = readTransactions();
    const mergedTransactions = mergeTransactionsBySignature(existingTransactions, parsedTransactions);
    writeTransactions(mergedTransactions);

    const added = mergedTransactions.length - existingTransactions.length;
    redirectWithMessage(res, 'notice', `${added} Ladevorgänge importiert.`);
  } catch (error) {
    redirectWithMessage(res, 'error', error.message || 'CSV-Import fehlgeschlagen.');
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server läuft auf http://${HOST}:${PORT}`);
  });
}

module.exports = app;
