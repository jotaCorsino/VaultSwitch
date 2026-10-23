"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const {
  parseKasperskyTxtBytes,
} = require("../assets/js/kaspersky-parser.js");
const {
  CSV_COLUMNS,
  DEFAULT_MAX_CSV_BYTES,
  serializeKeePassXcCsv,
} = require("../assets/js/keepassxc-csv.js");

const FIXTURE_DIRECTORY = path.join(__dirname, "fixtures", "kaspersky");

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIRECTORY, name));
}

function serializeFixture(name, options) {
  return serializeKeePassXcCsv(parseKasperskyTxtBytes(fixture(name)), options);
}

function diagnosticCodes(result) {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function decode(bytes) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseQualifiedCsv(csvBytes) {
  const text = decode(csvBytes);
  const rows = [];
  let row = [];
  let index = 0;

  while (index < text.length) {
    assert.equal(text[index], '"', `expected quoted field at offset ${index}`);
    index += 1;
    let value = "";

    while (index < text.length) {
      if (text[index] !== '"') {
        value += text[index];
        index += 1;
        continue;
      }

      if (text[index + 1] === '"') {
        value += '"';
        index += 2;
        continue;
      }

      index += 1;
      break;
    }

    row.push(value);
    if (index === text.length) {
      rows.push(row);
      break;
    }

    if (text[index] === ",") {
      index += 1;
      continue;
    }

    assert.equal(text.slice(index, index + 2), "\r\n");
    rows.push(row);
    row = [];
    index += 2;
  }

  return rows;
}

function makeRecord(overrides) {
  return {
    type: "website",
    title: "Synthetic title",
    accountName: "",
    username: "synthetic-user",
    password: "FICTITIOUS-PASSWORD",
    url: "https://synthetic.example.invalid",
    notes: "Synthetic notes",
    group: "Websites",
    warnings: [],
    ...overrides,
  };
}

function makeSource(records, diagnostics = []) {
  const byCode = Object.create(null);
  let errors = 0;
  let warnings = 0;

  for (const diagnostic of diagnostics) {
    byCode[diagnostic.code] = (byCode[diagnostic.code] || 0) + 1;
    if (diagnostic.severity === "error") {
      errors += 1;
    } else {
      warnings += 1;
    }
  }

  const websites = records.filter((record) => record.type === "website").length;
  const applications = records.filter((record) => record.type === "application").length;

  return {
    blocked: errors > 0,
    records,
    diagnostics,
    counts: {
      supportedRecords: records.length,
      blockedRecords: 0,
      websites,
      applications,
      unknownSections: 0,
      errors,
      warnings,
      diagnosticsByCode: byCode,
    },
  };
}

test("loads as a local browser script without CommonJS or DOM", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "assets", "js", "keepassxc-csv.js"),
    "utf8",
  );
  const browserContext = vm.createContext({ TextEncoder });

  vm.runInContext(source, browserContext);

  assert.equal(typeof browserContext.VaultSwitchKeePassXcCsv.serializeKeePassXcCsv, "function");
  assert.deepEqual(
    Array.from(browserContext.VaultSwitchKeePassXcCsv.CSV_COLUMNS),
    CSV_COLUMNS,
  );
});

test("exports fixture 04 with empty fields and safe source warning summary", () => {
  const result = serializeFixture("04-empty-fields-lf.txt");
  const rows = parseQualifiedCsv(result.csvBytes);

  assert.equal(result.blocked, false);
  assert.deepEqual(rows[0], CSV_COLUMNS);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], ["Websites", "Portal Vazio Fictício", "", "", "", ""]);
  assert.deepEqual(diagnosticCodes(result), ["SOURCE_WARNINGS_PRESENT"]);
  assert.equal(result.counts.sourceWarnings, 5);
});

