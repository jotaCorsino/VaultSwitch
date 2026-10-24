"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_MAX_BYTES,
  parseKasperskyTxtBytes,
} = require("../assets/js/kaspersky-parser.js");

const FIXTURE_DIRECTORY = path.join(__dirname, "fixtures", "kaspersky");

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIRECTORY, name));
}

function parseFixture(name, options) {
  return parseKasperskyTxtBytes(fixture(name), options);
}

function diagnosticCodes(result) {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function bytes(text) {
  return new TextEncoder().encode(text);
}

test("01 recognizes two website records and preserves mapped fields", () => {
  const result = parseFixture("01-websites-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.counts.websites, 2);
  assert.deepEqual(result.records[0], {
    type: "website",
    title: "Portal Alpha Fictício",
    accountName: "Conta principal fictícia",
    username: "pessoa.alpha@example.invalid",
    password: 'FICTITIOUS:comma,quote"safe',
    url: "https://alpha.example.invalid/sign-in?next=a:b",
    notes: 'Somente teste fictício, com vírgula, "aspas" e dois-pontos: preservados.',
    group: "Websites",
    warnings: [],
  });
});

test("02 recognizes applications after an empty Websites section and CRLF normalization", () => {
  const result = parseFixture("02-applications-crlf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.counts.applications, 2);
  assert.equal(result.records[0].type, "application");
  assert.equal(result.records[0].title, "Aplicativo Órbita Fictício");
  assert.equal(result.records[0].accountName, "Perfil local fictício");
  assert.equal(result.records[0].username, "user-app");
  assert.equal(result.records[0].url, "");
});

test("03 blocks the unsupported Notes section", () => {
  const result = parseFixture("03-notes-multiline-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.counts.unknownSections, 1);
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_SECTION"));
});

test("04 preserves explicit empty values and reports safe warnings", () => {
  const result = parseFixture("04-empty-fields-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].url, "");
  assert.equal(result.records[0].accountName, "");
  assert.equal(result.records[0].username, "");
  assert.equal(result.records[0].password, "");
  assert.equal(result.records[0].notes, "");
  assert.equal(result.records[0].warnings.length, 5);
  assert.equal(result.counts.diagnosticsByCode.EMPTY_VALUE, 5);
});

test("05 accepts one UTF-8 BOM and preserves accented text", () => {
  const result = parseFixture("05-utf8-bom-accents-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Árvore Órbita Fictícia");
  assert.equal(result.records[0].password, "FICTITIOUS-AÇÃO-Ç-Ã");
});

test("06 splits on the first colon and does not treat inline dashes as a boundary", () => {
  const result = parseFixture("06-delimiter-in-values-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].username, "login:com:dois-pontos");
  assert.equal(result.records[0].password, 'FICTITIOUS---NOT-A-BOUNDARY:comma,"quote"');
  assert.equal(result.records[0].notes, "O texto contém --- mas a linha completa não é um separador.");
});

test("07 keeps repeated accounts in source order without deduplication", () => {
  const result = parseFixture("07-multiple-accounts-hypothetical-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].title, result.records[1].title);
  assert.notEqual(result.records[0].username, result.records[1].username);
});

test("08 blocks unsupported PT-BR labels without translation", () => {
  const result = parseFixture("08-ptbr-labels-hypothetical-lf.txt");

  assert.equal(result.blocked, true);
  assert.ok(diagnosticCodes(result).includes("UNSUPPORTED_LOCALE"));
  assert.equal(result.records.length, 0);
});

test("09 blocks and counts an unknown section", () => {
  const result = parseFixture("09-unknown-section-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.counts.unknownSections, 1);
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_SECTION"));
});

test("10 rejects text without supported structure", () => {
  const result = parseFixture("10-invalid-lf.txt");

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["NO_SUPPORTED_RECORDS"]);
});

test("11 rejects invalid UTF-8 without Windows-1252 fallback", () => {
  const result = parseFixture("11-windows-1252-hypothetical-crlf.txt");

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["INVALID_UTF8"]);
});

test("12 rejects UTF-16 BOM before decoding", () => {
  const result = parseFixture("12-utf16le-hypothetical.txt");

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["ENCODING_UNSUPPORTED"]);
});

test("13 distinguishes a missing structural label from an empty value", () => {
  const result = parseFixture("13-missing-required-field-negative-lf.txt");
  const missing = result.diagnostics.filter((diagnostic) => diagnostic.code === "MISSING_FIELD");

  assert.equal(result.blocked, true);
  assert.equal(result.counts.blockedRecords, 1);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].field, "Website name");
});

test("14 blocks a duplicate field without choosing either value", () => {
  const result = parseFixture("14-duplicate-field-negative-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 0);
  assert.equal(result.counts.blockedRecords, 1);
  assert.ok(diagnosticCodes(result).includes("DUPLICATE_FIELD"));
});

test("15 blocks an unknown field inside a recognized record", () => {
  const result = parseFixture("15-unknown-field-negative-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 0);
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_FIELD"));
});

test("16 blocks the whole result while retaining the supported record in memory", () => {
  const result = parseFixture("16-mixed-supported-unknown-negative-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Portal Reconhecível Fictício");
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_SECTION"));
});

test("17 preserves a multiline Comment that was provisionally blocked", () => {
  const result = parseFixture("17-comment-multiline-hypothetical-negative-lf.txt");

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.counts.blockedRecords, 0);
  assert.equal(
    result.records[0].notes,
    "Primeira linha inventada de um comentário hipotético.\n" +
      "Segunda linha inventada sem rótulo; sua fronteira não está homologada.",
  );
});

test("18 recognizes CRLF websites separated by a blank line and EOF without newline", () => {
  const source = fixture("18-websites-blank-separated-crlf.txt");
  const result = parseKasperskyTxtBytes(source);

  assert.notEqual(source[source.length - 1], 0x0a);
  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].title, "Estação Aurora Fictícia");
  assert.equal(result.records[1].title, "Estação Boreal Fictícia");
  assert.equal(result.records[0].accountName, "");
  assert.equal(result.records[1].notes, "Comentário inteiramente inventado, teste.");
});

test("20 preserves multiline Comments across all three observed categories", () => {
  const source = fixture("20-three-categories-multiline-observed-structure-crlf.txt");
  const result = parseKasperskyTxtBytes(source);
  const decodedSource = source.subarray(3).toString("utf8");

  assert.deepEqual(Array.from(source.subarray(0, 3)), [0xef, 0xbb, 0xbf]);
  assert.equal((decodedSource.match(/\r\r\n/gu) || []).length, 2);
  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 4);
  assert.equal(result.counts.websites, 2);
  assert.equal(result.counts.applications, 1);
  assert.equal(result.counts.otherAccounts, 1);
  assert.equal(result.records[0].notes, "Linha web A1 fictícia\n---\nLinha web A3 fictícia");
  assert.equal(
    result.records[1].notes,
    "Parágrafo web B1 fictício\n\n---\n\nParágrafo web B2 fictício",
  );
  assert.equal(result.records[2].notes, "Linha app 1 fictícia\n---\nLinha app 3 fictícia");
  assert.deepEqual(
    {
      type: result.records[3].type,
      title: result.records[3].title,
      accountName: result.records[3].accountName,
      username: result.records[3].username,
      password: result.records[3].password,
      url: result.records[3].url,
      notes: result.records[3].notes,
      group: result.records[3].group,
    },
    {
      type: "other",
      title: "Conta Genérica Multilinha Fictícia",
      accountName: "",
      username: "usuario-other-ficticio",
      password: "FICTITIOUS-OTHER",
      url: "",
      notes: "Linha other 1 fictícia\n---\nLinha other 3 fictícia",
      group: "Other Accounts",
    },
  );
});

test("21 blocks an unknown Other Accounts field before Comment", () => {
  const result = parseFixture("21-other-accounts-invalid-field-negative-lf.txt");

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 0);
  assert.equal(result.counts.blockedRecords, 1);
  assert.equal(result.counts.otherAccounts, 0);
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_FIELD"));
});

