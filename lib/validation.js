function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw createHttpError('Monat muss im Format YYYY-MM uebergeben werden.');
  }

  return value;
}

function parseNumber(value, fieldLabel) {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) {
    throw createHttpError(`${fieldLabel} ist ungueltig.`);
  }

  return number;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseMonthlyKilometersPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError('Ungueltiger Request-Body.');
  }

  const kilometers = parseNumber(body.kilometers, 'Kilometer');

  if (kilometers < 0) {
    throw createHttpError('Kilometer duerfen nicht negativ sein.');
  }

  return roundCurrency(kilometers);
}

function parseTransactionPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError('Ungueltiger Request-Body.');
  }

  const date = typeof body.date === 'string' ? body.date : '';
  if (!isValidIsoDate(date)) {
    throw createHttpError('Datum ist ungueltig.');
  }

  const kwh = parseNumber(body.kwh, 'Geladene Energie');
  const pricePerKwh = parseNumber(body.pricePerKwh, 'Preis pro kWh');
  const fee = body.fee === '' || body.fee === undefined || body.fee === null ? 0 : parseNumber(body.fee, 'Zusatzgebuehr');

  if (kwh < 0 || pricePerKwh < 0 || fee < 0) {
    throw createHttpError('Werte duerfen nicht negativ sein.');
  }

  return {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    kwh: roundCurrency(kwh),
    pricePerKwh: roundCurrency(pricePerKwh),
    fee: roundCurrency(fee),
    totalCost: roundCurrency((kwh * pricePerKwh) + fee)
  };
}

function normalizeImportedMonthlyKilometers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError('Kilometerdaten muessen ein Objekt sein.');
  }

  const normalized = {};

  for (const [month, kilometers] of Object.entries(value)) {
    normalized[parseMonth(month)] = parseMonthlyKilometersPayload({ kilometers });
  }

  return normalized;
}

function normalizeImportedTransactions(value) {
  if (!Array.isArray(value)) {
    throw createHttpError('Ladevorgaenge muessen als Array importiert werden.');
  }

  return value.map((entry, index) => {
    try {
      const normalized = parseTransactionPayload(entry);
      if (typeof entry.id === 'string' && entry.id.trim()) {
        normalized.id = entry.id.trim();
      }
      return normalized;
    } catch (error) {
      throw createHttpError(`Ladevorgang ${index + 1} ist ungueltig: ${error.message}`);
    }
  });
}

module.exports = {
  parseMonth,
  parseMonthlyKilometersPayload,
  parseTransactionPayload,
  normalizeImportedMonthlyKilometers,
  normalizeImportedTransactions
};
