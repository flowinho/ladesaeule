function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV-Datei enthaelt keine Datensaetze.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row;
  });
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findColumn(headers, patterns, { required = true } = {}) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }));

  for (const pattern of patterns) {
    const match = normalizedHeaders.find((header) => pattern.test(header.normalized));
    if (match) {
      return match.original;
    }
  }

  if (required) {
    throw new Error(`CSV-Spalte fehlt: ${patterns[0]}`);
  }

  return null;
}

function parseGermanNumber(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const compact = value
    .replace(/\s/g, '')
    .replace(/[€]/g, '')
    .replace(/[^\d,.-]/g, '');

  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');
  let normalized = compact;

  if (hasComma && hasDot) {
    normalized = compact.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma) {
    normalized = compact.replace(/,/g, '.');
  }

  if (!normalized) {
    return null;
  }

  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function toIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const clean = value.trim();
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const germanMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (germanMatch) {
    return `${germanMatch[3]}-${germanMatch[2]}-${germanMatch[1]}`;
  }

  return null;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function buildTransactionSignature(transaction) {
  return [
    transaction.date,
    transaction.kwh,
    transaction.pricePerKwh,
    transaction.fee,
    transaction.totalCost
  ].join('|');
}

function mergeTransactionsBySignature(existingTransactions, importedTransactions) {
  const signatures = new Set(existingTransactions.map(buildTransactionSignature));
  const merged = [...existingTransactions];

  for (const transaction of importedTransactions) {
    const signature = buildTransactionSignature(transaction);
    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    merged.push(transaction);
  }

  return merged;
}

function parseMercedesBenzPublicChargeCsv(text) {
  const rows = parseCsv(text);
  const headers = Object.keys(rows[0] || {});

  const dateColumn = findColumn(headers, [
    /^timestamp$/,
    /^(datum|date|startdatum|start date|ladebeginn|session start)/,
    /(datum|date)/
  ]);

  const kwhColumn = findColumn(headers, [
    /^kwh$/,
    /(kwh|energie|energy|verbrauch)/
  ]);

  const totalCostColumn = findColumn(headers, [
    /^grossamount$/,
    /^gross amount$/,
    /^netamount$/,
    /^net amount$/,
    /^totalenergyamount$/,
    /(gesamt|gesamtbetrag|rechnungsbetrag|betrag|total|amount|umsatz)/
  ], { required: false });

  const pricePerKwhColumn = findColumn(headers, [
    /^priceperkwh$/,
    /(preis.*kwh|kwh.*preis|price.*kwh|energy price)/
  ], { required: false });

  const feeColumn = findColumn(headers, [
    /^totaltimeamount$/,
    /^totalfixedamount$/,
    /(gebuehr|gebühr|fee|standzeit|blockier|parking)/
  ], { required: false });

  const importedTransactions = [];

  rows.forEach((row, index) => {
    const date = toIsoDate(row[dateColumn]);
    const kwh = parseGermanNumber(row[kwhColumn]);
    const fixedFee = row.totalFixedAmount !== undefined ? (parseGermanNumber(row.totalFixedAmount) || 0) : 0;
    const timeFee = row.totalTimeAmount !== undefined ? (parseGermanNumber(row.totalTimeAmount) || 0) : 0;
    const fallbackFee = feeColumn ? (parseGermanNumber(row[feeColumn]) || 0) : 0;
    const fee = roundCurrency(fixedFee + timeFee || fallbackFee);
    const energyAmount = row.totalEnergyAmount !== undefined ? parseGermanNumber(row.totalEnergyAmount) : null;
    const grossAmount = row.grossAmount !== undefined ? parseGermanNumber(row.grossAmount) : null;
    const explicitPricePerKwh = pricePerKwhColumn ? parseGermanNumber(row[pricePerKwhColumn]) : null;
    const totalCost = grossAmount ?? (totalCostColumn ? parseGermanNumber(row[totalCostColumn]) : null);

    if (!date || !kwh || kwh <= 0) {
      return;
    }

    let pricePerKwh = explicitPricePerKwh;
    let resolvedTotalCost = totalCost;

    if (pricePerKwh === null && energyAmount !== null) {
      const derivedEnergyCost = grossAmount !== null && fee > 0
        ? Math.max(grossAmount - fee, 0)
        : energyAmount;
      pricePerKwh = derivedEnergyCost / kwh;
    }

    if (pricePerKwh === null && resolvedTotalCost !== null) {
      pricePerKwh = Math.max(resolvedTotalCost - fee, 0) / kwh;
    }

    if (resolvedTotalCost === null && pricePerKwh !== null) {
      resolvedTotalCost = (kwh * pricePerKwh) + fee;
    }

    if (pricePerKwh === null || resolvedTotalCost === null) {
      return;
    }

    importedTransactions.push({
      id: `csv_mercedes_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      date,
      kwh: roundCurrency(kwh),
      pricePerKwh: roundCurrency(pricePerKwh),
      fee: roundCurrency(fee),
      totalCost: roundCurrency(resolvedTotalCost)
    });
  });

  if (!importedTransactions.length) {
    throw new Error('Es konnten keine passenden Ladevorgaenge aus der CSV gelesen werden.');
  }

  return importedTransactions;
}

module.exports = {
  parseMercedesBenzPublicChargeCsv,
  mergeTransactionsBySignature
};
