"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_MAX_BYTES,
  parseKasperskyTxtBytes,
} = require("../assets/js/kaspersky-parser.js");
const {
  serializeKeePassXcCsv,
} = require("../assets/js/keepassxc-csv.js");
const {
  APP_VERSION,
  createSafeReport,
  createWorkflowController,
  copyReportText,
  sanitizeDiagnostic,
} = require("../assets/js/app.js");

const ROOT = path.join(__dirname, "..");
const FIXTURE_DIRECTORY = path.join(__dirname, "fixtures", "kaspersky");

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIRECTORY, name));
}

function fakeFile(bytes, options = {}) {
  return {
    size: options.size === undefined ? bytes.byteLength : options.size,
    arrayBuffer: options.arrayBuffer || (async () => bytes),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(overrides = {}) {
  const states = [];
  const createdBytes = [];
  const revokedUrls = [];
  let serializeCalls = 0;
  let urlSequence = 0;
  const readFile = overrides.readFile || ((file) => file.arrayBuffer());
  const parse = overrides.parse || parseKasperskyTxtBytes;
  const serialize = overrides.serialize || ((parsed) => {
    serializeCalls += 1;
    return serializeKeePassXcCsv(parsed);
  });
  const createDownloadUrl = overrides.createDownloadUrl || ((bytes) => {
    createdBytes.push(Uint8Array.from(bytes));
    urlSequence += 1;
    return `blob:vaultswitch-test-${urlSequence}`;
  });
  const revokeDownloadUrl = overrides.revokeDownloadUrl || ((url) => {
    revokedUrls.push(url);
  });
  const controller = createWorkflowController({
    maxInputBytes: overrides.maxInputBytes || DEFAULT_MAX_BYTES,
    readFile,
    parse,
    serialize,
    createDownloadUrl,
    revokeDownloadUrl,
    onStateChange: (state) => states.push(state),
  });

  return {
    controller,
    states,
    createdBytes,
    revokedUrls,
    serializeCalls: () => serializeCalls,
  };
}

function reportCodes(state) {
  return state.report.model.diagnostics.map((diagnostic) => diagnostic.code);
}

test("static page declares the experimental gate and local assets", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  assert.match(html, /Modo experimental — somente arquivos fictícios de teste/u);
  assert.match(html, /Issue #6 permanece aberta/u);
  assert.match(html, /não está autorizado|Não use exportações reais/u);
  assert.match(html, /assets\/css\/style\.css/u);
  assert.match(html, /assets\/js\/kaspersky-parser\.js/u);
  assert.match(html, /assets\/js\/keepassxc-csv\.js/u);
  assert.match(html, /assets\/js\/app\.js/u);
  assert.ok(
    html.indexOf("kaspersky-parser.js") < html.indexOf("keepassxc-csv.js") &&
      html.indexOf("keepassxc-csv.js") < html.indexOf("app.js"),
  );
  assert.doesNotMatch(html, /https?:\/\//u);
});

test("static page exposes accessible controls and no bypass", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  for (const fragment of [
    'lang="pt-BR"',
    'href="#conteudo"',
    'id="fictional-confirmation"',
    'id="source-file"',
    'aria-live="polite"',
    'id="report-text"',
    'readonly',
    'download="vaultswitch-fixture.csv"',
    'aria-disabled="true"',
  ]) {
    assert.ok(html.includes(fragment), `missing ${fragment}`);
  }

  assert.doesNotMatch(html, /forçar conversão|converter parcialmente/iu);
  assert.match(html, /connect-src 'none'/u);
  assert.match(html, /font-src 'none'/u);
});

test("styles include 360px-compatible responsive and focus rules", () => {
  const css = fs.readFileSync(path.join(ROOT, "assets", "css", "style.css"), "utf8");

  assert.match(css, /min-width:\s*320px/u);
  assert.match(css, /@media \(max-width: 600px\)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /prefers-reduced-motion/u);
  assert.doesNotMatch(css, /url\s*\(\s*["']?https?:/iu);
});

test("browser code avoids interpreted source content, network and persistence APIs", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets", "js", "app.js"), "utf8");

  assert.doesNotMatch(source, /\.innerHTML\b/u);
  assert.doesNotMatch(source, /\balert\s*\(/u);
  assert.doesNotMatch(source, /\bconsole\s*\./u);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/u);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/u);
});

test("safe report contains only allowed structural data", () => {
  const marker = "FICTITIOUS-DO-NOT-COPY";
  const report = createSafeReport({
    phase: "PARSE",
    status: "BLOCKED",
    fileBytes: 321,
    outputBytes: 654,
    counts: {
      supportedRecords: 2,
      errors: 1,
      passwordValue: marker,
    },
    diagnostics: [{
      code: "UNKNOWN_FIELD",
      severity: "error",
      section: "Websites",
      field: "Password",
      recordIndex: 2,
      lineNumber: 19,
      title: marker,
      username: marker,
      url: `https://${marker}.invalid`,
      notes: marker,
    }],
    filename: `${marker}.txt`,
    records: [{ password: marker }],
  });

  assert.equal(report.model.phase, "PARSE");
  assert.equal(report.model.status, "BLOCKED");
  assert.equal(report.model.diagnostics[0].section, "Websites");
  assert.equal(report.model.diagnostics[0].field, "Password");
  assert.equal(report.model.diagnostics[0].recordIndex, 2);
  assert.doesNotMatch(report.text, new RegExp(marker, "u"));
  assert.doesNotMatch(report.text, /lineNumber|linha=19|passwordValue/iu);
  assert.match(report.text, /Issue #6 permanece bloqueante/u);
});

test("unknown diagnostic and free structural names are replaced or omitted", () => {
  const marker = "<img src=x onerror=FICTITIOUS-XSS>";
  const diagnostic = sanitizeDiagnostic({
    code: marker,
    severity: marker,
    section: marker,
    field: marker,
    recordIndex: -1,
  });

  assert.deepEqual(diagnostic, {
    code: "UNRECOGNIZED_DIAGNOSTIC",
    severity: "error",
    message: "Um diagnóstico fora da lista permitida foi omitido.",
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /FICTITIOUS|<img/u);
});

test("invalid report phase, status and numeric values fall back safely", () => {
  const report = createSafeReport({
    phase: "FICTITIOUS-PHASE",
    status: "FICTITIOUS-STATUS",
    fileBytes: -1,
    outputBytes: Number.MAX_VALUE,
    counts: { errors: "1", warnings: 1.5 },
  });

  assert.equal(report.model.phase, "UI");
  assert.equal(report.model.status, "BLOCKED");
  assert.equal(report.model.counts.length, 0);
  assert.doesNotMatch(report.text, /FICTITIOUS/u);
});

test("fixture 18 completes analyze and CSV download preparation", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );

  assert.equal(analyzed.view, "parsed");
  assert.equal(analyzed.canConvert, true);
  assert.equal(analyzed.canDownload, false);
  assert.equal(analyzed.metrics.recognized, 2);

  const converted = harness.controller.convert();
  assert.equal(converted.view, "ready");
  assert.equal(converted.canDownload, true);
  assert.equal(converted.downloadUrl, "blob:vaultswitch-test-1");
  assert.equal(converted.metrics.recognized, 2);
  assert.ok(converted.metrics.outputBytes > 0);
  assert.equal(harness.createdBytes.length, 1);
  assert.match(new TextDecoder().decode(harness.createdBytes[0]), /^"Group","Title"/u);
});

test("fixture 04 remains convertible with safe warnings", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("04-empty-fields-lf.txt")),
    true,
  );

  assert.equal(analyzed.view, "parsed");
  assert.equal(analyzed.report.model.status, "OK_WITH_WARNINGS");
  assert.equal(analyzed.metrics.warnings, 5);

  const converted = harness.controller.convert();
  assert.equal(converted.view, "ready");
  assert.deepEqual(reportCodes(converted), ["SOURCE_WARNINGS_PRESENT"]);
});

