(function initializeVaultSwitchKasperskyParser(globalScope, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.VaultSwitchKasperskyParser = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis, function createParserApi() {
  "use strict";

  const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

  const SECTION_DEFINITIONS = Object.freeze({
    Websites: Object.freeze({
      type: "website",
      group: "Websites",
      structuralField: "Website name",
      fields: Object.freeze([
        "Website name",
        "Website URL",
        "Login name",
        "Login",
        "Password",
        "Comment",
      ]),
      mapping: Object.freeze({
        title: "Website name",
        accountName: "Login name",
        username: "Login",
        password: "Password",
        url: "Website URL",
        notes: "Comment",
      }),
    }),
    Applications: Object.freeze({
      type: "application",
      group: "Applications",
      structuralField: "Application",
      fields: Object.freeze([
        "Application",
        "Login name",
        "Login",
        "Password",
        "Comment",
      ]),
      mapping: Object.freeze({
        title: "Application",
        accountName: "Login name",
        username: "Login",
        password: "Password",
        notes: "Comment",
      }),
    }),
  });

  const RECOGNIZED_SECTION_NAMES = Object.freeze(Object.keys(SECTION_DEFINITIONS));
  const RECOGNIZED_SECTION_SET = new Set(RECOGNIZED_SECTION_NAMES);
  const UNSUPPORTED_SECTION_NAMES = new Set(["Notes"]);
  const UNSUPPORTED_LOCALE_HEADERS = new Set(["Sites"]);

  function createResultState() {
    return {
      records: [],
      diagnostics: [],
      blockedRecords: 0,
      unknownSections: 0,
    };
  }

  function addDiagnostic(state, code, severity, coordinates) {
    const diagnostic = { code, severity };

    if (coordinates) {
      for (const key of ["section", "recordIndex", "field"]) {
        if (coordinates[key] !== undefined) {
          diagnostic[key] = coordinates[key];
        }
      }
    }

    state.diagnostics.push(diagnostic);
    return diagnostic;
  }

  function finishResult(state) {
    const diagnosticsByCode = Object.create(null);
    let errors = 0;
    let warnings = 0;

    for (const diagnostic of state.diagnostics) {
      diagnosticsByCode[diagnostic.code] = (diagnosticsByCode[diagnostic.code] || 0) + 1;
      if (diagnostic.severity === "error") {
        errors += 1;
      } else {
        warnings += 1;
      }
    }

    const websites = state.records.filter((record) => record.type === "website").length;
    const applications = state.records.filter((record) => record.type === "application").length;

    return {
      blocked: errors > 0,
      records: state.records,
      diagnostics: state.diagnostics,
      counts: {
        supportedRecords: state.records.length,
        blockedRecords: state.blockedRecords,
        websites,
        applications,
        unknownSections: state.unknownSections,
        errors,
        warnings,
        diagnosticsByCode,
      },
    };
  }

  function resultWithError(code) {
    const state = createResultState();
    addDiagnostic(state, code, "error");
    return finishResult(state);
  }

  function toByteView(input) {
    if (input instanceof Uint8Array) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }

    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }

    throw new TypeError("Input must be an ArrayBuffer or Uint8Array.");
  }

  function startsWith(bytes, prefix) {
    if (bytes.length < prefix.length) {
      return false;
    }

    return prefix.every((value, index) => bytes[index] === value);
  }

  function decodeBytes(input, maxBytes) {
    const bytes = toByteView(input);

    if (bytes.byteLength === 0) {
      return { error: "EMPTY_FILE" };
    }

    if (bytes.byteLength > maxBytes) {
      return { error: "FILE_TOO_LARGE" };
    }

    if (
      startsWith(bytes, [0xff, 0xfe]) ||
      startsWith(bytes, [0xfe, 0xff]) ||
      startsWith(bytes, [0x00, 0x00, 0xfe, 0xff])
    ) {
      return { error: "ENCODING_UNSUPPORTED" };
    }

    const hasUtf8Bom = startsWith(bytes, [0xef, 0xbb, 0xbf]);
    const payload = hasUtf8Bom ? bytes.subarray(3) : bytes;
    let text;

    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(payload);
    } catch (_error) {
      return { error: "INVALID_UTF8" };
    }

    if (text.length === 0 || text.trim().length === 0) {
      return { error: "EMPTY_FILE" };
    }

    if (/\r(?!\n)/u.test(text)) {
      return { error: "INVALID_LINE_ENDING" };
    }

    return { text: text.replace(/\r\n/gu, "\n") };
  }

  function createRecordState(section, definition, index) {
    return {
      section,
      definition,
      index,
      values: Object.create(null),
      seen: new Set(),
      hasContent: false,
      hasError: false,
    };
  }

  function isCompleteForBlankBoundary(record) {
    if (!record || record.hasError) {
      return false;
    }

    return (
      record.definition.fields.every((field) => record.seen.has(field)) &&
      record.values[record.definition.structuralField] !== ""
    );
  }

  function lineUsesField(line, field) {
    const colonIndex = line.indexOf(":");
    return colonIndex >= 0 && line.slice(0, colonIndex) === field;
  }

  function buildLineLookahead(lines) {
    const nextNonBlankIndex = new Int32Array(lines.length + 1);
    const nextSectionEvidenceIndex = new Int32Array(lines.length + 1);
    const nextRecognizedSectionIndex = new Int32Array(lines.length + 1);

    nextNonBlankIndex.fill(-1);
    nextSectionEvidenceIndex.fill(-1);
    nextRecognizedSectionIndex.fill(-1);

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      nextNonBlankIndex[index] = line !== ""
        ? index
        : nextNonBlankIndex[index + 1];
      nextSectionEvidenceIndex[index] = line !== "" && line.trim() !== "---"
        ? index
        : nextSectionEvidenceIndex[index + 1];
      nextRecognizedSectionIndex[index] = RECOGNIZED_SECTION_SET.has(line)
        ? index
        : nextRecognizedSectionIndex[index + 1];
    }

    return {
      nextNonBlankIndex,
      nextSectionEvidenceIndex,
      nextRecognizedSectionIndex,
    };
  }

  function nextNonBlankLine(lines, lookahead, startIndex) {
    const index = lookahead.nextNonBlankIndex[startIndex];
    return index === -1 ? undefined : { index, line: lines[index] };
  }

  function hasRecognizedSectionAhead(lookahead, startIndex) {
    return lookahead.nextRecognizedSectionIndex[startIndex] !== -1;
  }

  function looksLikeUnknownSection(lines, lookahead, lineIndex) {
    const line = lines[lineIndex];
    if (!line || line.includes(":") || line.trim() === "---") {
      return false;
    }

    const candidateIndex = lookahead.nextSectionEvidenceIndex[lineIndex + 1];
    if (candidateIndex === -1) {
      return false;
    }

    const candidate = lines[candidateIndex];
    if (
      RECOGNIZED_SECTION_SET.has(candidate) ||
      UNSUPPORTED_SECTION_NAMES.has(candidate) ||
      UNSUPPORTED_LOCALE_HEADERS.has(candidate)
    ) {
      return false;
    }

    return candidate.indexOf(":") > 0;
  }

  function startsUnknownBlock(lines, lookahead, lineIndex) {
    const line = lines[lineIndex];

    if (
      !line ||
      line.includes(":") ||
      line.trim() === "---" ||
      RECOGNIZED_SECTION_SET.has(line) ||
      UNSUPPORTED_SECTION_NAMES.has(line) ||
      UNSUPPORTED_LOCALE_HEADERS.has(line)
    ) {
      return false;
    }

    return (
      looksLikeUnknownSection(lines, lookahead, lineIndex) ||
      hasRecognizedSectionAhead(lookahead, lineIndex + 1)
    );
  }

  function parseKasperskyTxtBytes(input, options) {
    const configuredMaxBytes = options && options.maxBytes !== undefined
      ? options.maxBytes
      : DEFAULT_MAX_BYTES;

    if (!Number.isSafeInteger(configuredMaxBytes) || configuredMaxBytes <= 0) {
      throw new RangeError("maxBytes must be a positive safe integer.");
    }

    const decoded = decodeBytes(input, configuredMaxBytes);
    if (decoded.error) {
      return resultWithError(decoded.error);
    }

    const state = createResultState();
    const lines = decoded.text.split("\n");
    const lookahead = buildLineLookahead(lines);
    const nextRecordIndex = { Websites: 1, Applications: 1 };
    let section = null;
    let definition = null;
    let record = null;
    let skippingUnsupportedSection = false;
    let reportedInvalidSectionStart = false;

    function ensureRecord() {
      if (!record) {
        record = createRecordState(section, definition, nextRecordIndex[section]);
        nextRecordIndex[section] += 1;
      }

      return record;
    }

    function reportRecordError(code, field) {
      const activeRecord = ensureRecord();
      activeRecord.hasError = true;
      const coordinates = {
        section: activeRecord.section,
        recordIndex: activeRecord.index,
      };
      if (field !== undefined) {
        coordinates.field = field;
      }
      addDiagnostic(state, code, "error", coordinates);
    }

    function finalizeRecord() {
      if (!record || !record.hasContent) {
        record = null;
        return;
      }

      const recordWarnings = [];

      for (const field of record.definition.fields) {
        if (!record.seen.has(field)) {
          record.hasError = true;
          addDiagnostic(state, "MISSING_FIELD", "error", {
            section: record.section,
            recordIndex: record.index,
            field,
          });
          continue;
        }

        if (record.values[field] !== "") {
          continue;
        }

        const isStructural = field === record.definition.structuralField;
        const severity = isStructural ? "error" : "warning";
        const warning = addDiagnostic(state, "EMPTY_VALUE", severity, {
          section: record.section,
          recordIndex: record.index,
          field,
        });

        if (isStructural) {
          record.hasError = true;
        } else {
          recordWarnings.push(warning);
        }
      }

      if (record.hasError) {
        state.blockedRecords += 1;
        record = null;
        return;
      }

      const mapping = record.definition.mapping;
      state.records.push({
        type: record.definition.type,
        title: record.values[mapping.title],
        accountName: record.values[mapping.accountName],
        username: record.values[mapping.username],
        password: record.values[mapping.password],
        url: mapping.url ? record.values[mapping.url] : "",
        notes: record.values[mapping.notes],
        group: record.definition.group,
        warnings: recordWarnings,
      });

      record = null;
    }

    function enterRecognizedSection(name) {
      finalizeRecord();
      section = name;
      definition = SECTION_DEFINITIONS[name];
      skippingUnsupportedSection = false;
    }

    function enterUnknownSection() {
      finalizeRecord();
      section = null;
      definition = null;
      skippingUnsupportedSection = true;
      state.unknownSections += 1;
      addDiagnostic(state, "UNKNOWN_SECTION", "error");
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];

      if (RECOGNIZED_SECTION_SET.has(line)) {
        enterRecognizedSection(line);
        continue;
      }

      if (skippingUnsupportedSection) {
        continue;
      }

      if (UNSUPPORTED_SECTION_NAMES.has(line)) {
        finalizeRecord();
        section = null;
        definition = null;
        skippingUnsupportedSection = true;
        state.unknownSections += 1;
        addDiagnostic(state, "UNKNOWN_SECTION", "error", { section: line });
        continue;
      }

      if (UNSUPPORTED_LOCALE_HEADERS.has(line)) {
        finalizeRecord();
        section = null;
        definition = null;
        skippingUnsupportedSection = true;
        addDiagnostic(state, "UNSUPPORTED_LOCALE", "error", { section: line });
        continue;
      }

      if (line.trim() === "---") {
        if (definition) {
          finalizeRecord();
        }
        continue;
      }

      if (line === "") {
        if (!record || !record.hasContent) {
          continue;
        }

        const nextLine = nextNonBlankLine(lines, lookahead, lineIndex + 1);
        if (
          nextLine !== undefined &&
          lineUsesField(nextLine.line, definition.structuralField)
        ) {
          if (!isCompleteForBlankBoundary(record)) {
            reportRecordError("AMBIGUOUS_RECORD_BOUNDARY");
          }
          finalizeRecord();
        } else if (
          nextLine !== undefined &&
          startsUnknownBlock(lines, lookahead, nextLine.index)
        ) {
          if (!isCompleteForBlankBoundary(record)) {
            reportRecordError("AMBIGUOUS_RECORD_BOUNDARY");
          }
          finalizeRecord();
        }
        continue;
      }

      if (!definition) {
        if (
          startsUnknownBlock(lines, lookahead, lineIndex) ||
          hasRecognizedSectionAhead(lookahead, lineIndex + 1)
        ) {
          enterUnknownSection();
        } else if (line.includes(":") && !reportedInvalidSectionStart) {
          addDiagnostic(state, "INVALID_SECTION", "error");
          reportedInvalidSectionStart = true;
        }
        continue;
      }

      if (!record && startsUnknownBlock(lines, lookahead, lineIndex)) {
        enterUnknownSection();
        continue;
      }

      if (
        record &&
        isCompleteForBlankBoundary(record) &&
        looksLikeUnknownSection(lines, lookahead, lineIndex)
      ) {
        enterUnknownSection();
        continue;
      }

      const activeRecord = ensureRecord();
      activeRecord.hasContent = true;
      const colonIndex = line.indexOf(":");

      if (colonIndex <= 0) {
        reportRecordError("AMBIGUOUS_MULTILINE");
        continue;
      }

      const field = line.slice(0, colonIndex);
      const rawValue = line.slice(colonIndex + 1);
      const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

      if (!definition.fields.includes(field)) {
        reportRecordError("UNKNOWN_FIELD");
        continue;
      }

      if (activeRecord.seen.has(field)) {
        reportRecordError("DUPLICATE_FIELD", field);
        continue;
      }

      activeRecord.seen.add(field);
      activeRecord.values[field] = value;
    }

    finalizeRecord();

    if (state.records.length === 0 && state.blockedRecords === 0) {
      addDiagnostic(state, "NO_SUPPORTED_RECORDS", "error");
    }

    return finishResult(state);
  }

  return Object.freeze({
    DEFAULT_MAX_BYTES,
    parseKasperskyTxtBytes,
  });
});
