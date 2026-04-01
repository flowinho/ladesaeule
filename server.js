const express = require('express');
const path = require('path');
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
const { buildMonthlyStats } = require('./lib/stats');
const {
  parseMercedesBenzPublicChargeCsv,
  mergeTransactionsBySignature
} = require('./lib/importers');

const app = express();
const PORT = process.env.PORT || 1337;
const HOST = process.env.HOST || '0.0.0.0';

ensureDataFiles();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/chart', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

app.get('/api/monthly-km', (req, res) => {
  res.json(readMonthlyKilometers());
});

app.put('/api/monthly-km/:month', (req, res, next) => {
  try {
    const month = parseMonth(req.params.month);
    const kilometers = parseMonthlyKilometersPayload(req.body);
    const monthlyKilometers = readMonthlyKilometers();

    monthlyKilometers[month] = kilometers;
    writeMonthlyKilometers(monthlyKilometers);

    res.json({
      month,
      kilometers
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/monthly-km/:month', (req, res, next) => {
  try {
    const month = parseMonth(req.params.month);
    const monthlyKilometers = readMonthlyKilometers();

    if (!(month in monthlyKilometers)) {
      return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    }

    delete monthlyKilometers[month];
    writeMonthlyKilometers(monthlyKilometers);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/transactions', (req, res) => {
  const transactions = readTransactions().sort((a, b) => b.date.localeCompare(a.date));
  res.json(transactions);
});

app.post('/api/transactions', (req, res, next) => {
  try {
    const transaction = parseTransactionPayload(req.body);
    const transactions = readTransactions();

    transactions.push(transaction);
    writeTransactions(transactions);

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

app.put('/api/transactions/:id', (req, res, next) => {
  try {
    const transactions = readTransactions();
    const index = transactions.findIndex((entry) => entry.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    }

    const transaction = parseTransactionPayload(req.body);
    transaction.id = transactions[index].id;
    transactions[index] = transaction;
    writeTransactions(transactions);

    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/transactions/:id', (req, res, next) => {
  try {
    const transactions = readTransactions();
    const nextTransactions = transactions.filter((entry) => entry.id !== req.params.id);

    if (nextTransactions.length === transactions.length) {
      return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
    }

    writeTransactions(nextTransactions);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', (req, res, next) => {
  try {
    const range = Number.parseInt(req.query.range, 10);
    const statsRange = [3, 6, 12].includes(range) ? range : 6;

    const stats = buildMonthlyStats({
      monthlyKilometers: readMonthlyKilometers(),
      transactions: readTransactions(),
      monthsBack: statsRange
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

app.get('/api/export/all', (req, res) => {
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    monthlyKilometers: readMonthlyKilometers(),
    transactions: readTransactions()
  });
});

app.get('/api/export/monthly-km', (req, res) => {
  res.json(readMonthlyKilometers());
});

app.get('/api/export/transactions', (req, res) => {
  res.json(readTransactions());
});

app.post('/api/import/json', (req, res, next) => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      throw new Error('Ungültige JSON-Datei.');
    }

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

    res.json({
      message: 'JSON-Import erfolgreich.',
      monthlyKilometersUpdated: Boolean(nextMonthlyKilometers),
      transactionsUpdated: Boolean(nextTransactions)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/import/csv', express.text({ type: '*/*', limit: '2mb' }), (req, res, next) => {
  try {
    const tariff = typeof req.query.tariff === 'string' ? req.query.tariff : '';
    const csvText = typeof req.body === 'string' ? req.body : '';

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

    res.json({
      message: 'CSV-Import abgeschlossen.',
      imported: parsedTransactions.length,
      added: mergedTransactions.length - existingTransactions.length,
      skipped: parsedTransactions.length - (mergedTransactions.length - existingTransactions.length)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataDirectory: DATA_DIR
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || 400;
  res.status(status).json({
    error: err.message || 'Unbekannter Fehler.'
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server laeuft auf http://${HOST}:${PORT}`);
  });
}

module.exports = app;
