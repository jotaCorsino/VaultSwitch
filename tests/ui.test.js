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
  canReadLocalFile,
  createSafeReport,
  createWorkflowController,
  copyReportText,
  mountVaultSwitch,
  readLocalFile,
  sanitizeDiagnostic,
} = require("../assets/js/app.js");

const ROOT = path.join(__dirname, "..");
const FIXTURE_DIRECTORY = path.join(__dirname, "fixtures", "kaspersky");

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIRECTORY, name));
}

function textBytes(lines) {
  return new TextEncoder().encode(Array.isArray(lines) ? lines.join("\n") : lines);
}

function parseQualifiedCsv(csvBytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(csvBytes);
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
  const canReadFile = overrides.canReadFile || ((file) => (
    file !== null &&
    typeof file === "object" &&
    typeof file.arrayBuffer === "function"
  ));
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
    canReadFile,
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

function createMountedBrowserHarness() {
  class BrowserBlob {
    constructor(parts = [], options = {}) {
      this.parts = parts.map((part) => Uint8Array.from(part));
      this.size = this.parts.reduce((total, part) => total + part.byteLength, 0);
      this.type = options.type || "";
    }

    async arrayBuffer() {
      const bytes = new Uint8Array(this.size);
      let offset = 0;
      for (const part of this.parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      return bytes.buffer;
    }
  }

  class FakeClassList {
    constructor() {
      this.values = new Set();
    }

    add(...names) {
      names.forEach((name) => this.values.add(name));
    }

    remove(...names) {
      names.forEach((name) => this.values.delete(name));
    }

    toggle(name, force) {
      if (force === true) {
        this.values.add(name);
      } else if (force === false) {
        this.values.delete(name);
      } else if (this.values.has(name)) {
        this.values.delete(name);
      } else {
        this.values.add(name);
      }
    }
  }

  class FakeElement {
    constructor(id) {
      this.id = id;
      this.attributes = new Map();
      this.children = [];
      this.classList = new FakeClassList();
      this.listeners = new Map();
      this.checked = false;
      this.disabled = false;
      this.files = [];
      this.hidden = false;
      this.textContent = "";
      this.value = "";
    }

    addEventListener(name, listener) {
      const listeners = this.listeners.get(name) || [];
      listeners.push(listener);
      this.listeners.set(name, listeners);
    }

    append(...children) {
      this.children.push(...children);
    }

    appendChild(child) {
      this.children.push(child);
    }

    focus() {}

    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === "href") {
        this.href = undefined;
      }
    }

    replaceChildren(...children) {
      this.children = children;
    }

    select() {}

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    async emit(name, details = {}) {
      const event = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        target: this,
        ...details,
      };
      for (const listener of this.listeners.get(name) || []) {
        await listener(event);
      }
      return event;
    }
  }

  const ids = [
    "fictional-confirmation",
    "source-file",
    "drop-zone",
    "workflow-panel",
    "convert-action",
    "reset-action",
    "download-action",
    "status-badge",
    "status-heading",
    "status-message",
    "metric-recognized",
    "metric-blocked",
    "metric-problems",
    "metric-warnings",
    "metric-output",
    "report-panel",
    "report-text",
    "diagnostic-list",
    "copy-report-action",
    "copy-feedback",
    "consent-feedback",
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement(id)]));
  const revokedUrls = [];
  const scheduledCallbacks = [];
  let urlSequence = 0;
  const documentRef = {
    createElement: (name) => new FakeElement(name),
    getElementById: (id) => elements.get(id),
  };
  const browserScope = {
    Blob: BrowserBlob,
    FileReader: class UnsupportedFileReader {},
    URL: {
      createObjectURL: () => {
        urlSequence += 1;
        return `blob:vaultswitch-browser-${urlSequence}`;
      },
      revokeObjectURL: (url) => revokedUrls.push(url),
    },
    VaultSwitchKasperskyParser: {
      DEFAULT_MAX_BYTES,
      parseKasperskyTxtBytes,
    },
    VaultSwitchKeePassXcCsv: { serializeKeePassXcCsv },
    addEventListener() {},
    navigator: {},
    setTimeout: (callback) => {
      scheduledCallbacks.push(callback);
      return scheduledCallbacks.length;
    },
  };
  const controller = mountVaultSwitch(documentRef, browserScope);

  return {
    BrowserBlob,
    controller,
    elements,
    revokedUrls,
    scheduledCallbacks,
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
});

