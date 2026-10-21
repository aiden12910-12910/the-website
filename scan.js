#!/usr/bin/env node
/**
 * Unified scanner.
 * Usage:
 *   node scan.js                 -> run eslint/htmlhint/stylelint/playwright, write scan-error-data.json
 *   node scan.js --merge-lychee  -> merge lychee.json into scan-error-data.json
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_JSON = path.join(ROOT, 'scan-error-data.json');
const TMP_DIR = path.join(ROOT, '.scan-tmp');
const LYCHEE_JSON = path.join(ROOT, 'lychee.json');

// ---------- helpers ----------
function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function run(cmd, label) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return out;
  } catch (e) {
    const msg = (e.stdout || '') + (e.stderr || '');
    console.error(`[${label}] command failed: ${cmd}`);
    console.error(`[${label}] output:`, msg.slice(0, 500));
    return msg;
  }
}

function parseJsonFromOutput(text) {
  if (!text) return null;
  const start = text.search(/[\[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch (e) {
    return null;
  }
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

// ---------- ESLint ----------
function scanEslint() {
  console.log('Running ESLint...');
  const cmd = `npx eslint js/ api/ --ext .js --no-eslintrc --env browser,node,es2021 --parser-options ecmaVersion:2021 --rule "{\\"no-unused-vars\\":\\"warn\\",\\"no-undef\\":\\"error\\"}" -f json`;
  const out = run(cmd, 'eslint');
  const data = parseJsonFromOutput(out);
  if (!Array.isArray(data)) {
    console.log('ESLint: no JSON output (tool may have failed)');
    return [];
  }
  const res = [];
  data.forEach(file => {
    (file.messages || []).forEach(m => {
      res.push({
        file: path.relative(ROOT, file.filePath || ''),
        line: m.line || 0,
        column: m.column || 0,
        severity: m.severity === 2 ? 'error' : 'warning',
        rule: m.ruleId || 'unknown',
        message: m.message,
        source: 'eslint'
      });
    });
  });
  console.log(`ESLint: ${res.length} issues`);
  return res;
}

// ---------- HTMLHint ----------
function scanHtmlhint() {
  console.log('Running HTMLHint...');
  const rulesFile = path.join(TMP_DIR, 'htmlhintrc.json');
  fs.writeFileSync(rulesFile, JSON.stringify({
    'tagname-lowercase': true,
    'attr-lowercase': true,
    'attr-value-double-quotes': true,
    'doctype-first': true,
    'tag-pair': true,
    'spec-char-escape': true,
    'id-unique': true,
    'src-not-empty': true
  }, null, 2));

  const files = ['index.html'];
  if (fs.existsSync(path.join(ROOT, '404.html'))) files.push('404.html');

  const cmd = `npx htmlhint ${files.join(' ')} --config "${rulesFile}" --format json`;
  const out = run(cmd, 'htmlhint');
  const data = parseJsonFromOutput(out);
  if (!Array.isArray(data)) {
    console.log('HTMLHint: no JSON output (tool may have failed)');
    return [];
  }
  const res = [];
  data.forEach(file => {
    (file.messages || []).forEach(m => {
      res.push({
        file: path.relative(ROOT, file.file || 'index.html'),
        line: m.line || 0,
        column: m.col || 0,
        severity: m.type === 'error' ? 'error' : 'warning',
        rule: m.rule ? m.rule.id : 'unknown',
        message: m.message,
        source: 'htmlhint'
      });
    });
  });
  console.log(`HTMLHint: ${res.length} issues`);
  return res;
}

// ---------- Stylelint ----------
function scanStylelint() {
  console.log('Running Stylelint...');
  const configFile = path.join(TMP_DIR, 'stylelintrc.json');
  fs.writeFileSync(configFile, JSON.stringify({
    extends: 'stylelint-config-standard',
    rules: {
      'selector-class-pattern': null,
      'custom-property-pattern': null,
      'no-descending-specificity': null
    }
  }, null, 2));

  const cssDir = path.join(ROOT, 'css');
  if (!fs.existsSync(cssDir)) {
    console.log('Stylelint: no css/ directory, skipping');
    return [];
  }

  const cmd = `npx stylelint "css/*.css" --config "${configFile}" --formatter json`;
  const out = run(cmd, 'stylelint');
  const data = parseJsonFromOutput(out);
  if (!Array.isArray(data)) {
    console.log('Stylelint: no JSON output (tool may have failed)');
    return [];
  }
  const res = [];
  data.forEach(file => {
    (file.warnings || []).forEach(w => {
      res.push({
        file: path.relative(ROOT, file.source || ''),
        line: w.line || 0,
        column: w.column || 0,
        severity: w.severity === 'error' ? 'error' : 'warning',
        rule: w.rule || 'unknown',
        message: w.text,
        source: 'stylelint'
      });
    });
  });
  console.log(`Stylelint: ${res.length} issues`);
  return res;
}

// ---------- Playwright (smoke test) ----------
function scanPlaywright() {
  console.log('Running Playwright smoke test...');

  const testFile = path.join(TMP_DIR, 'smoke.spec.js');
  fs.writeFileSync(testFile, `
const { test, expect } = require('@playwright/test');

test('page loads without JS errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      var text = msg.text();
      if (text.includes('GSI_LOGGER') || text.includes('403')) return;
      errors.push(text);
    }
  });
  await page.goto('http://localhost:3000/index.html');
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
`, 'utf8');

  const configFile = path.join(TMP_DIR, 'playwright.config.js');
  fs.writeFileSync(configFile, `
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '${TMP_DIR.replace(/\\/g, '/')}',
  testMatch: 'smoke.spec.js',
  timeout: 30000,
  use: { baseURL: 'http://localhost:3000', headless: true }
});
`, 'utf8');

  // 启动 http-server
  let server;
  try {
    server = spawn('npx', ['http-server', '.', '-p', '3000', '-s'], { cwd: ROOT, stdio: 'ignore' });
  } catch (e) {
    console.log('Playwright: failed to start http-server:', e.message);
    return [];
  }

  // 等 3 秒（简单 sleep）
  const start = Date.now();
  while (Date.now() - start < 3000) {}

  const cmd = `npx playwright test --config "${configFile}" --reporter=json`;
  const out = run(cmd, 'playwright');

  try { if (server) server.kill(); } catch (e) {}

  const data = parseJsonFromOutput(out);
  if (!data || !data.suites) {
    console.log('Playwright: no JSON output (tool may have failed)');
    return [];
  }
  const res = [];
  function walk(suite) {
    (suite.specs || []).forEach(spec => {
      (spec.tests || []).forEach(t => {
        (t.results || []).forEach(r => {
          if (r.status !== 'passed') {
            res.push({
              file: path.relative(ROOT, spec.file || 'index.html'),
              line: 0,
              column: 0,
              severity: 'error',
              rule: 'playwright',
              message: r.error ? r.error.message : ('Test failed: ' + spec.title),
              source: 'playwright'
            });
          }
        });
      });
    });
    (suite.suites || []).forEach(walk);
  }
  (data.suites || []).forEach(walk);
  console.log(`Playwright: ${res.length} issues`);
  return res;
}

// ---------- lychee merge ----------
function mergeLychee() {
  console.log('Merging lychee results...');
  if (!fs.existsSync(LYCHEE_JSON)) {
    console.log('lychee.json not found, skipping');
    return [];
  }
  const data = readJsonSafe(LYCHEE_JSON);
  if (!data || !data.fail_map) {
    console.log('lychee.json has no fail_map');
    return [];
  }
  const res = [];
  Object.keys(data.fail_map).forEach(url => {
    (data.fail_map[url] || []).forEach(item => {
      res.push({
        file: path.relative(ROOT, item.input || 'index.html'),
        line: 0,
        column: 0,
        severity: 'error',
        rule: 'dead-link',
        message: 'Dead link: ' + url + ' (' + (item.status ? item.status.text : 'unknown') + ')',
        source: 'lychee'
      });
    });
  });
  console.log(`Lychee: ${res.length} issues`);
  return res;
}

// ---------- main ----------
function buildOutput(eslint, htmlhint, stylelint, playwright, lychee) {
  const all = [].concat(eslint, htmlhint, stylelint, playwright, lychee);
  const errors = all.filter(x => x.severity === 'error');
  const warnings = all.filter(x => x.severity === 'warning');
  return {
    generatedAt: new Date().toISOString(),  // ← 加这一行
    summary: {
      total: all.length,
      errors: errors.length,
      warnings: warnings.length,
      bySource: {
        eslint: eslint.length,
        htmlhint: htmlhint.length,
        stylelint: stylelint.length,
        playwright: playwright.length,
        lychee: lychee.length
      }
    },
    errors: errors,
    warnings: warnings
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--merge-lychee')) {
    // 读现有的 scan-error-data.json（如果有），合并 lychee
    const existing = readJsonSafe(OUT_JSON) || { summary: { bySource: {} }, errors: [], warnings: [] };
    const lychee = mergeLychee();

    // 从现有里去掉旧的 lychee
    const keepErrors = (existing.errors || []).filter(e => e.source !== 'lychee');
    const keepWarnings = (existing.warnings || []).filter(w => w.source !== 'lychee');

    const eslint = keepErrors.filter(e => e.source === 'eslint').concat(keepWarnings.filter(w => w.source === 'eslint'));
    const htmlhint = keepErrors.filter(e => e.source === 'htmlhint').concat(keepWarnings.filter(w => w.source === 'htmlhint'));
    const stylelint = keepErrors.filter(e => e.source === 'stylelint').concat(keepWarnings.filter(w => w.source === 'stylelint'));
    const playwright = keepErrors.filter(e => e.source === 'playwright').concat(keepWarnings.filter(w => w.source === 'playwright'));

    const output = buildOutput(eslint, htmlhint, stylelint, playwright, lychee);
    fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2), 'utf8');
    console.log('Merged lychee into ' + OUT_JSON + '. Total: ' + output.summary.total);
    return;
  }

  ensureTmp();

  const eslint = scanEslint();
  const htmlhint = scanHtmlhint();
  const stylelint = scanStylelint();
  const playwright = scanPlaywright();

  const output = buildOutput(eslint, htmlhint, stylelint, playwright, []);
  fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote ' + OUT_JSON + '. Total: ' + output.summary.total);

  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}
}

main();