test("exports both blank-delimited fixture 18 records in source order", () => {
  const result = serializeFixture("18-websites-blank-separated-crlf.txt");
  const rows = parseQualifiedCsv(result.csvBytes);

  assert.equal(result.blocked, false);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][1], "Estação Aurora Fictícia");
  assert.equal(rows[2][1], "Estação Boreal Fictícia");
  assert.equal(rows[2][5], "Comentário inteiramente inventado, teste.");
});

test("blocks fixture 01 when accountName has no homologated destination", () => {
  const result = serializeFixture("01-websites-lf.txt");

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["ACCOUNT_NAME_UNMAPPED"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
});

test("never exports the recognized record retained by blocked fixture 16", () => {
  const parsed = parseKasperskyTxtBytes(fixture("16-mixed-supported-unknown-negative-lf.txt"));
  const result = serializeKeePassXcCsv(parsed);

  assert.equal(parsed.records.length, 1);
  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["SOURCE_BLOCKED"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
  assert.equal(result.counts.exportedRecords, 0);
});

for (const name of ["03-notes-multiline-lf.txt", "17-comment-multiline-hypothetical-negative-lf.txt"]) {
  test(`does not export blocked fixture ${name}`, () => {
    const result = serializeFixture(name);

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["SOURCE_BLOCKED"]);
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
  });
}

test("preserves CSV specials, UTF-8 and multiline Notes exactly", () => {
  const notes = 'Primeira, linha "citada""dupla"\n\nSegunda\r\n\tÁrvore 🚀: fim';
  const record = makeRecord({
    title: 'Título, com "aspas"',
    username: "usuário\tcom-tab",
    password: '  FICTITIOUS,"senha"  ',
    url: "https://special.example.invalid/path:a,b",
    notes,
  });
  const result = serializeKeePassXcCsv(makeSource([record]));
  const rows = parseQualifiedCsv(result.csvBytes);

  assert.equal(result.blocked, false);
  assert.deepEqual(rows[1], [
    record.group,
    record.title,
    record.username,
    record.password,
    record.url,
    notes,
  ]);
  assert.match(decode(result.csvBytes), /"Título, com ""aspas"""/u);
  assert.equal(result.csvBytes[0] === 0xef && result.csvBytes[1] === 0xbb, false);
});

test("preserves formula-like prefixes and peripheral spaces without sanitizing", () => {
  const record = makeRecord({
    title: "=Synthetic title",
    username: "+synthetic-user",
    password: "-FICTITIOUS-PASSWORD ",
    url: "@https://synthetic.example.invalid",
    notes: "  =1+1  ",
  });
  const rows = parseQualifiedCsv(serializeKeePassXcCsv(makeSource([record])).csvBytes);

  assert.deepEqual(rows[1], [
    "Websites",
    "=Synthetic title",
    "+synthetic-user",
    "-FICTITIOUS-PASSWORD ",
    "@https://synthetic.example.invalid",
    "  =1+1  ",
  ]);
});

test("keeps empty application URL and Notes", () => {
  const record = makeRecord({
    type: "application",
    title: "Synthetic application",
    url: "",
    notes: "",
    group: "Applications",
  });
  const rows = parseQualifiedCsv(serializeKeePassXcCsv(makeSource([record])).csvBytes);

  assert.deepEqual(rows[1], [
    "Applications",
    "Synthetic application",
    "synthetic-user",
    "FICTITIOUS-PASSWORD",
    "",
    "",
  ]);
});

test("keeps repeated records and their original order", () => {
  const records = [
    makeRecord({ title: "Repeated", username: "first" }),
    makeRecord({ title: "Repeated", username: "second" }),
  ];
  const result = serializeKeePassXcCsv(makeSource(records));
  const rows = parseQualifiedCsv(result.csvBytes);

  assert.equal(result.counts.exportedRecords, 2);
  assert.equal(rows[1][2], "first");
  assert.equal(rows[2][2], "second");
});

test("uses deterministic fully qualified columns and CRLF record separators", () => {
  const result = serializeKeePassXcCsv(makeSource([makeRecord({
    title: "Simple",
    username: "user",
    password: "pass",
    url: "",
    notes: "",
  })]));

  assert.equal(
    decode(result.csvBytes),
    '"Group","Title","Username","Password","URL","Notes"\r\n' +
      '"Websites","Simple","user","pass","",""',
  );
});

test("does not inspect or export records when source is blocked", () => {
  const inaccessibleRecord = {};
  Object.defineProperty(inaccessibleRecord, "title", {
    get() {
      throw new Error("SENSITIVE-VALUE-MUST-NOT-BE-READ");
    },
  });
  const result = serializeKeePassXcCsv({
    blocked: true,
    records: [inaccessibleRecord],
  });

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["SOURCE_BLOCKED"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
});

for (const invalidSource of [
  null,
  {},
  { blocked: false },
  makeSource([]),
]) {
  test("rejects missing or empty source result without output", () => {
    const result = serializeKeePassXcCsv(invalidSource);

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["INVALID_SOURCE_RESULT"]);
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
  });
}

for (const field of [
  "type",
  "title",
  "accountName",
  "username",
  "password",
  "url",
  "notes",
  "group",
  "warnings",
]) {
  test(`rejects malformed record field ${field} without coercion`, () => {
    const record = makeRecord();
    record[field] = field === "warnings" ? "not-an-array" : 42;
    const result = serializeKeePassXcCsv(makeSource([record]));

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["INVALID_RECORD"]);
    assert.deepEqual(result.diagnostics[0], {
      code: "INVALID_RECORD",
      severity: "error",
      recordIndex: 1,
      field,
    });
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
  });
}

