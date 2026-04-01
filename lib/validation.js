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

function getPreviousMonth(month) {
  const [year, monthPart] = month.split('-').map(Number);
  const previousDate = new Date(year, monthPart - 2, 1);
  return `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
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

function parseMonthlyKilometersPayload(body, options = {}) {
  if (!body || typeof body !== 'object') {
    throw createHttpError('Ungueltiger Request-Body.');
  }

  const previousEntry = options.previousEntry && typeof options.previousEntry === 'object' ? options.previousEntry : null;
  const previousOdometer = previousEntry && Number.isFinite(Number(previousEntry.odometer))
    ? Number(previousEntry.odometer)
    : null;
  const kilometersProvided = !(body.kilometers === '' || body.kilometers === undefined || body.kilometers === null);
  const odometerProvided = !(body.odometer === '' || body.odometer === undefined || body.odometer === null);
  const odometer = odometerProvided ? parseNumber(body.odometer, 'KM-Stand des Fahrzeugs') : null;
  let kilometers;

  if (odometerProvided && odometer < 0) {
    throw createHttpError('KM-Stand des Fahrzeugs darf nicht negativ sein.');
  }

  if (kilometersProvided) {
    kilometers = parseNumber(body.kilometers, 'Kilometer');
  } else if (odometerProvided && previousOdometer !== null) {
    kilometers = odometer - previousOdometer;
  } else {
    throw createHttpError('Kilometer ist ungueltig.');
  }

  if (kilometers < 0) {
    throw createHttpError('Kilometer duerfen nicht negativ sein. Bitte KM-Staende pruefen.');
  }

  return {
    kilometers: roundCurrency(kilometers),
    odometer: odometerProvided ? roundCurrency(odometer) : null
  };
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

  for (const [month, entry] of Object.entries(value)) {
    const parsedMonth = parseMonth(month);

    if (typeof entry === 'number') {
      normalized[parsedMonth] = parseMonthlyKilometersPayload({ kilometers: entry });
      continue;
    }

    normalized[parsedMonth] = parseMonthlyKilometersPayload(entry || {});
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
  getPreviousMonth,
  parseMonth,
  parseMonthlyKilometersPayload,
  parseTransactionPayload,
  normalizeImportedMonthlyKilometers,
  normalizeImportedTransactions
};