test("fixture 01 is blocked by accountName without any download URL", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("01-websites-lf.txt")),
    true,
  );

  assert.equal(analyzed.view, "parsed");
  const converted = harness.controller.convert();
  assert.equal(converted.view, "blocked");
  assert.deepEqual(reportCodes(converted), ["ACCOUNT_NAME_UNMAPPED"]);
  assert.equal(converted.canDownload, false);
  assert.equal(converted.downloadUrl, null);
  assert.match(converted.report.text, /Tamanho da entrada \(bytes\): 456/u);
  assert.equal(harness.createdBytes.length, 0);
});

test("globally blocked fixture 16 never calls the serializer", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("16-mixed-supported-unknown-negative-lf.txt")),
    true,
  );

  assert.equal(analyzed.view, "blocked");
  assert.equal(analyzed.canConvert, false);
  assert.equal(analyzed.canDownload, false);
  assert.equal(harness.serializeCalls(), 0);
  assert.equal(harness.controller.convert().view, "blocked");
  assert.equal(harness.serializeCalls(), 0);
  assert.equal(harness.createdBytes.length, 0);
});

for (const name of [
  "03-notes-multiline-lf.txt",
  "17-comment-multiline-hypothetical-negative-lf.txt",
]) {
  test(`multiline negative fixture ${name} never enables conversion`, async () => {
    const harness = createHarness();
    const state = await harness.controller.analyzeFile(fakeFile(fixture(name)), true);

    assert.equal(state.view, "blocked");
    assert.equal(state.canConvert, false);
    assert.equal(state.canDownload, false);
    assert.equal(harness.createdBytes.length, 0);
  });
}