test("rejects empty title and inconsistent type/group pairs", () => {
  for (const record of [
    makeRecord({ title: "" }),
    makeRecord({ type: "application", group: "Websites" }),
    makeRecord({ type: "unknown" }),
  ]) {
    const result = serializeKeePassXcCsv(makeSource([record]));

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["INVALID_RECORD"]);
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
  }
});

test("rejects a non-object record without inspecting values", () => {
  const source = makeSource([makeRecord()]);
  source.records[0] = null;
  const result = serializeKeePassXcCsv(source);

  assert.equal(result.blocked, true);
  assert.deepEqual(result.diagnostics[0], {
    code: "INVALID_RECORD",
    severity: "error",
    recordIndex: 1,
  });
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
});

test("blocks all output when any accountName is non-empty, including whitespace", () => {
  for (const accountName of ["Synthetic account", " "]) {
    const records = [makeRecord({ title: "First" }), makeRecord({
      title: "Second",
      accountName,
    })];
    const result = serializeKeePassXcCsv(makeSource(records));

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["ACCOUNT_NAME_UNMAPPED"]);
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
    assert.doesNotMatch(JSON.stringify(result.diagnostics), /Synthetic account/u);
  }
});

test("rejects inconsistent source counts", () => {
  const mutations = [
    (source) => { source.counts.supportedRecords += 1; },
    (source) => { source.counts.websites = 0; },
    (source) => { source.counts.warnings = 1; },
    (source) => { source.counts.diagnosticsByCode.EXTRA = 1; },
    (source) => { source.counts.diagnosticsByCode = null; },
    (source) => { source.counts.supportedRecords = -1; },
    (source) => { source.counts = null; },
  ];

  for (const mutate of mutations) {
    const source = makeSource([makeRecord()]);
    mutate(source);
    const result = serializeKeePassXcCsv(source);

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["INVALID_SOURCE_RESULT"]);
    assert.equal(Object.hasOwn(result, "csvBytes"), false);
  }
});