test("accepts ArrayBuffer and respects Uint8Array view boundaries", () => {
  const source = bytes([
    "Websites",
    "",
    "Website name: Buffer Fictício",
    "Website URL: https://buffer.example.invalid",
    "Login name: Conta fictícia",
    "Login: buffer-user",
    "Password: FICTITIOUS-BUFFER",
    "Comment:",
  ].join("\n"));
  const arrayBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const padded = new Uint8Array(source.length + 2);
  padded[0] = 0xff;
  padded.set(source, 1);
  padded[padded.length - 1] = 0xff;

  assert.equal(parseKasperskyTxtBytes(arrayBuffer).blocked, false);
  assert.equal(parseKasperskyTxtBytes(padded.subarray(1, padded.length - 1)).blocked, false);
});

test("rejects empty and whitespace-only byte input", () => {
  assert.deepEqual(diagnosticCodes(parseKasperskyTxtBytes(new Uint8Array())), ["EMPTY_FILE"]);
  assert.deepEqual(diagnosticCodes(parseKasperskyTxtBytes(bytes("\n\n"))), ["EMPTY_FILE"]);
  assert.deepEqual(
    diagnosticCodes(parseKasperskyTxtBytes(new Uint8Array([0xef, 0xbb, 0xbf]))),
    ["EMPTY_FILE"],
  );
});