test("fictional confirmation is required before reading", async () => {
  let reads = 0;
  const harness = createHarness({
    readFile: async () => {
      reads += 1;
      return fixture("18-websites-blank-separated-crlf.txt");
    },
  });
  const state = await harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    false,
  );

  assert.equal(state.view, "blocked");
  assert.deepEqual(reportCodes(state), ["FICTIONAL_CONFIRMATION_REQUIRED"]);
  assert.equal(reads, 0);
});

test("missing file is blocked without invoking the reader", async () => {
  let reads = 0;
  const harness = createHarness({
    readFile: async () => {
      reads += 1;
    },
  });
  const state = await harness.controller.analyzeFile(undefined, true);

  assert.deepEqual(reportCodes(state), ["FILE_REQUIRED"]);
  assert.equal(reads, 0);
});

test("oversized file is blocked before reading bytes", async () => {
  let reads = 0;
  const harness = createHarness({
    readFile: async () => {
      reads += 1;
    },
  });
  const state = await harness.controller.analyzeFile(
    fakeFile(new Uint8Array(), { size: DEFAULT_MAX_BYTES + 1 }),
    true,
  );

  assert.deepEqual(reportCodes(state), ["FILE_TOO_LARGE"]);
  assert.equal(reads, 0);
  assert.equal(state.canDownload, false);
});

for (const bytes of [new Uint8Array(), fixture("11-windows-1252-hypothetical-crlf.txt")]) {
  test("empty or invalid UTF-8 input remains blocked", async () => {
    const harness = createHarness();
    const state = await harness.controller.analyzeFile(fakeFile(bytes), true);

    assert.equal(state.view, "blocked");
    assert.equal(state.canDownload, false);
    assert.equal(harness.createdBytes.length, 0);
  });
}

test("read exceptions produce a generic report without exception content", async () => {
  const marker = "FICTITIOUS-READ-SECRET";
  const harness = createHarness({
    readFile: async () => {
      throw new Error(marker);
    },
  });
  const state = await harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );

  assert.deepEqual(reportCodes(state), ["READ_FAILED"]);
  assert.doesNotMatch(state.report.text, new RegExp(marker, "u"));
});

test("parser and serializer exceptions never expose their messages", async () => {
  const marker = "FICTITIOUS-INTERNAL-SECRET";
  const parserHarness = createHarness({
    parse: () => {
      throw new Error(marker);
    },
  });
  const parseState = await parserHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  assert.deepEqual(reportCodes(parseState), ["PARSE_FAILED"]);
  assert.doesNotMatch(parseState.report.text, new RegExp(marker, "u"));

  const csvHarness = createHarness({
    serialize: () => {
      throw new Error(marker);
    },
  });
  await csvHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  const csvState = csvHarness.controller.convert();
  assert.deepEqual(reportCodes(csvState), ["CSV_FAILED"]);
  assert.doesNotMatch(csvState.report.text, new RegExp(marker, "u"));
});

test("malformed parser and serializer results are blocked", async () => {
  const parserHarness = createHarness({ parse: () => ({ blocked: false }) });
  const parseState = await parserHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  assert.deepEqual(reportCodes(parseState), ["PARSE_FAILED"]);

  const csvHarness = createHarness({
    serialize: () => ({ blocked: false, diagnostics: [], counts: {} }),
  });
  await csvHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  assert.deepEqual(reportCodes(csvHarness.controller.convert()), ["CSV_FAILED"]);
});

