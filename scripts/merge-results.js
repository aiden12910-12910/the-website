const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'scan-results');
const OUTPUT = path.join(__dirname, '..', 'error-data.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
  } catch (e) {
    return null;
  }
}

function normalizeEslint(data) {
  if (!Array.isArray(data)) return [];
  const out = [];
  data.forEach(file => {
    (file.messages || []).forEach(m => {
      out.push({
        file: file.filePath,
        line: m.line,
        column: m.column,
        severity: m.severity === 2 ? 'error' : 'warning',
        rule: m.ruleId || 'unknown',
        message: m.message,
        source: 'eslint'
      });
    });
  });
  return out;
}

function normalizeHtmlhint(data) {
  if (!Array.isArray(data)) return [];
  const out = [];
  data.forEach(file => {
    (file.messages || []).forEach(m => {
      out.push({
        file: file.file,
        line: m.line,
        column: m.col,
        severity: m.type === 'error' ? 'error' : 'warning',
        rule: m.rule ? m.rule.id : 'unknown',
        message: m.message,
        source: 'htmlhint'
      });
    });
  });
  return out;
}

function normalizeStylelint(data) {
  if (!Array.isArray(data)) return [];
  const out = [];
  data.forEach(file => {
    (file.warnings || []).forEach(w => {
      out.push({
        file: file.source,
        line: w.line,
        column: w.column,
        severity: w.severity === 'error' ? 'error' : 'warning',
        rule: w.rule || 'unknown',
        message: w.text,
        source: 'stylelint'
      });
    });
  });
  return out;
}

function normalizePlaywright(data) {
  if (!data || !data.suites) return [];
  const out = [];
  function walk(suite) {
    (suite.specs || []).forEach(spec => {
      (spec.tests || []).forEach(t => {
        (t.results || []).forEach(r => {
          if (r.status !== 'passed') {
            out.push({
              file: spec.file || 'unknown',
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
  return out;
}

function normalizeLinks(data) {
  if (!data || !data.fail_map) return [];
  const out = [];
  Object.keys(data.fail_map).forEach(url => {
    (data.fail_map[url] || []).forEach(item => {
      out.push({
        file: item.input || 'index.html',
        line: 0,
        column: 0,
        severity: 'error',
        rule: 'dead-link',
        message: 'Dead link: ' + url + ' (' + (item.status ? item.status.text : 'unknown') + ')',
        source: 'lychee'
      });
    });
  });
  return out;
}

const eslint = normalizeEslint(readJson('eslint.json'));
const htmlhint = normalizeHtmlhint(readJson('htmlhint.json'));
const stylelint = normalizeStylelint(readJson('stylelint.json'));
const playwright = normalizePlaywright(readJson('playwright.json'));
const links = normalizeLinks(readJson('links.json'));

const all = [].concat(eslint, htmlhint, stylelint, playwright, links);

const errors = all.filter(x => x.severity === 'error');
const warnings = all.filter(x => x.severity === 'warning');

const output = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || 'local',
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

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
console.log('Wrote ' + OUTPUT + ' with ' + all.length + ' issues.');