test("rejects a header without records", () => {
  const result = parseKasperskyTxtBytes(bytes("Websites\n"));

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["NO_SUPPORTED_RECORDS"]);
});

test("blocks an explicitly empty structural field without calling it missing", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name:",
    "Website URL: https://empty-title.example.invalid",
    "Login name:",
    "Login: empty-title-user",
    "Password: FICTITIOUS-EMPTY-TITLE",
    "Comment:",
  ].join("\n")));
  const structuralDiagnostic = result.diagnostics.find(
    (diagnostic) => diagnostic.field === "Website name",
  );

  assert.equal(result.blocked, true);
  assert.equal(result.counts.blockedRecords, 1);
  assert.equal(structuralDiagnostic.code, "EMPTY_VALUE");
  assert.equal(structuralDiagnostic.severity, "error");
  assert.ok(!diagnosticCodes(result).includes("MISSING_FIELD"));
});

test("rejects malformed and unsupported BOM sequences deterministically", () => {
  assert.deepEqual(
    diagnosticCodes(parseKasperskyTxtBytes(new Uint8Array([0xef, 0xbb]))),
    ["INVALID_UTF8"],
  );
  assert.deepEqual(
    diagnosticCodes(parseKasperskyTxtBytes(new Uint8Array([0xfe, 0xff, 0x00, 0x41]))),
    ["ENCODING_UNSUPPORTED"],
  );
  assert.deepEqual(
    diagnosticCodes(parseKasperskyTxtBytes(new Uint8Array([0x00, 0x00, 0xfe, 0xff]))),
    ["ENCODING_UNSUPPORTED"],
  );
});

test("rejects isolated carriage return line endings", () => {
  const result = parseKasperskyTxtBytes(bytes("Websites\rWebsite name: Unsafe"));

  assert.equal(result.blocked, true);
  assert.deepEqual(diagnosticCodes(result), ["INVALID_LINE_ENDING"]);
});

test("rejects fields that start before a supported section", () => {
  const result = parseKasperskyTxtBytes(bytes("Website name: Sem seção\nLogin: fictitious"));

  assert.equal(result.blocked, true);
  assert.ok(diagnosticCodes(result).includes("INVALID_SECTION"));
  assert.ok(diagnosticCodes(result).includes("NO_SUPPORTED_RECORDS"));
});

test("preserves unlabeled content after Comment without including it in diagnostics", () => {
  const secretContinuation = "DO-NOT-LEAK-CONTINUATION";
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Multiline Fictício",
    "Website URL: https://multiline-test.example.invalid",
    "Login name: Perfil fictício",
    "Login: user",
    "Password: FICTITIOUS-SECRET",
    "Comment: First line",
    secretContinuation,
  ].join("\n")));

  assert.equal(result.blocked, false);
  assert.equal(result.records[0].notes, `First line\n${secretContinuation}`);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /DO-NOT-LEAK|FICTITIOUS-SECRET/u);
});

