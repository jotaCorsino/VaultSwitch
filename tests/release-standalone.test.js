"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(base, "VaultSwitch.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].map(match => match[1]);
function api() {
  const context = { Uint8Array, ArrayBuffer, TextEncoder, TextDecoder };
  vm.runInNewContext(scripts[0], context);
  vm.runInNewContext(scripts[1], context);
  return context;
}
test("beta contains standalone site with no review module", () => {
  assert.match(html, /<strong>Valt Switch<\/strong>/u);
  assert.match(html, /Converter TXT do Kaspersky/u);
  assert.equal(scripts.length, 3);
  assert.doesNotMatch(html, /_review\/|data-revision=|technolife-review/u);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=|<link[^>]*\shref=/u);
  assert.match(html, /const DEFAULT_MAX_BYTES = 50 \* 1024 \* 1024/u);
  assert.match(html, /const DEFAULT_MAX_CSV_BYTES = 100 \* 1024 \* 1024/u);
});
test("beta preserves three categories plus populated Kaspersky Login name", () => {
  const ctx = api();
  const fixture = fs.readFileSync(path.join(base,"tests/fixtures/kaspersky/20-three-categories-multiline-observed-structure-crlf.txt"),"utf8");
  const sample = fixture.replace("Login name:", "Login name: PERFIL-FICTICIO");
  const parsed = ctx.VaultSwitchKasperskyParser.parseKasperskyTxtBytes(Buffer.from(sample,"utf8"));
  assert.equal(parsed.blocked,false);
  assert.equal(parsed.records.length,4);
  assert.equal(parsed.counts.otherAccounts,1);
  const csv = ctx.VaultSwitchKeePassXcCsv.serializeKeePassXcCsv(parsed);
  assert.equal(csv.blocked,false);
  const output = new TextDecoder().decode(csv.csvBytes);
  assert.match(output,/^"Group","Title","Username","Password","URL","Notes"/u);
  assert.match(output,/Login name \(Kaspersky\):/u);
  assert.match(output,/PERFIL-FICTICIO/u);
  assert.match(output,/Linha web A1 fictícia/u);
  assert.match(output,/Linha other 3 fictícia/u);
});
test("beta refuses invalid TXT without partial CSV", () => {
  const ctx = api();
  const parsed = ctx.VaultSwitchKasperskyParser.parseKasperskyTxtBytes(Buffer.from("Websites\rWebsite name: FICTICIO","utf8"));
  assert.equal(parsed.blocked,true);
  const csv = ctx.VaultSwitchKeePassXcCsv.serializeKeePassXcCsv(parsed);
  assert.equal(csv.blocked,true);
  assert.equal(Object.hasOwn(csv,"csvBytes"),false);
});