test("CSP supports browser annotation visuals without enabling network access", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  assert.match(html, /style-src 'self' 'unsafe-inline'/u);
  assert.match(html, /img-src 'self' data: blob:/u);
  assert.match(html, /font-src 'self' data:/u);

  for (const directive of [
    "connect-src 'none'",
    "object-src 'none'",
    "media-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]) {
    assert.ok(html.includes(directive), `missing locked directive: ${directive}`);
  }

  assert.doesNotMatch(html, /https?:\/\//u);
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
  assert.doesNotMatch(source, /\bsetTimeout\s*\(/u);
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

test("safe report allows only the structural names required by Other Accounts", () => {
  const marker = "FICTITIOUS-OTHER-SECRET";
  const report = createSafeReport({
    phase: "PARSE",
    status: "BLOCKED",
    counts: { otherAccounts: 1 },
    diagnostics: [{
      code: "MISSING_FIELD",
      severity: "error",
      section: "Other Accounts",
      field: "Account name",
      recordIndex: 1,
      notes: marker,
    }],
  });

  assert.equal(report.model.counts[0].key, "otherAccounts");
  assert.equal(report.model.counts[0].label, "Outras contas");
  assert.equal(report.model.diagnostics[0].section, "Other Accounts");
  assert.equal(report.model.diagnostics[0].field, "Account name");
  assert.doesNotMatch(report.text, new RegExp(marker, "u"));
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

test("three-category fixture converts end-to-end with safe coherent counts", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("20-three-categories-multiline-observed-structure-crlf.txt")),
    true,
  );

  assert.equal(analyzed.view, "parsed");
  assert.equal(analyzed.canConvert, true);
  assert.equal(analyzed.metrics.recognized, 4);
  assert.match(analyzed.report.text, /Registros reconhecidos: 4/u);
  assert.match(analyzed.report.text, /Websites: 2/u);
  assert.match(analyzed.report.text, /Aplicações: 1/u);
  assert.match(analyzed.report.text, /Outras contas: 1/u);
  assert.doesNotMatch(
    analyzed.report.text,
    /FICTITIOUS|multiline\.invalid|usuario-|Linha web|Linha app|Linha other/u,
  );

  const converted = harness.controller.convert();
  const countMap = Object.fromEntries(
    converted.report.model.counts.map((count) => [count.key, count.value]),
  );
  const rows = parseQualifiedCsv(harness.createdBytes[0]);

  assert.equal(converted.view, "ready");
  assert.equal(converted.canDownload, true);
  assert.equal(countMap.sourceRecords, 4);
  assert.equal(countMap.exportedRecords, 4);
  assert.equal(countMap.otherAccounts, 1);
  assert.match(converted.report.text, /Registros de origem: 4/u);
  assert.match(converted.report.text, /Registros exportados: 4/u);
  assert.match(converted.report.text, /Outras contas: 1/u);
  assert.doesNotMatch(
    converted.report.text,
    /FICTITIOUS|multiline\.invalid|usuario-|Linha web|Linha app|Linha other/u,
  );
  assert.deepEqual(rows[0], ["Group", "Title", "Username", "Password", "URL", "Notes"]);
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.length === 6));
  assert.deepEqual(rows[1], [
    "Websites",
    "Portal Multilinha A Fictício",
    "usuario-web-a-ficticio",
    "FICTITIOUS-WEB-A",
    "https://web-a-multiline.invalid/entrada",
    "Linha web A1 fictícia\n---\nLinha web A3 fictícia",
  ]);
  assert.equal(rows[2][0], "Websites");
  assert.equal(rows[2][5], "Parágrafo web B1 fictício\n\n---\n\nParágrafo web B2 fictício");
  assert.deepEqual(rows[3], [
    "Applications",
    "Aplicativo Multilinha Fictício",
    "usuario-app-ficticio",
    "FICTITIOUS-APP",
    "",
    "Linha app 1 fictícia\n---\nLinha app 3 fictícia",
  ]);
  assert.deepEqual(rows[4], [
    "Other Accounts",
    "Conta Genérica Multilinha Fictícia",
    "usuario-other-ficticio",
    "FICTITIOUS-OTHER",
    "",
    "Linha other 1 fictícia\n---\nLinha other 3 fictícia",
  ]);
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

test("missing Account name in Other Accounts is safely diagnosed and globally blocked", async () => {
  const harness = createHarness();
  const source = textBytes([
    "Other Accounts",
    "",
    "Login name:",
    "Login: other-missing-title-fictitious",
    "Password: FICTITIOUS-OTHER-MISSING-TITLE",
    "Comment: comentário fictício",
  ]);
  const state = await harness.controller.analyzeFile(fakeFile(source), true);

  assert.equal(state.view, "blocked");
  assert.equal(state.canConvert, false);
  assert.equal(state.canDownload, false);
  assert.equal(harness.serializeCalls(), 0);
  assert.equal(harness.createdBytes.length, 0);
  assert.match(state.report.text, /MISSING_FIELD/u);
  assert.match(state.report.text, /seção=Other Accounts/u);
  assert.match(state.report.text, /campo=Account name/u);
  assert.doesNotMatch(state.report.text, /FICTITIOUS|other-missing-title|comentário fictício/u);
});

test("unknown Other Accounts field blocks the UI without partial download", async () => {
  const harness = createHarness();
  const state = await harness.controller.analyzeFile(
    fakeFile(fixture("21-other-accounts-invalid-field-negative-lf.txt")),
    true,
  );

  assert.equal(state.view, "blocked");
  assert.equal(state.canConvert, false);
  assert.equal(state.canDownload, false);
  assert.equal(harness.serializeCalls(), 0);
  assert.equal(harness.createdBytes.length, 0);
  assert.match(state.report.text, /UNKNOWN_FIELD/u);
  assert.doesNotMatch(state.report.text, /FICTITIOUS-UNSUPPORTED-OTHER/u);
});

test("non-empty Other Accounts Login name keeps CSV and download globally blocked", async () => {
  const harness = createHarness();
  const source = textBytes([
    "Other Accounts",
    "",
    "Account name: Conta fictícia bloqueada",
    "Login name: Perfil fictício sem destino",
    "Login: other-account-name-fictitious",
    "Password: FICTITIOUS-OTHER-ACCOUNT-NAME",
    "Comment: comentário fictício",
  ]);
  const analyzed = await harness.controller.analyzeFile(fakeFile(source), true);

  assert.equal(analyzed.view, "parsed");
  assert.equal(analyzed.canConvert, true);
  assert.match(analyzed.report.text, /Outras contas: 1/u);

  const converted = harness.controller.convert();
  assert.equal(converted.view, "blocked");
  assert.equal(converted.canDownload, false);
  assert.equal(converted.downloadUrl, null);
  assert.deepEqual(reportCodes(converted), ["ACCOUNT_NAME_UNMAPPED"]);
  assert.equal(harness.createdBytes.length, 0);
  assert.doesNotMatch(
    converted.report.text,
    /Perfil fictício|other-account-name|FICTITIOUS-OTHER-ACCOUNT-NAME|comentário fictício/u,
  );
});

for (const name of ["03-notes-multiline-lf.txt"]) {
  test(`multiline negative fixture ${name} never enables conversion`, async () => {
    const harness = createHarness();
    const state = await harness.controller.analyzeFile(fakeFile(fixture(name)), true);

    assert.equal(state.view, "blocked");
    assert.equal(state.canConvert, false);
    assert.equal(state.canDownload, false);
    assert.equal(harness.createdBytes.length, 0);
  });
}

test("fixture 17 is parsed with multiline preserved and then blocked only by accountName", async () => {
  const harness = createHarness();
  const analyzed = await harness.controller.analyzeFile(
    fakeFile(fixture("17-comment-multiline-hypothetical-negative-lf.txt")),
    true,
  );

  assert.equal(analyzed.view, "parsed");
  assert.equal(analyzed.canConvert, true);
  const converted = harness.controller.convert();
  assert.equal(converted.view, "blocked");
  assert.deepEqual(reportCodes(converted), ["ACCOUNT_NAME_UNMAPPED"]);
  assert.equal(converted.canDownload, false);
  assert.equal(harness.createdBytes.length, 0);
});

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

test("legacy browser Blob uses the FileReader fallback and keeps the byte limit", async () => {
  const bytes = fixture("18-websites-blank-separated-crlf.txt");
  let fileReaderCalls = 0;

  class LegacyBlob {
    constructor(content, size = content.byteLength) {
      this.content = content;
      this.size = size;
    }
  }

  class FakeFileReader {
    constructor() {
      this.listeners = new Map();
      this.result = null;
    }

    addEventListener(name, listener) {
      this.listeners.set(name, listener);
    }

    readAsArrayBuffer(file) {
      fileReaderCalls += 1;
      this.result = Uint8Array.from(file.content);
      this.listeners.get("load")();
    }
  }

  const browserScope = { Blob: LegacyBlob, FileReader: FakeFileReader };
  const harness = createHarness({
    canReadFile: (file) => canReadLocalFile(file, browserScope),
    readFile: (file) => readLocalFile(file, browserScope),
  });
  const legacyFile = new LegacyBlob(bytes);

  assert.equal(typeof legacyFile.arrayBuffer, "undefined");
  assert.equal(canReadLocalFile(legacyFile, browserScope), true);
  const state = await harness.controller.analyzeFile(legacyFile, true);
  assert.equal(state.view, "parsed");
  assert.equal(state.metrics.recognized, 2);
  assert.equal(fileReaderCalls, 1);

  const oversized = new LegacyBlob(new Uint8Array(), DEFAULT_MAX_BYTES + 1);
  const blocked = await harness.controller.analyzeFile(oversized, true);
  assert.deepEqual(reportCodes(blocked), ["FILE_TOO_LARGE"]);
  assert.equal(fileReaderCalls, 1);
});

test("FileReader fallback rejects an arbitrary file-like object before reading", async () => {
  class BrowserBlob {}
  class FakeFileReader {}
  const browserScope = { Blob: BrowserBlob, FileReader: FakeFileReader };
  let reads = 0;
  const harness = createHarness({
    canReadFile: (file) => canReadLocalFile(file, browserScope),
    readFile: async () => {
      reads += 1;
      return new Uint8Array();
    },
  });
  const arbitraryInput = { size: 5 };
  const hostileInput = {
    get size() {
      throw new Error("FICTITIOUS-SIZE-SECRET");
    },
  };

  assert.equal(canReadLocalFile(arbitraryInput, browserScope), false);
  assert.equal(canReadLocalFile(hostileInput, browserScope), false);
  const state = await harness.controller.analyzeFile(arbitraryInput, true);
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

test("explicit download release requires the matching URL", async () => {
  const harness = createHarness();
  await harness.controller.analyzeFile(
    fakeFile(fixture("18-websites-blank-separated-crlf.txt")),
    true,
  );
  harness.controller.convert();
  const current = harness.controller.getState();
  assert.equal(harness.controller.releaseDownload("blob:stale-url"), current);
  assert.deepEqual(harness.revokedUrls, []);

  const released = harness.controller.releaseDownload(current.downloadUrl);

  assert.equal(released.canDownload, false);
  assert.equal(released.downloadUrl, null);
  assert.deepEqual(harness.revokedUrls, ["blob:vaultswitch-test-1"]);
  assert.equal(harness.controller.releaseDownload(current.downloadUrl), released);
});

test("successive download clicks never schedule a stale revocation for a newer file", async () => {
  const harness = createMountedBrowserHarness();
  const download = harness.elements.get("download-action");

  const blockedClick = await download.emit("click");
  assert.equal(blockedClick.defaultPrevented, true);

  const firstFile = new harness.BrowserBlob([
    fixture("18-websites-blank-separated-crlf.txt"),
  ]);
  await harness.controller.analyzeFile(firstFile, true);
  const firstReady = harness.controller.convert();
  const firstUrl = firstReady.downloadUrl;
  assert.equal(firstUrl, "blob:vaultswitch-browser-1");

  const firstClick = await download.emit("click");
  const repeatedClick = await download.emit("click");
  assert.equal(firstClick.defaultPrevented, false);
  assert.equal(repeatedClick.defaultPrevented, false);
  assert.equal(harness.scheduledCallbacks.length, 0);
  assert.deepEqual(harness.revokedUrls, []);

  const secondFile = new harness.BrowserBlob([fixture("04-empty-fields-lf.txt")]);
  await harness.controller.analyzeFile(secondFile, true);
  assert.deepEqual(harness.revokedUrls, [firstUrl]);
  const secondReady = harness.controller.convert();
  const secondUrl = secondReady.downloadUrl;
  assert.equal(secondUrl, "blob:vaultswitch-browser-2");

  assert.equal(harness.controller.releaseDownload(firstUrl), secondReady);
  assert.equal(harness.controller.getState().downloadUrl, secondUrl);
  assert.deepEqual(harness.revokedUrls, [firstUrl]);

  const secondClick = await download.emit("click");
  assert.equal(secondClick.defaultPrevented, false);
  assert.equal(harness.scheduledCallbacks.length, 0);
  assert.equal(harness.controller.getState().downloadUrl, secondUrl);

  harness.controller.clear();
  assert.deepEqual(harness.revokedUrls, [firstUrl, secondUrl]);
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