test("recognizes a complete next record after a multiline Comment without a delimiter", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "Website name: Primeiro Fictício",
    "Website URL: https://first-direct.example.invalid",
    "Login name:",
    "Login: first-direct",
    "Password: FICTITIOUS-FIRST-DIRECT",
    "Comment: primeira linha fictícia",
    "segunda linha fictícia",
    "Website name: Segundo Fictício",
    "Website URL: https://second-direct.example.invalid",
    "Login name:",
    "Login: second-direct",
    "Password: FICTITIOUS-SECOND-DIRECT",
    "Comment: final fictício",
  ].join("\n")));

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].notes, "primeira linha fictícia\nsegunda linha fictícia");
  assert.equal(result.records[1].title, "Segundo Fictício");
});

test("recognizes a complete next section after a multiline Comment without a delimiter", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "Website name: Portal Fictício",
    "Website URL: https://section-direct.example.invalid",
    "Login name:",
    "Login: section-direct",
    "Password: FICTITIOUS-SECTION-DIRECT",
    "Comment: linha web fictícia",
    "continuação web fictícia",
    "Applications",
    "Application: Aplicativo Fictício",
    "Login name:",
    "Login: app-direct",
    "Password: FICTITIOUS-APP-DIRECT",
    "Comment: linha app fictícia",
  ].join("\n")));

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].notes, "linha web fictícia\ncontinuação web fictícia");
  assert.equal(result.records[1].type, "application");
});

test("does not absorb an incomplete decorated record into the previous Comment", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Primeiro Completo",
    "Website URL: https://first.example.invalid",
    "Login name:",
    "Login: first-user",
    "Password: FICTITIOUS-FIRST",
    "Comment: comentário fictício",
    "",
    "---",
    "",
    "Website name: Segundo Incompleto",
    "Website URL: https://second.example.invalid",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Primeiro Completo");
  assert.equal(result.records[0].notes, "comentário fictício");
  assert.ok(diagnosticCodes(result).includes("MISSING_FIELD"));
});

test("blocks an incomplete blank-delimited record without merging it into the next record", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Primeiro Incompleto",
    "",
    "Website name: Segundo Completo",
    "Website URL: https://second.example.invalid",
    "Login name:",
    "Login: second-user",
    "Password: FICTITIOUS-SECOND",
    "Comment:",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.ok(diagnosticCodes(result).includes("AMBIGUOUS_RECORD_BOUNDARY"));
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Segundo Completo");
});

test("enforces a configurable byte limit before decoding", () => {
  const source = bytes("Websites\n");
  const result = parseKasperskyTxtBytes(source, { maxBytes: source.length - 1 });

  assert.equal(DEFAULT_MAX_BYTES, 5 * 1024 * 1024);
  assert.deepEqual(diagnosticCodes(result), ["FILE_TOO_LARGE"]);
  assert.throws(() => parseKasperskyTxtBytes(source, { maxBytes: 0 }), RangeError);
});

test("rejects unsupported API input types without echoing the input", () => {
  assert.throws(
    () => parseKasperskyTxtBytes("Password: SHOULD-NOT-APPEAR"),
    (error) => error instanceof TypeError && !error.message.includes("SHOULD-NOT-APPEAR"),
  );
});

test("duplicate sensitive fields never expose either value in diagnostics", () => {
  const firstSecret = "FIRST-DO-NOT-LEAK";
  const secondSecret = "SECOND-DO-NOT-LEAK";
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Duplicate Secret Fictício",
    "Website URL: https://diagnostic.example.invalid",
    "Login name:",
    "Login: diagnostic-user",
    `Password: ${firstSecret}`,
    `Password: ${secondSecret}`,
    "Comment:",
  ].join("\n")));
  const serializedDiagnostics = JSON.stringify(result.diagnostics);

  assert.equal(result.blocked, true);
  assert.ok(diagnosticCodes(result).includes("DUPLICATE_FIELD"));
  assert.doesNotMatch(serializedDiagnostics, /FIRST-DO-NOT-LEAK|SECOND-DO-NOT-LEAK/u);
});

