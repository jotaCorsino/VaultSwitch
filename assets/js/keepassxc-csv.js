(function initializeVaultSwitchKeePassXcCsv(globalScope, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.VaultSwitchKeePassXcCsv = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis, function createCsvApi() {
  "use strict";

  const DEFAULT_MAX_CSV_BYTES = 20 * 1024 * 1024;
  const CSV_COLUMNS = Object.freeze([
    "Group",
    "Title",
    "Username",
    "Password",
    "URL",
    "Notes",
  ]);
  const RECORD_STRING_FIELDS = Object.freeze([
    "type",
    "title",
    "accountName",
    "username",
    "password",
    "url",
    "notes",
    "group",
  ]);
  const REQUIRED_COUNT_FIELDS = Object.freeze([
    "supportedRecords",
    "blockedRecords",
    "websites",
    "applications",
    "unknownSections",
    "errors",
    "warnings",
  ]);
  const ALLOWED_SOURCE_DIAGNOSTIC_CODES = new Set([
    "EMPTY_FILE",
    "FILE_TOO_LARGE",
    "ENCODING_UNSUPPORTED",
    "INVALID_UTF8",
    "INVALID_LINE_ENDING",
    "UNSUPPORTED_LOCALE",
    "UNKNOWN_SECTION",
    "INVALID_SECTION",
    "AMBIGUOUS_RECORD_BOUNDARY",
    "MISSING_FIELD",
    "EMPTY_VALUE",
    "DUPLICATE_FIELD",
    "UNKNOWN_FIELD",
    "AMBIGUOUS_MULTILINE",
    "NO_SUPPORTED_RECORDS",
  ]);

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isNonNegativeSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function createDiagnostic(code, coordinates) {
    const diagnostic = { code, severity: "error" };

    if (coordinates && coordinates.recordIndex !== undefined) {
      diagnostic.recordIndex = coordinates.recordIndex;
    }
    if (coordinates && coordinates.field !== undefined) {
      diagnostic.field = coordinates.field;
    }

    return diagnostic;
  }

  function failure(code, sourceRecords, coordinates) {
    return {
      blocked: true,
      diagnostics: [createDiagnostic(code, coordinates)],
      counts: {
        sourceRecords,
        exportedRecords: 0,
        outputBytes: 0,
      },
    };
  }

  function resolveMaxBytes(options) {
    if (options === undefined || options === null) {
      return DEFAULT_MAX_CSV_BYTES;
    }

    if (!isObject(options)) {
      throw new RangeError("options must be an object when provided.");
    }

    if (options.maxBytes === undefined) {
      return DEFAULT_MAX_CSV_BYTES;
    }

    if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes <= 0) {
      throw new RangeError("maxBytes must be a positive safe integer.");
    }

    return options.maxBytes;
  }

  function inspectSourceDiagnostics(diagnostics) {
    if (!Array.isArray(diagnostics)) {
      return undefined;
    }

    const byCode = Object.create(null);
    let errors = 0;
    let warnings = 0;

    for (const diagnostic of diagnostics) {
      if (
        !isObject(diagnostic) ||
        !ALLOWED_SOURCE_DIAGNOSTIC_CODES.has(diagnostic.code) ||
        (diagnostic.severity !== "error" && diagnostic.severity !== "warning")
      ) {
        return undefined;
      }

      byCode[diagnostic.code] = (byCode[diagnostic.code] || 0) + 1;
      if (diagnostic.severity === "error") {
        errors += 1;
      } else {
        warnings += 1;
      }
    }

    return { byCode, errors, warnings };
  }

  function diagnosticsByCodeMatch(actual, expected) {
    if (!isObject(actual)) {
      return false;
    }

    const actualCodes = Object.keys(actual);
    const expectedCodes = Object.keys(expected);
    if (actualCodes.length !== expectedCodes.length) {
      return false;
    }

    return expectedCodes.every(
      (code) => isNonNegativeSafeInteger(actual[code]) && actual[code] === expected[code],
    );
  }

  function countsMatchSource(counts, records, diagnosticSummary) {
    if (!isObject(counts)) {
      return false;
    }

    if (!REQUIRED_COUNT_FIELDS.every((field) => isNonNegativeSafeInteger(counts[field]))) {
      return false;
    }

    const websites = records.filter((record) => record && record.type === "website").length;
    const applications = records.filter(
      (record) => record && record.type === "application",
    ).length;

    return (
      counts.supportedRecords === records.length &&
      counts.websites === websites &&
      counts.applications === applications &&
      websites + applications === records.length &&
      counts.errors === diagnosticSummary.errors &&
      counts.warnings === diagnosticSummary.warnings &&
      diagnosticsByCodeMatch(counts.diagnosticsByCode, diagnosticSummary.byCode)
    );
  }

  function invalidRecordCoordinates(record, recordIndex) {
    if (!isObject(record)) {
      return { recordIndex };
    }

    for (const field of RECORD_STRING_FIELDS) {
      if (typeof record[field] !== "string") {
        return { recordIndex, field };
      }
    }

    if (!Array.isArray(record.warnings)) {
      return { recordIndex, field: "warnings" };
    }

    if (record.title === "") {
      return { recordIndex, field: "title" };
    }

    if (record.type !== "website" && record.type !== "application") {
      return { recordIndex, field: "type" };
    }

    if (
      (record.type === "website" && record.group !== "Websites") ||
      (record.type === "application" && record.group !== "Applications")
    ) {
      return { recordIndex, field: "group" };
    }

    return undefined;
  }

  function quoteCsvField(value) {
    return `"${value.replace(/"/gu, '""')}"`;
  }

  function csvRow(values) {
    return values.map(quoteCsvField).join(",");
  }

  function valuesForRecord(record) {
    return [
      record.group,
      record.title,
      record.username,
      record.password,
      record.url,
      record.notes,
    ];
  }

  function serializeKeePassXcCsv(parseResult, options) {
    const maxBytes = resolveMaxBytes(options);
    const sourceRecords = isObject(parseResult) && Array.isArray(parseResult.records)
      ? parseResult.records.length
      : 0;

    if (!isObject(parseResult) || typeof parseResult.blocked !== "boolean") {
      return failure("INVALID_SOURCE_RESULT", sourceRecords);
    }

    if (parseResult.blocked) {
      return failure("SOURCE_BLOCKED", sourceRecords);
    }

    if (!Array.isArray(parseResult.records) || parseResult.records.length === 0) {
      return failure("INVALID_SOURCE_RESULT", sourceRecords);
    }

    const diagnosticSummary = inspectSourceDiagnostics(parseResult.diagnostics);
    if (!diagnosticSummary) {
      return failure("INVALID_SOURCE_RESULT", sourceRecords);
    }

    for (let index = 0; index < parseResult.records.length; index += 1) {
      const invalidCoordinates = invalidRecordCoordinates(parseResult.records[index], index + 1);
      if (invalidCoordinates) {
        return failure("INVALID_RECORD", sourceRecords, invalidCoordinates);
      }
    }

    if (!countsMatchSource(parseResult.counts, parseResult.records, diagnosticSummary)) {
      return failure("INVALID_SOURCE_RESULT", sourceRecords);
    }

    if (
      diagnosticSummary.errors > 0 ||
      parseResult.counts.blockedRecords > 0 ||
      parseResult.counts.unknownSections > 0
    ) {
      return failure("SOURCE_BLOCKED", sourceRecords);
    }

    if (parseResult.records.some((record) => record.accountName !== "")) {
      return failure("ACCOUNT_NAME_UNMAPPED", sourceRecords);
    }

    const encoder = new TextEncoder();
    const rows = [csvRow(CSV_COLUMNS)];
    let estimatedBytes = encoder.encode(rows[0]).byteLength;

    for (const record of parseResult.records) {
      const row = csvRow(valuesForRecord(record));
      estimatedBytes += 2 + encoder.encode(row).byteLength;
      if (estimatedBytes > maxBytes) {
        return failure("CSV_TOO_LARGE", sourceRecords);
      }
      rows.push(row);
    }

    const csvBytes = encoder.encode(rows.join("\r\n"));
    if (csvBytes.byteLength > maxBytes) {
      return failure("CSV_TOO_LARGE", sourceRecords);
    }

    const diagnostics = diagnosticSummary.warnings > 0
      ? [{ code: "SOURCE_WARNINGS_PRESENT", severity: "warning" }]
      : [];

    return {
      blocked: false,
      csvBytes,
      diagnostics,
      counts: {
        sourceRecords,
        exportedRecords: parseResult.records.length,
        websites: parseResult.counts.websites,
        applications: parseResult.counts.applications,
        sourceWarnings: diagnosticSummary.warnings,
        outputBytes: csvBytes.byteLength,
      },
    };
  }

  return Object.freeze({
    CSV_COLUMNS,
    DEFAULT_MAX_CSV_BYTES,
    serializeKeePassXcCsv,
  });
});