test("download URL preparation failures remain blocked", async () => {
  const throwingHarness = createHarness({
    createDownloadUrl: () => {
      throw new Error("FICTITIOUS-BLOB-SECRET");
    },
  });
  await throwingHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  const throwingState = throwingHarness.controller.convert();
  assert.deepEqual(reportCodes(throwingState), ["DOWNLOAD_PREPARATION_FAILED"]);
  assert.equal(throwingState.canDownload, false);

  const invalidHarness = createHarness({ createDownloadUrl: () => "https://unsafe.invalid/csv" });
  await invalidHarness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  const invalidState = invalidHarness.controller.convert();
  assert.deepEqual(reportCodes(invalidState), ["DOWNLOAD_PREPARATION_FAILED"]);
  assert.equal(invalidState.downloadUrl, null);
});

test("clearing and replacing input revoke temporary URLs", async () => {
  const harness = createHarness();
  const source = fakeFile(fixture("18-websites-blank-separated-crlf.txt"));
  await harness.controller.analyzeFile(source, true);
  harness.controller.convert();
  assert.deepEqual(harness.revokedUrls, []);

  harness.controller.clear();
  assert.deepEqual(harness.revokedUrls, ["blob:vaultswitch-test-1"]);
  assert.equal(harness.controller.getState().view, "idle");

  await harness.controller.analyzeFile(source, true);
  harness.controller.convert();
  await harness.controller.analyzeFile(source, true);
  assert.deepEqual(harness.revokedUrls, [
    "blob:vaultswitch-test-1",
    "blob:vaultswitch-test-2",
  ]);
});

test("download consumption revokes the URL and disables reuse", async () => {
  const harness = createHarness();
  await harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  harness.controller.convert();
  const released = harness.controller.releaseDownload();

  assert.equal(released.canDownload, false);
  assert.equal(released.downloadUrl, null);
  assert.deepEqual(harness.revokedUrls, ["blob:vaultswitch-test-1"]);
  assert.equal(harness.controller.releaseDownload(), released);
});

test("a stale file read cannot replace a newer analysis", async () => {
  const firstRead = deferred();
  const firstFile = fakeFile(fixture("04-empty-fields-lf.txt"), {
    arrayBuffer: () => firstRead.promise,
  });
  const secondBytes = fixture("18-websites-blank-separated-crlf.txt");
  const harness = createHarness();

  const firstOperation = harness.controller.analyzeFile(firstFile, true);
  const secondState = await harness.controller.analyzeFile(fakeFile(secondBytes), true);
  assert.equal(secondState.metrics.recognized, 2);

  firstRead.resolve(fixture("04-empty-fields-lf.txt"));
  await firstOperation;
  assert.equal(harness.controller.getState().metrics.recognized, 2);
  assert.equal(harness.controller.getState().view, "parsed");
});

test("clear during file read prevents residual parse and download", async () => {
  const pending = deferred();
  let parses = 0;
  const harness = createHarness({
    readFile: () => pending.promise,
    parse: (bytes) => {
      parses += 1;
      return parseKasperskyTxtBytes(bytes);
    },
  });
  const operation = harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  harness.controller.clear();
  pending.resolve(fixture("18-websites-blank-separated-crlf.txt"));
  await operation;

  assert.equal(parses, 0);
  assert.equal(harness.controller.getState().view, "idle");
  assert.equal(harness.controller.getState().canDownload, false);
});

test("clipboard success receives only the safe report text", async () => {
  const report = createSafeReport({
    phase: "CSV",
    status: "OK_V0_EXPERIMENTAL",
    counts: { exportedRecords: 2 },
  });
  let copied;
  let fallbackCalls = 0;
  const result = await copyReportText(
    report.text,
    { writeText: async (text) => { copied = text; } },
    () => { fallbackCalls += 1; },
  );

  assert.equal(result, true);
  assert.equal(copied, report.text);
  assert.equal(fallbackCalls, 0);
  assert.doesNotMatch(copied, /Password:|Login:|https?:\/\//u);
});

test("clipboard failure uses manual selection without exposing the error", async () => {
  let fallbackCalls = 0;
  const result = await copyReportText(
    "safe report",
    { writeText: async () => { throw new Error("FICTITIOUS-CLIPBOARD-SECRET"); } },
    () => { fallbackCalls += 1; },
  );

  assert.equal(result, false);
  assert.equal(fallbackCalls, 1);
  assert.equal(await copyReportText("", null, () => { fallbackCalls += 1; }), false);
  assert.equal(fallbackCalls, 1);
});

test("initial state and application version remain explicit", () => {
  const harness = createHarness();
  const state = harness.controller.getState();

  assert.equal(APP_VERSION, "UI-001 V0 experimental");
  assert.equal(state.view, "idle");
  assert.equal(state.canConvert, false);
  assert.equal(state.canDownload, false);
  assert.equal(state.report, null);
});