test("all fixture diagnostics use only safe structural coordinates", () => {
  const fixtureNames = fs.readdirSync(FIXTURE_DIRECTORY)
    .filter((name) => name.endsWith(".txt"))
    .sort();
  const allowedKeys = new Set(["code", "severity", "section", "recordIndex", "field"]);

  assert.equal(fixtureNames.length, 21);

  for (const name of fixtureNames) {
    const result = parseFixture(name);
    for (const diagnostic of result.diagnostics) {
      assert.ok(
        Object.keys(diagnostic).every((key) => allowedKeys.has(key)),
        `${name} exposed an unexpected diagnostic property`,
      );
    }

    assert.doesNotMatch(
      JSON.stringify(result.diagnostics),
      /FICTITIOUS|example\.invalid|@[A-Za-z0-9.-]+/u,
      `${name} exposed a fixture value in diagnostics`,
    );
  }
});

test("blocks an unknown empty header before the first supported section", () => {
  const unknownHeader = "Unknown vault section";
  const result = parseKasperskyTxtBytes(bytes([
    unknownHeader,
    "",
    "Websites",
    "",
    "Website name: Prelude Website Fictício",
    "Website URL: https://prelude.example.invalid",
    "Login name:",
    "Login: prelude-user",
    "Password: FICTITIOUS-PRELUDE",
    "Comment:",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.counts.unknownSections, 1);
  assert.ok(diagnosticCodes(result).includes("UNKNOWN_SECTION"));
  assert.doesNotMatch(JSON.stringify(result.diagnostics), new RegExp(unknownHeader, "u"));
});

test("counts one unknown preamble block containing two unlabeled lines", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Other fictitious data",
    "No fictitious items",
    "",
    "Websites",
    "",
    "Website name: Two-line Prelude Fictício",
    "Website URL: https://two-line-prelude.example.invalid",
    "Login name:",
    "Login: two-line-user",
    "Password: FICTITIOUS-TWO-LINE-PRELUDE",
    "Comment:",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.counts.unknownSections, 1);
  assert.equal(result.counts.diagnosticsByCode.UNKNOWN_SECTION, 1);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /Other fictitious|No fictitious/u);
});

test("classifies an unknown section between valid sections after a dash boundary", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Before Dash Unknown Fictício",
    "Website URL: https://before-dash.example.invalid",
    "Login name:",
    "Login: before-dash-user",
    "Password: FICTITIOUS-BEFORE-DASH",
    "Comment:",
    "",
    "---",
    "",
    "Unknown middle section",
    "Unknown field: FICTITIOUS-UNKNOWN-MIDDLE",
    "",
    "---",
    "",
    "Applications",
    "",
    "Application: After Dash Unknown Fictício",
    "Login name:",
    "Login: after-dash-user",
    "Password: FICTITIOUS-AFTER-DASH",
    "Comment:",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 2);
  assert.equal(result.counts.unknownSections, 1);
  assert.equal(result.counts.diagnosticsByCode.UNKNOWN_SECTION, 1);
  assert.ok(!diagnosticCodes(result).includes("AMBIGUOUS_MULTILINE"));
  assert.ok(!diagnosticCodes(result).includes("MISSING_FIELD"));
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /FICTITIOUS-UNKNOWN-MIDDLE/u);
});

test("classifies an empty unknown section between blank-delimited valid sections", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Before Blank Unknown Fictício",
    "Website URL: https://before-blank.example.invalid",
    "Login name:",
    "Login: before-blank-user",
    "Password: FICTITIOUS-BEFORE-BLANK",
    "Comment:",
    "",
    "Unknown empty middle section",
    "",
    "Applications",
    "",
    "Application: After Blank Unknown Fictício",
    "Login name:",
    "Login: after-blank-user",
    "Password: FICTITIOUS-AFTER-BLANK",
    "Comment:",
  ].join("\n")));

  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 2);
  assert.equal(result.counts.unknownSections, 1);
  assert.equal(result.counts.diagnosticsByCode.UNKNOWN_SECTION, 1);
  assert.ok(!diagnosticCodes(result).includes("AMBIGUOUS_MULTILINE"));
  assert.ok(!diagnosticCodes(result).includes("MISSING_FIELD"));
});