test("rejects a source without a diagnostics array", () => {
  const source = makeSource([makeRecord()]);
  delete source.diagnostics;
  const result = serializeKeePassXcCsv(source);

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["INVALID_SOURCE_RESULT"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
});

test("blocks a source diagnostic error even if blocked flag is inconsistent", () => {
  const source = makeSource([makeRecord()], [{
    code: "UNKNOWN_FIELD",
    severity: "error",
  }]);
  source.blocked = false;
  const result = serializeKeePassXcCsv(source);

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["SOURCE_BLOCKED"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
});

test("rejects unrecognized or malformed source diagnostics without copying them", () => {
  for (const diagnostic of [
    { code: "EXTERNAL-SECRET-VALUE", severity: "warning" },
    { code: "EMPTY_VALUE", severity: "unexpected" },
    "SENSITIVE-DIAGNOSTIC",
  ]) {
    const source = makeSource([makeRecord()], [diagnostic]);
    source.blocked = false;
    const result = serializeKeePassXcCsv(source);

    assert.equal(result.blocked, true);
    assert.deepEqual(diagnosticCodes(result), ["INVALID_SOURCE_RESULT"]);
    assert.doesNotMatch(JSON.stringify(result.diagnostics), /SECRET|SENSITIVE/u);
  }
});

test("enforces the configured CSV byte limit without returning partial bytes", () => {
  const source = makeSource([makeRecord({ notes: "Synthetic notes beyond a tiny limit" })]);
  const result = serializeKeePassXcCsv(source, { maxBytes: 32 });

  assert.equal(DEFAULT_MAX_CSV_BYTES, 20 * 1024 * 1024);
  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["CSV_TOO_LARGE"]);
  assert.equal(Object.hasOwn(result, "csvBytes"), false);
  assert.throws(
    () => serializeKeePassXcCsv(source, { maxBytes: 0 }),
    (error) => error instanceof RangeError && !error.message.includes("Synthetic notes"),
  );
  assert.throws(
    () => serializeKeePassXcCsv(source, "invalid-options"),
    (error) => error instanceof RangeError && !error.message.includes("Synthetic notes"),
  );
});

test("serializes a large synthetic volume entirely in memory", () => {
  const recordCount = 10_000;
  const records = Array.from({ length: recordCount }, (_, index) => makeRecord({
    title: `Synthetic title ${index}`,
    username: `synthetic-user-${index}`,
    password: `FICTITIOUS-PASSWORD-${index}`,
    url: `https://synthetic-${index}.example.invalid`,
    notes: `Synthetic notes ${index}`,
  }));
  const result = serializeKeePassXcCsv(makeSource(records));

  assert.equal(result.blocked, false);
  assert.equal(result.counts.sourceRecords, recordCount);
  assert.equal(result.counts.exportedRecords, recordCount);
  assert.equal(result.counts.outputBytes, result.csvBytes.byteLength);
  assert.ok(result.csvBytes.byteLength < DEFAULT_MAX_CSV_BYTES);
  assert.match(decode(result.csvBytes.subarray(0, 200)), /Synthetic title 0/u);
  assert.match(decode(result.csvBytes.subarray(-300)), /Synthetic title 9999/u);
});

test("failure diagnostics contain only safe structural properties", () => {
  const results = [
    serializeFixture("01-websites-lf.txt"),
    serializeFixture("16-mixed-supported-unknown-negative-lf.txt"),
    serializeKeePassXcCsv(makeSource([makeRecord({ password: 42 })])),
    serializeKeePassXcCsv(makeSource([makeRecord({ accountName: "DO-NOT-LEAK" })])),
  ];
  const allowedKeys = new Set(["code", "severity", "recordIndex", "field"]);

  for (const result of results) {
    for (const diagnostic of result.diagnostics) {
      assert.ok(Object.keys(diagnostic).every((key) => allowedKeys.has(key)));
    }
    assert.doesNotMatch(
      JSON.stringify(result.diagnostics),
      /FICTITIOUS|example\.invalid|DO-NOT-LEAK/u,
    );
  }
});
