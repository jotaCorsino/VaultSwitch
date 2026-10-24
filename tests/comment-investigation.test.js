"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  parseKasperskyTxtBytes,
} = require("../assets/js/kaspersky-parser.js");

const AMBIGUOUS_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "kaspersky",
  "19-comment-delimiter-ambiguous-hypothetical-lf.txt",
);
const MULTILINE_NEGATIVE_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "kaspersky",
  "17-comment-multiline-hypothetical-negative-lf.txt",
);

function parse(bytes) {
  return parseKasperskyTxtBytes(bytes);
}

function diagnosticCodes(result) {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

function bytes(lines) {
  return new TextEncoder().encode(lines.join("\n"));
}

function websiteLines(comment, trailingLines = []) {
  return [
    "Websites",
    "",
    "Website name: Caso inteiramente fictício",
    "Website URL: https://caso-comment.invalid/entrada",
    "Login name:",
    "Login: usuario-ficticio",
    "Password: FICTITIOUS-COMMENT-INV",
    `Comment: ${comment}`,
    ...trailingLines,
  ];
}

test("COMMENT-INV-001 reproduces the delimiter ambiguity without real data", () => {
  const sourceLf = fs.readFileSync(AMBIGUOUS_FIXTURE);
  const sourceCrLf = Buffer.from(sourceLf.toString("utf8").replaceAll("\n", "\r\n"), "utf8");

  for (const source of [sourceLf, sourceCrLf]) {
    const result = parse(source);

    assert.equal(result.blocked, false);
    assert.equal(result.records.length, 2);
    assert.equal(result.counts.websites, 2);
    assert.deepEqual(diagnosticCodes(result), ["EMPTY_VALUE", "EMPTY_VALUE"]);
    assert.equal(result.records[0].notes, "linha narrativa inteiramente fictícia");
    assert.equal(result.records[1].title, "Isto também pode ser texto do comentário");
    assert.doesNotMatch(JSON.stringify(result.diagnostics), /FICTITIOUS|example-a|texto-comentario/u);
  }
});

test("C01 and C02 preserve multiline and blank-paragraph continuations", () => {
  const simpleContinuation = parse(fs.readFileSync(MULTILINE_NEGATIVE_FIXTURE));
  const blankParagraph = parse(bytes(websiteLines("parágrafo inicial fictício", [
    "",
    "",
    "parágrafo seguinte fictício",
  ])));

  assert.equal(simpleContinuation.blocked, false);
  assert.equal(
    simpleContinuation.records[0].notes,
    "Primeira linha inventada de um comentário hipotético.\n" +
      "Segunda linha inventada sem rótulo; sua fronteira não está homologada.",
  );
  assert.equal(blankParagraph.blocked, false);
  assert.equal(
    blankParagraph.records[0].notes,
    "parágrafo inicial fictício\n\n\nparágrafo seguinte fictício",
  );
});

test("C04 documents that surrounding spaces do not disambiguate a delimiter", () => {
  const source = fs.readFileSync(AMBIGUOUS_FIXTURE, "utf8").replace("\n---\n", "\n  ---  \n");
  const result = parse(Buffer.from(source, "utf8"));

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 2);
});

test("C05 preserves field-like Comment lines without a boundary", () => {
  const fieldLike = parse(bytes(websiteLines("linha inicial fictícia", [
    "Website name: texto parecido com campo",
    "Password: FICTITIOUS-MENTIONED-FIELD",
    "Comment: texto parecido com outro campo",
  ])));

  assert.equal(fieldLike.blocked, false);
  assert.equal(
    fieldLike.records[0].notes,
    "linha inicial fictícia\n" +
      "Website name: texto parecido com campo\n" +
      "Password: FICTITIOUS-MENTIONED-FIELD\n" +
      "Comment: texto parecido com outro campo",
  );
});

test("C06 still blocks a section-like line without a proven boundary", () => {
  for (const sectionName of ["Websites", "Applications"]) {
    const sectionLike = parse(bytes(websiteLines("linha inicial fictícia", [sectionName])));
    assert.equal(sectionLike.blocked, true);
    assert.ok(diagnosticCodes(sectionLike).includes("AMBIGUOUS_MULTILINE"));
  }
});

test("C07 preserves an empty or multiline Comment at EOF", () => {
  const emptyAtEof = parse(bytes(websiteLines("")));
  const multilineAtEof = parse(bytes(websiteLines("linha inicial fictícia", [
    "linha final fictícia sem newline",
  ])));

  assert.equal(emptyAtEof.blocked, false);
  assert.equal(emptyAtEof.records.length, 1);
  assert.equal(multilineAtEof.blocked, false);
  assert.equal(
    multilineAtEof.records[0].notes,
    "linha inicial fictícia\nlinha final fictícia sem newline",
  );
});

test("C09 preserves an application Comment continuation", () => {
  const result = parse(bytes([
    "Applications",
    "",
    "Application: Aplicativo inteiramente fictício",
    "Login name:",
    "Login: usuario-aplicativo-ficticio",
    "Password: FICTITIOUS-APPLICATION",
    "Comment: linha inicial fictícia",
    "linha seguinte fictícia",
  ]));

  assert.equal(result.blocked, false);
  assert.equal(result.records[0].notes, "linha inicial fictícia\nlinha seguinte fictícia");
});

test("C10 preserves special characters that remain on the labeled Comment line", () => {
  const comment = "acentos áç, aspas \"fictícias\", https://comentario.invalid/a:b e --- inline";
  const result = parse(bytes(websiteLines(comment)));

  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].notes, comment);
});
