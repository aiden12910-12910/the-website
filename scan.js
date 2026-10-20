#!/usr/bin/env node
/**
 * Unified scanner: ESLint + HTMLHint + Stylelint + Playwright + lychee
 * Outputs: scan-error-data.json
 *
 * Usage: node scan.js
 * Requires: eslint, htmlhint, stylelint, @playwright/test, http-server
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_JSON = path.join(ROOT, 'scan-error-data.json');
const TMP_DIR = path.join(ROOT, '.scan-tmp');

// ---------- helpers ----------
function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function run(cmd, opts) {
  try {
    return execSync(cmd, Object.assign({ cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }, opts || {}));
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function readJsonSafe(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    // some tools prefix output with logs; find first { or [
    const start = raw.search(/[\[{]/);
    if (start === -1) return null;
    return JSON.parse(raw.slice(start));
  } catch (e) {
    return null;
  }
}

// ---------- ESLint ----------
function scanEslint() {
  const out = path.join(TMP_DIR, 'eslint.json');
  // 用内联配置，不依赖 .eslintrc.json
  run(`npx eslint js/ api/ --ext .js --no-eslintrc --env browser,node,es2021 --parser-options ecmaVersion:2021 --rule '{"no-unused-vars":"warn","no-undef":"error"}' -f json -o "${out}"`);
  const data = readJsonSafe(out);
  if (!Array.isArray(data)) return [];
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
  return res;
}

// ---------- HTMLHint ----------
function scanHtmlhint() {
  const out = path.join(TMP_DIR, 'htmlhint.json');
  const rules = JSON.stringify({
    'tagname-lowercase': true,
    'attr-lowercase': true,
    'attr-value-double-quotes': true,
    'doctype-first': true,
    'tag-pair': true,
    'spec-char-escape': true,
    'id-unique': true,
    'src-not-empty': true
  });
  const rulesFile = path.join(TMP_DIR, 'htmlhintrc.json');
  fs.writeFileSync(rulesFile, rules, 'utf8');
  run(`npx htmlhint index.html 404.html --config "${rulesFile}" --format json > "${out}"`);
  const data = readJsonSafe(out);
  if (!Array.isArray(data)) return [];
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
  return res;
}

// ---------- Stylelint ----------
function scanStylelint() {
  const out = path.join(TMP_DIR, 'stylelint.json');
  // 内联配置
  const config = JSON.stringify({
    extends: 'stylelint-config-standard',
    rules: {
      'selector-class-pattern': null,
      'custom-property-pattern': null,
      'no-descending-specificity': null
    }
  });
  const configFile = path.join(TMP_DIR, 'stylelintrc.json');
  fs.writeFileSync(configFile, config, 'utf8');
  run(`npx stylelint "css/*.css" --config "${configFile}" --formatter json > "${out}"`);
  const data = readJsonSafe(out);
  if (!Array.isArray(data)) return [];
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
  return res;
}

// ---------- Playwright (smoke test) ----------
function scanPlaywright() {
  const out = path.join(TMP_DIR, 'playwright.json');
  // 生成内联测试文件
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
  const server = spawn('npx', ['http-server', '.', '-p', '3000', '-s'], { cwd: ROOT, stdio: 'ignore' });
  // 等 2 秒
  const start = Date.now();
  while (Date.now() - start < 2000) {}

  run(`npx playwright test --config "${configFile}" --reporter=json > "${out}"`);

  try { server.kill(); } catch (e) {}

  const data = readJsonSafe(out);
  if (!data || !data.suites) return [];
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
  return res;
}

// ---------- lychee (dead links) ----------
function scanLychee() {
  const out = path.join(TMP_DIR, 'links.json');
  run(`npx lychee --verbose --no-progress --format json --output "${out}" index.html`);
  const data = readJsonSafe(out);
  if (!data || !data.fail_map) return [];
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
  return res;
}

// ---------- main ----------
function main() {
  ensureTmp();

  console.log('Scanning ESLint...');
  const eslint = scanEslint();
  console.log('Scanning HTMLHint...');
  const htmlhint = scanHtmlhint();
  console.log('Scanning Stylelint...');
  const stylelint = scanStylelint();
  console.log('Scanning Playwright...');
  const playwright = scanPlaywright();
  console.log('Scanning lychee...');
  const links = scanLychee();

  const all = [].concat(eslint, htmlhint, stylelint, playwright, links);
  const errors = all.filter(x => x.severity === 'error');
  const warnings = all.filter(x => x.severity === 'warning');

  const output = {
    summary: {
      total: all.length,
      errors: errors.length,
      warnings: warnings.length,
      bySource: {
        eslint: eslint.length,
        htmlhint: htmlhint.length,
        stylelint: stylelint.length,
        playwright: playwright.length,
        lychee: links.length
      }
    },
    errors: errors,
    warnings: warnings
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote ' + OUT_JSON + ' with ' + all.length + ' issues.');

  // 清理临时目录
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}
}

main();
