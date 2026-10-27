"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const parser = require("../assets/js/kaspersky-parser.js");
const csvModule = require("../assets/js/keepassxc-csv.js");
const encoder = new TextEncoder();

function sample(category, count) {
  const fields = {
    Websites: i => ["Website name: Site-ficticio-" + i, "Website URL: https://example.invalid/" + i],
    Applications: i => ["Application: Aplicativo-ficticio-" + i],
    "Other Accounts": i => ["Account name: Conta-ficticia-" + i],
  };
  const entries = Array.from({ length: count }, (_, index) => [
    ...fields[category](index + 1),
    "Login name:",
    "Login: usuario-" + (index + 1),
    "Password: SENHA_FICTICIA_" + (index + 1),
    "Comment: observacao inteiramente ficticia",
    "", "---", "",
  ].join("\r\n"));
  return encoder.encode("\uFEFF" + entries.join("\r\n"));
}

test("aceita cinco sites sem cabecalho, UTF-8 BOM, CRLF e separadores", () => {
  const result = parser.parseKasperskyTxtBytes(sample("Websites", 5));
  assert.equal(result.blocked, false);
  assert.equal(result.records.length, 5);
  assert.equal(result.counts.websites, 5);
  assert.deepEqual(result.records.map(r => r.title), [
    "Site-ficticio-1", "Site-ficticio-2", "Site-ficticio-3", "Site-ficticio-4", "Site-ficticio-5",
  ]);
  assert.equal(result.records[0].notes, "observacao inteiramente ficticia");
  assert.equal(result.records[0].accountName, "");
  const output = csvModule.serializeKeePassXcCsv(result);
  assert.equal(output.blocked, false);
  assert.equal(output.counts.exportedRecords, 5);
  const csv = new TextDecoder().decode(output.csvBytes);
  assert.match(csv, /Site-ficticio-5/u);
});

test("infere Applications e Other Accounts por sequencias completas", () => {
  for (const [section, expected] of [["Applications", "applications"], ["Other Accounts", "otherAccounts"]]) {
    const result = parser.parseKasperskyTxtBytes(sample(section, 2));
    assert.equal(result.blocked, false, section);
    assert.equal(result.records.length, 2, section);
    assert.equal(result.counts[expected], 2, section);
  }
});

test("nao aceita categorias desconhecidas ou exporta CSV parcial", () => {
  const input = encoder.encode("Secao desconhecida\r\n\r\nCampo desconhecido: VALOR_FICTICIO\r\n\r\n---\r\n");
  const result = parser.parseKasperskyTxtBytes(input);
  assert.equal(result.blocked, true);
  assert.ok(result.diagnostics.some(d => d.code === "UNKNOWN_SECTION"));
  const output = csvModule.serializeKeePassXcCsv(result);
  assert.equal(output.blocked, true);
  assert.equal(Object.hasOwn(output, "csvBytes"), false);
});

test("nao aceita registro incompleto sem cabecalho", () => {
  const result = parser.parseKasperskyTxtBytes(encoder.encode(
    "Website name: Ficticio\r\nLogin: usuario\r\nPassword: FICTICIA\r\nComment: teste",
  ));
  assert.equal(result.blocked, true);
  assert.equal(result.records.length, 0);
});

test("o HTML independente tambem interpreta o TXT sem cabecalho", () => {
  const html = fs.readFileSync(path.join(root, "VaultSwitch.html"), "utf8");
  assert.doesNotMatch(html, /_review\//u);
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)];
  assert.equal(blocks.length, 3);
  const context = { Uint8Array, ArrayBuffer, TextDecoder, TextEncoder };
  vm.runInNewContext(blocks[0][1], context);
  vm.runInNewContext(blocks[1][1], context);
  const result = context.VaultSwitchKasperskyParser.parseKasperskyTxtBytes(sample("Websites", 5));
  assert.equal(result.blocked, false);
  const output = context.VaultSwitchKeePassXcCsv.serializeKeePassXcCsv(result);
  assert.equal(output.blocked, false);
  assert.equal(output.counts.exportedRecords, 5);
});
