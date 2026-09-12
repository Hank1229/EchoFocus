#!/usr/bin/env node
// Locale parity check for EchoFocus.
//
// apps/web and apps/extension each ship src/locales/en.json + zh-TW.json.
// The zh-TW module is imported and cast as `typeof en` in the i18n providers,
// so TypeScript never actually checks that the two files have the same keys —
// a key missing from zh-TW silently renders `undefined` in the UI instead of
// failing a build. This script is the real check: it diffs the two locale
// files key-by-key for every app and fails the build when they drift.
//
// Checks, per app:
//   1. Keys present in one locale but not the other (both directions).
//   2. Leaf values that are an empty string.
//   3. `{n}`-style placeholders that don't match between en and zh-TW for
//      the same key (e.g. en has "{n} days" but zh-TW has no placeholder,
//      or uses a different one).
//
// Exit code is non-zero if any app has a problem, zero when everything is
// clean. Uses only Node built-ins — no dependencies.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const APPS = [
  { name: 'web', dir: path.join(REPO_ROOT, 'apps/web/src/locales') },
  { name: 'extension', dir: path.join(REPO_ROOT, 'apps/extension/src/locales') },
];

const PLACEHOLDER_RE = /\{[^}]*\}/g;

function loadJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// Flattens a nested JSON object into a Map of dotted leaf-key -> value.
// Only string/number/boolean/null leaves are recorded; arrays and other
// non-plain-object values are treated as leaves too (locale files are not
// expected to contain arrays, but this avoids crashing if one appears).
function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const leafKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, leafKey, out);
    } else {
      out.set(leafKey, value);
    }
  }
  return out;
}

function extractPlaceholders(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(PLACEHOLDER_RE)].map((m) => m[0]).sort();
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function checkApp(app) {
  const enPath = path.join(app.dir, 'en.json');
  const zhPath = path.join(app.dir, 'zh-TW.json');

  const en = flatten(loadJson(enPath));
  const zh = flatten(loadJson(zhPath));

  const issues = [];

  const missingInZh = [...en.keys()].filter((k) => !zh.has(k)).sort();
  const missingInEn = [...zh.keys()].filter((k) => !en.has(k)).sort();

  for (const key of missingInZh) {
    issues.push(`  [missing:zh-TW] ${key}`);
  }
  for (const key of missingInEn) {
    issues.push(`  [missing:en]    ${key}`);
  }

  const emptyKeys = [];
  for (const [key, value] of en) {
    if (value === '') emptyKeys.push(`en/${key}`);
  }
  for (const [key, value] of zh) {
    if (value === '') emptyKeys.push(`zh-TW/${key}`);
  }
  emptyKeys.sort();
  for (const label of emptyKeys) {
    issues.push(`  [empty-value]   ${label}`);
  }

  const placeholderMismatches = [];
  for (const [key, enValue] of en) {
    if (!zh.has(key)) continue; // already reported as missing
    const zhValue = zh.get(key);
    const enPh = extractPlaceholders(enValue);
    const zhPh = extractPlaceholders(zhValue);
    if (!sameMultiset(enPh, zhPh)) {
      placeholderMismatches.push(
        `  [placeholder]   ${key} — en: [${enPh.join(', ')}] vs zh-TW: [${zhPh.join(', ')}]`
      );
    }
  }
  placeholderMismatches.sort();
  issues.push(...placeholderMismatches);

  const sharedKeyCount = [...en.keys()].filter((k) => zh.has(k)).length;
  const totalKeys = new Set([...en.keys(), ...zh.keys()]).size;

  return {
    app: app.name,
    enCount: en.size,
    zhCount: zh.size,
    sharedKeyCount,
    totalKeys,
    issues,
    ok: issues.length === 0,
  };
}

function main() {
  let anyFailed = false;

  for (const app of APPS) {
    const result = checkApp(app);
    const status = result.ok ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${result.app}: en=${result.enCount} zh-TW=${result.zhCount} shared=${result.sharedKeyCount}/${result.totalKeys}`
    );
    if (!result.ok) {
      anyFailed = true;
      for (const line of result.issues) {
        console.log(line);
      }
    }
  }

  if (anyFailed) {
    console.error('\nLocale parity check FAILED — fix the mismatches above.');
    process.exit(1);
  }

  console.log('\nLocale parity check passed — en/zh-TW are in sync for all apps.');
  process.exit(0);
}

main();