test("removes at most one syntax space and preserves the remaining value exactly", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Spacing Fictício",
    "Website URL: https://spacing.example.invalid/path:a",
    "Login name: Account",
    "Login: user:name",
    "Password:  leading:and:trailing  ",
    "Comment:  preserved  ",
  ].join("\n")));

  assert.equal(result.blocked, false);
  assert.equal(result.records[0].password, " leading:and:trailing  ");
  assert.equal(result.records[0].notes, " preserved  ");
});

test("blocks a large synthetic invalid preamble without repeated suffix scans", () => {
  const lineCount = 50_000;
  const source = bytes(Array.from(
    { length: lineCount },
    (_, index) => `Unrecognized field ${index}: FICTITIOUS-LARGE-INPUT`,
  ).join("\n"));
  const result = parseKasperskyTxtBytes(source);

  assert.ok(source.byteLength < DEFAULT_MAX_BYTES);
  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 0);
  assert.equal(result.counts.unknownSections, 0);
  assert.deepEqual(diagnosticCodes(result), ["INVALID_SECTION", "NO_SUPPORTED_RECORDS"]);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /FICTITIOUS-LARGE-INPUT/u);
});

test("blocks many synthetic unknown blocks interleaved with valid records", () => {
  const blockCount = 2_000;
  const lines = [];

  for (let index = 0; index < blockCount; index += 1) {
    lines.push(
      "Websites",
      "",
      `Website name: Synthetic ${index}`,
      `Website URL: https://synthetic-${index}.example.invalid`,
      `Login name: Synthetic account ${index}`,
      `Login: synthetic-user-${index}`,
      `Password: FICTITIOUS-PASSWORD-${index}`,
      `Comment: Synthetic comment ${index}`,
      "",
      "---",
      "",
      `Unknown synthetic section ${index}`,
      `Unknown field: FICTITIOUS-UNKNOWN-${index}`,
      "",
      "---",
      "",
    );
  }

  const source = bytes(lines.join("\n"));
  const result = parseKasperskyTxtBytes(source);

  assert.ok(source.byteLength < DEFAULT_MAX_BYTES);
  assert.equal(result.blocked, true);
  assert.equal(result.records.length, blockCount);
  assert.equal(result.counts.websites, blockCount);
  assert.equal(result.counts.unknownSections, blockCount);
  assert.equal(result.counts.diagnosticsByCode.UNKNOWN_SECTION, blockCount);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /FICTITIOUS-UNKNOWN/u);
});

for (const sectionLikeCommentLine of ["Websites", "Applications"]) {
  test(`blocks ${sectionLikeCommentLine} after Comment without a proven boundary`, () => {
    const commentValue = "FICTITIOUS-COMMENT-FIRST-LINE";
    const result = parseKasperskyTxtBytes(bytes([
      "Websites",
      "",
      "Website name: Section-like Comment Fictício",
      "Website URL: https://section-like-comment.example.invalid",
      "Login name: Synthetic account",
      "Login: synthetic-user",
      "Password: FICTITIOUS-PASSWORD",
      `Comment: ${commentValue}`,
      sectionLikeCommentLine,
    ].join("\n")));

    assert.equal(result.blocked, true);
    assert.equal(result.records.length, 0);
    assert.equal(result.counts.blockedRecords, 1);
    assert.ok(diagnosticCodes(result).includes("AMBIGUOUS_MULTILINE"));
    assert.doesNotMatch(JSON.stringify(result.diagnostics), new RegExp(commentValue, "u"));
  });
}

test("accepts a recognized section after a complete blank-delimited record", () => {
  const result = parseKasperskyTxtBytes(bytes([
    "Websites",
    "",
    "Website name: Before Section Boundary Fictício",
    "Website URL: https://before-section-boundary.example.invalid",
    "Login name: Synthetic website account",
    "Login: synthetic-website-user",
    "Password: FICTITIOUS-WEBSITE-PASSWORD",
    "Comment: Synthetic website comment",
    "",
    "Applications",
    "",
    "Application: After Section Boundary Fictício",
    "Login name: Synthetic application account",
    "Login: synthetic-application-user",
    "Password: FICTITIOUS-APPLICATION-PASSWORD",
    "Comment: Synthetic application comment",
  ].join("\n")));

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
  assert.equal(result.counts.websites, 1);
  assert.equal(result.counts.applications, 1);
});
