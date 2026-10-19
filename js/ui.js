   // ============================================================
// Page element references
// ============================================================
var layer = document.getElementById('secure-backdoor-layer');
var iframe = document.getElementById('secure-iframe-target');
var panicBar = document.getElementById('panic-hover-bar');
var gameZone = document.getElementById('secret-game-zone');
var calcWrapper = document.getElementById('calculator-wrapper');
var issueTrigger = document.getElementById('issueTrigger');

// ============================================================
// Unlock logic
// ============================================================
function unlockSecretZone() {
    calcWrapper.style.display = "none";
    gameZone.style.display = "block";
    if (issueTrigger) issueTrigger.style.display = 'inline-block';
    if (!window.trackingStarted) {
        window.trackingStarted = true;
        if (window.initUserID) window.initUserID();
    }
}

// ============================================================
// Submit issue
// ============================================================
window.submitIssue = function() {
    var content = document.getElementById('issueContent').value.trim();
    if (!content) { alert('Please enter a message'); return; }

    addLog('Submit Issue', { target: 'issueContent', tag: 'comment' });

    var payload = { title: 'User Comment (Anonymous)', body: content, type: 'comment', email: window.currentUserEmail || '' };
    if (navigator.sendBeacon) { navigator.sendBeacon('/api/log-issue', JSON.stringify(payload)); }
    else {
        fetch('/api/log-issue', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), keepalive: true
        }).catch(function(err) { console.error('Request error:', err); });
    }
    document.getElementById('issueContent').value = '';
    document.getElementById('issueModal').style.display = 'none';
    document.getElementById('successModal').style.display = 'flex';
    setTimeout(function() { document.getElementById('successModal').style.display = 'none'; }, 3000);
};

// ============================================================
// Open site inside iframe
// ============================================================
function openSiteInside(targetUrl) {
    iframe.src = targetUrl;
    layer.style.display = 'block';
    panicBar.style.display = 'block';
    setTimeout(function() {
        iframe.focus();
        if (iframe.contentWindow) iframe.contentWindow.focus();
    }, 200);
    if (window.devRecordUrl) window.devRecordUrl(targetUrl);
}

// ============================================================
// Force return to home
// ============================================================
function forceReturnToHome() {
    layer.style.display = 'none';
    panicBar.style.display = 'none';
    gameZone.style.display = "none";
    calcWrapper.style.display = "block";
    iframe.src = '';
    if (typeof sciClear === 'function') sciClear();
    if (issueTrigger) issueTrigger.style.display = 'none';
    window.focus();
}

// ============================================================
// Escape key
// ============================================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (layer.style.display === 'block' || gameZone.style.display === "block") { forceReturnToHome(); }
    }
});

// ============================================================
// Hide login UI
// ============================================================
window.hideLoginUI = function() {
    var googleContainer = document.getElementById('google-signin-container');
    if (googleContainer) googleContainer.style.display = 'none';
    var manualContainer = document.getElementById('manual-login-container');
    if (manualContainer) manualContainer.style.display = 'none';
};

// ============================================================
// Dev Mode
// ============================================================
var DEV_ALLOWED_EMAILS = ['aidenliu2026@gmail.com'];
var devUrlHistory = [];

window.devRecordUrl = function(url) {
    if (!url) return;
    var entry = new Date().toLocaleTimeString() + ' — ' + url;
    devUrlHistory.unshift(entry);
    if (devUrlHistory.length > 20) devUrlHistory.pop();
    var currentEl = document.getElementById('dev-current-url');
    if (currentEl) currentEl.textContent = url;
    var historyEl = document.getElementById('dev-url-history');
    if (historyEl) {
        historyEl.innerHTML = devUrlHistory.map(function(e) { return '<div>' + e + '</div>'; }).join('');
    }
};

window.devClearHistory = function() {
    devUrlHistory = [];
    var c = document.getElementById('dev-current-url');
    if (c) c.textContent = '(none)';
    var h = document.getElementById('dev-url-history');
    if (h) h.innerHTML = '(empty)';
};

window.devTriggerClearIssues = function() {
    var statusEl = document.getElementById('dev-status');
    if (statusEl) statusEl.textContent = 'triggering...';
    fetch('/api/trigger-clear-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: window.currentUserEmail || '' })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (statusEl) {
            statusEl.textContent = data.ok ? ('✓ triggered at ' + new Date().toLocaleTimeString()) : ('✗ ' + (data.error || 'unknown error'));
        }
    })
    .catch(function(err) {
        if (statusEl) statusEl.textContent = '✗ ' + err.message;
    });
};

window.devFlushLog = function() {
    if (window.forceSendLog) window.forceSendLog();
    var statusEl = document.getElementById('dev-status');
    if (statusEl) statusEl.textContent = '✓ flushed at ' + new Date().toLocaleTimeString();
};

window.devClearStorage = function() {
    if (!confirm('Clear localStorage? This will log you out, and a new temporary ID will be generated the next time you visit. 清空 localStorage？这会让你退出登录，下次访问会重新生成临时 ID。')) return;
    try {
        localStorage.removeItem('site_user_id_v1');
        localStorage.removeItem('site_user_email_v1');
        localStorage.removeItem('site_login_ts_v1');
        window.currentUserEmail = '';
        window.currentUserRole = '';
        if (window.devRefreshIdentity) window.devRefreshIdentity();

        var panel = document.getElementById('dev-panel');
        if (panel) panel.style.display = 'none';
        var toggle = document.getElementById('dev-toggle-container');
        if (toggle) toggle.style.display = 'none';

        var statusEl = document.getElementById('dev-status');
        if (statusEl) statusEl.textContent = '✓ localStorage cleared (please refresh)';
    } catch (e) {
        var statusEl = document.getElementById('dev-status');
        if (statusEl) statusEl.textContent = '✗ ' + e.message;
    }
};

window.checkDevMode = function() {
    var email = window.currentUserEmail || '';
    var role = window.currentUserRole || 'user';
    var isDev = (DEV_ALLOWED_EMAILS.indexOf(email) !== -1) || (role === 'developer');
    if (isDev) {
        var panel = document.getElementById('dev-panel');
        if (panel) panel.style.display = 'block';
        var toggleContainer = document.getElementById('dev-toggle-container');
        if (toggleContainer) toggleContainer.style.display = 'block';
        if (window.devRefreshIdentity) window.devRefreshIdentity();
        console.log('Dev mode enabled for', email, 'role:', role);
    }
};

window.toggleDevPanel = function() {
    var panel = document.getElementById('dev-panel');
    if (!panel) return;
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
};

window.devRefreshIdentity = function() {
    var idEl = document.getElementById('dev-identity');
    if (!idEl) return;

    var memEmail = window.currentUserEmail || '';
    var memRole = window.currentUserRole || '';

    var id = window.localStorage.getItem('site_user_id_v1') || '(none)';
    var email = window.localStorage.getItem('site_user_email_v1') || '';
    var ts = window.localStorage.getItem('site_login_ts_v1') || '0';

    if (!email && memEmail) {
        email = memEmail + ' (session)';
    }
    if (!email) {
        email = '(not logged in)';
    }

    var isTemp = id.indexOf('temp-') === 0;
    var isDev = id.indexOf('dev-') === 0;

    var typeText;
    if (memRole === 'developer') {
        typeText = 'DEV (session)';
    } else if (memRole === 'user') {
        typeText = 'USER (session)';
    } else if (isTemp) {
        typeText = 'TEMP';
    } else if (isDev) {
        typeText = 'DEV';
    } else if (id.indexOf('g-') === 0) {
        typeText = 'Google';
    } else {
        typeText = 'unknown';
    }

    var expireText = 'unknown';
    if (ts && ts !== '0') {
        var age = Date.now() - Number(ts);
        var maxAge = 7 * 24 * 60 * 60 * 1000;
        var remain = maxAge - age;
        if (remain <= 0) { expireText = 'EXPIRED'; }
        else {
            var hours = Math.floor(remain / (60 * 60 * 1000));
            var mins = Math.floor((remain % (60 * 60 * 1000)) / (60 * 1000));
            expireText = hours + 'h ' + mins + 'm';
        }
    } else if (memRole) {
        expireText = 'session only';
    }

    idEl.innerHTML = '<div>ID: ' + id + '</div>' +
        '<div>Email: ' + email + '</div>' +
        '<div>Type: ' + typeText + '</div>' +
        '<div>Expires in: ' + expireText + '</div>';
};

window.devLogBufferCount = 0;
window.devLogSentCount = 0;

window.devRefreshLogBuffer = function() {
    var el = document.getElementById('dev-logbuffer');
    if (!el) return;
    el.innerHTML = '<div>Buffered: ' + window.devLogBufferCount + ' entries</div>' +
        '<div>Sent bundles: ' + window.devLogSentCount + '</div>';
};

window.devRefreshRecentLogs = function() {
    var el = document.getElementById('dev-recent-logs');
    if (!el) return;
    var snapshot = window.getLogSnapshot ? window.getLogSnapshot() : [];
    if (snapshot.length === 0) { el.innerHTML = '(empty)'; return; }
    el.innerHTML = snapshot.map(function(line) { return '<div>' + line + '</div>'; }).join('');
};

window.devRefreshPerf = function() {
    var el = document.getElementById('dev-perf');
    if (!el) return;
    var lines = [];
    try {
        var timing = performance.timing;
        var loadTime = timing.loadEventEnd - timing.navigationStart;
        if (loadTime > 0) lines.push('Page load: ' + loadTime + 'ms');
    } catch (e) {}
    try {
        if (performance.memory) {
            var usedMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            var totalMB = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            lines.push('JS heap: ' + usedMB + ' / ' + totalMB + ' MB');
        }
    } catch (e) {}
    lines.push('Viewport: ' + window.innerWidth + 'x' + window.innerHeight);
    el.innerHTML = lines.map(function(l) { return '<div>' + l + '</div>'; }).join('');
};

setInterval(function() {
    if (window.devRefreshIdentity) window.devRefreshIdentity();
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
    if (window.devRefreshRecentLogs) window.devRefreshRecentLogs();
    if (window.devRefreshPerf) window.devRefreshPerf();
}, 2000);

setTimeout(function() {
    if (window.devRefreshIdentity) window.devRefreshIdentity();
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
    if (window.devRefreshRecentLogs) window.devRefreshRecentLogs();
    if (window.devRefreshPerf) window.devRefreshPerf();
}, 500);

// ============================================================
// Page-load Dev Mode check
// ============================================================
(function() {
    try {
        var cachedID = window.localStorage.getItem('site_user_id_v1') || '';
        var cachedEmail = window.localStorage.getItem('site_user_email_v1') || '';

        if (cachedID.indexOf('dev-') === 0 || cachedID.indexOf('m-') === 0) {
            console.log('Cleaning up legacy manual login:', cachedID);
            localStorage.removeItem('site_user_id_v1');
            localStorage.removeItem('site_user_email_v1');
            localStorage.removeItem('site_login_ts_v1');
            cachedID = '';
            cachedEmail = '';
        }

        if (cachedID.indexOf('g-') === 0 && cachedEmail) {
            window.currentUserEmail = cachedEmail;
            window.currentUserRole = 'google';
            if (window.hideLoginUI) window.hideLoginUI();
            if (DEV_ALLOWED_EMAILS.indexOf(cachedEmail) !== -1) {
                var toggleContainer = document.getElementById('dev-toggle-container');
                if (toggleContainer) toggleContainer.style.display = 'block';
                if (window.devRefreshIdentity) window.devRefreshIdentity();
                console.log('Dev mode auto-enabled for Google login:', cachedEmail);
            }
        } else {
            var manualContainer = document.getElementById('manual-login-container');
            if (manualContainer) manualContainer.style.display = 'block';
            var googleContainer = document.getElementById('google-signin-container');
            if (googleContainer) googleContainer.style.display = 'block';

            var renderGoogleBtn = function() {
                if (window.google && window.google.accounts) {
                    window.google.accounts.id.initialize({
                        client_id: '624606480216-tt6p88tcaccloctrq9bm3c2t6ghch48d.apps.googleusercontent.com',
                        callback: window.handleGoogleCredential,
                        prompt: 'select_account'
                    });
                    window.google.accounts.id.renderButton(
                        document.getElementById('google-signin-btn'),
                        { theme: 'outline', size: 'large', text: 'sign_in_with' }
                    );
                } else {
                    setTimeout(renderGoogleBtn, 1000);
                }
            };
            renderGoogleBtn();
            console.log('Not logged in, showing login UI');
        }
    } catch (e) {
        console.warn('Dev mode check failed:', e);
    }
})();

// ============================================================
// Scientific Calculator - Full Implementation
// ============================================================

var sciExpr = '';
var sciLastAns = 0;
var sciAngleMode = 'DEG';
var sciCurrentMode = 'calc';

// ---------- Display ----------
function sciUpdateDisplay() {
    var exprEl = document.getElementById('sci-expr');
    var resultEl = document.getElementById('sci-result');
    var indEl = document.getElementById('sci-indicator');
    if (exprEl) exprEl.textContent = sciExpr || '';
    if (indEl) indEl.textContent = sciAngleMode + (sciCurrentMode !== 'calc' ? ' / ' + sciCurrentMode.toUpperCase() : '');
    if (resultEl) {
        if (!sciExpr) {
            resultEl.textContent = '0';
        } else {
            try {
                var preview = sciEvaluate(sciExpr);
                if (preview !== null && isFinite(preview)) {
                    resultEl.textContent = formatNumber(preview);
                } else {
                    resultEl.textContent = '';
                }
            } catch (e) {
                resultEl.textContent = '';
            }
        }
    }
}

// ---------- Mode switching ----------
function sciSetMode(mode) {
    sciCurrentMode = mode;
    var panels = ['calc', 'stat', 'eq', 'complex', 'base'];
    panels.forEach(function(p) {
        var el = document.getElementById('sci-panel-' + p);
        if (el) el.style.display = (p === mode) ? 'block' : 'none';
    });
    document.querySelectorAll('.sci-modes .sci-mode').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    sciUpdateDisplay();
}

// ---------- Input ----------
function sciInput(ch) {
    sciExpr += ch;
    if (sciExpr.includes('12345')) {
        if (typeof unlockSecretZone === 'function') unlockSecretZone();
    }
    sciUpdateDisplay();
}

function sciFn(fn) {
    var map = {
        'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(',
        'asin': 'asin(', 'acos': 'acos(', 'atan': 'atan(',
        'log': 'log(', 'ln': 'ln(',
        'sqrt': 'sqrt(', 'cbrt': 'cbrt(',
        'pow': '^', 'fact': '!',
        'frac': 'frac(', 'mixed': 'mixed(',
        'pi': 'π', 'e': 'e',
        'abs': 'abs(', 'percent': '%',
        'ans': 'Ans',
        'ncr': 'nCr(', 'npr': 'nPr(',
        'gcd': 'gcd(', 'lcm': 'lcm('
    };
    if (fn === 'ans') {
        sciExpr += formatNumber(sciLastAns);
    } else {
        sciExpr += map[fn] || '';
    }
    sciUpdateDisplay();
}

function sciToggleAngle() {
    sciAngleMode = sciAngleMode === 'DEG' ? 'RAD' : 'DEG';
    var btn = document.getElementById('sci-angle-btn');
    if (btn) btn.textContent = sciAngleMode;
    sciUpdateDisplay();
}

function sciClear() {
    sciExpr = '';
    sciUpdateDisplay();
}

function sciBackspace() {
    sciExpr = sciExpr.slice(0, -1);
    sciUpdateDisplay();
}

function sciEquals() {
    if (!sciExpr) return;
    try {
        var result = sciEvaluate(sciExpr);
        if (result === null || !isFinite(result)) {
            document.getElementById('sci-result').textContent = 'Error';
            return;
        }
        sciLastAns = result;
        document.getElementById('sci-expr').textContent = sciExpr + ' =';
        document.getElementById('sci-result').textContent = formatNumber(result);
        sciExpr = '';
    } catch (e) {
        document.getElementById('sci-result').textContent = 'Error';
    }
}

// ---------- Evaluate ----------
function sciEvaluate(expr) {
    var s = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, '(' + Math.PI + ')')
        .replace(/\be\b/g, '(' + Math.E + ')')
        .replace(/Ans/g, '(' + sciLastAns + ')');

    s = s.replace(/(\d+(?:\.\d+)?)!/g, function(_, n) {
        return 'factorial(' + n + ')';
    });

    s = s.replace(/(\d+(?:\.\d+)?)%/g, function(_, n) {
        return '(' + n + '/100)';
    });

    s = s.replace(/\^/g, '**');

    var toRad = sciAngleMode === 'DEG' ? '(Math.PI/180)' : '1';
    var fromRad = sciAngleMode === 'DEG' ? '(180/Math.PI)' : '1';
    s = s.replace(/\bsin\(/g, 'Math.sin(' + toRad + '*');
    s = s.replace(/\bcos\(/g, 'Math.cos(' + toRad + '*');
    s = s.replace(/\btan\(/g, 'Math.tan(' + toRad + '*');
    s = s.replace(/\basin\(([^)]*)\)/g, '(' + fromRad + '*Math.asin($1))');
    s = s.replace(/\bacos\(([^)]*)\)/g, '(' + fromRad + '*Math.acos($1))');
    s = s.replace(/\batan\(([^)]*)\)/g, '(' + fromRad + '*Math.atan($1))');

    s = s.replace(/\blog\(/g, 'Math.log10(');
    s = s.replace(/\bln\(/g, 'Math.log(');

    s = s.replace(/\bsqrt\(/g, 'Math.sqrt(');
    s = s.replace(/\bcbrt\(/g, 'Math.cbrt(');
    s = s.replace(/\babs\(/g, 'Math.abs(');

    s = s.replace(/\bfrac\(([^,]+),([^)]+)\)/g, '($1)/($2)');
    s = s.replace(/\bmixed\(([^,]+),([^,]+),([^)]+)\)/g, '($1)+($2)/($3)');

    var factorial = function(n) {
        n = Number(n);
        if (n < 0 || n !== Math.floor(n)) return NaN;
        if (n > 170) return Infinity;
        var r = 1;
        for (var i = 2; i <= n; i++) r *= i;
        return r;
    };
    var nCr = function(n, r) {
        n = Number(n); r = Number(r);
        if (n < 0 || r < 0 || r > n) return NaN;
        return factorial(n) / (factorial(r) * factorial(n - r));
    };
    var nPr = function(n, r) {
        n = Number(n); r = Number(r);
        if (n < 0 || r < 0 || r > n) return NaN;
        return factorial(n) / factorial(n - r);
    };
    var gcd = function(a, b) {
        a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
        while (b) { var t = b; b = a % b; a = t; }
        return a;
    };
    var lcm = function(a, b) {
        a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
        return a * b / gcd(a, b);
    };

    var fn = new Function('factorial', 'nCr', 'nPr', 'gcd', 'lcm', 'return (' + s + ');');
    return fn(factorial, nCr, nPr, gcd, lcm);
}

// ---------- Format ----------
function formatNumber(n) {
    if (!isFinite(n)) return 'Error';
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    var abs = Math.abs(n);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) {
        return n.toExponential(8).replace(/\.?0+e/, 'e');
    }
    return parseFloat(n.toPrecision(10)).toString();
}

// ============================================================
// Stat mode
// ============================================================
function statCalc(type) {
    var input = document.getElementById('stat-data').value;
    var nums = input.split(',').map(function(s) {
        var n = parseFloat(s.trim());
        return isNaN(n) ? null : n;
    }).filter(function(n) { return n !== null; });

    if (nums.length === 0) {
        document.getElementById('stat-result').textContent = 'Result: — (no data)';
        return;
    }

    var n = nums.length;
    var sum = nums.reduce(function(a, b) { return a + b; }, 0);
    var mean = sum / n;
    var sorted = nums.slice().sort(function(a, b) { return a - b; });
    var median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
    var sumsq = nums.reduce(function(a, b) { return a + b * b; }, 0);
    var variance = sumsq / n - mean * mean;
    var sd = Math.sqrt(variance);
    var ssd = n > 1 ? Math.sqrt((sumsq - n * mean * mean) / (n - 1)) : 0;
    var min = sorted[0];
    var max = sorted[n - 1];

    var freq = {};
    nums.forEach(function(x) { freq[x] = (freq[x] || 0) + 1; });
    var maxFreq = 0;
    var mode = null;
    for (var k in freq) {
        if (freq[k] > maxFreq) { maxFreq = freq[k]; mode = parseFloat(k); }
    }
    if (maxFreq === 1) mode = null;

    var result = '';
    switch (type) {
        case 'mean': result = 'Mean = ' + formatNumber(mean); break;
        case 'median': result = 'Median = ' + formatNumber(median); break;
        case 'mode': result = 'Mode = ' + (mode !== null ? formatNumber(mode) : 'none'); break;
        case 'sum': result = 'Sum = ' + formatNumber(sum); break;
        case 'sumsq': result = 'Σx² = ' + formatNumber(sumsq); break;
        case 'count': result = 'n = ' + n; break;
        case 'sd': result = 'σ = ' + formatNumber(sd); break;
        case 'var': result = 'σ² = ' + formatNumber(variance); break;
        case 'ssd': result = 's = ' + formatNumber(ssd); break;
        case 'min': result = 'Min = ' + formatNumber(min); break;
        case 'max': result = 'Max = ' + formatNumber(max); break;
        case 'range': result = 'Range = ' + formatNumber(max - min); break;
        default: result = 'Unknown';
    }
    document.getElementById('stat-result').textContent = result;
}

// ============================================================
// Eq mode
// ============================================================
function eqSetType(type) {
    ['linear', 'quad', 'system'].forEach(function(t) {
        var el = document.getElementById('eq-' + t);
        if (el) el.style.display = (t === type) ? 'flex' : 'none';
    });
}

function eqSolveLinear() {
    var a = parseFloat(document.getElementById('eq-a').value);
    var b = parseFloat(document.getElementById('eq-b').value);
    if (isNaN(a) || isNaN(b)) {
        document.getElementById('eq-result').textContent = 'Result: — (invalid input)';
        return;
    }
    if (a === 0) {
        document.getElementById('eq-result').textContent = b === 0 ? 'Result: x ∈ ℝ (infinite solutions)' : 'Result: no solution';
        return;
    }
    var x = -b / a;
    document.getElementById('eq-result').textContent = 'x = ' + formatNumber(x);
}

function eqSolveQuad() {
    var a = parseFloat(document.getElementById('eq-qa').value);
    var b = parseFloat(document.getElementById('eq-qb').value);
    var c = parseFloat(document.getElementById('eq-qc').value);
    if (isNaN(a) || isNaN(b) || isNaN(c)) {
        document.getElementById('eq-result').textContent = 'Result: — (invalid input)';
        return;
    }
    if (a === 0) {
        document.getElementById('eq-result').textContent = 'Result: a cannot be 0 (not quadratic)';
        return;
    }
    var disc = b * b - 4 * a * c;
    var result = '';
    if (disc > 0) {
        var x1 = (-b + Math.sqrt(disc)) / (2 * a);
        var x2 = (-b - Math.sqrt(disc)) / (2 * a);
        result = 'x₁ = ' + formatNumber(x1) + ',  x₂ = ' + formatNumber(x2);
    } else if (disc === 0) {
        var x = -b / (2 * a);
        result = 'x = ' + formatNumber(x) + ' (double root)';
    } else {
        var re = -b / (2 * a);
        var im = Math.sqrt(-disc) / (2 * a);
        result = 'x₁ = ' + formatNumber(re) + ' + ' + formatNumber(Math.abs(im)) + 'i,  x₂ = ' + formatNumber(re) + ' - ' + formatNumber(Math.abs(im)) + 'i';
    }
    document.getElementById('eq-result').textContent = result;
}

function eqSolveSystem() {
    var a1 = parseFloat(document.getElementById('eq-a1').value);
    var b1 = parseFloat(document.getElementById('eq-b1').value);
    var c1 = parseFloat(document.getElementById('eq-c1').value);
    var a2 = parseFloat(document.getElementById('eq-a2').value);
    var b2 = parseFloat(document.getElementById('eq-b2').value);
    var c2 = parseFloat(document.getElementById('eq-c2').value);
    if ([a1, b1, c1, a2, b2, c2].some(isNaN)) {
        document.getElementById('eq-result').textContent = 'Result: — (invalid input)';
        return;
    }
    var det = a1 * b2 - a2 * b1;
    if (det === 0) {
        document.getElementById('eq-result').textContent = 'Result: no unique solution (det = 0)';
        return;
    }
    var x = (c1 * b2 - c2 * b1) / det;
    var y = (a1 * c2 - a2 * c1) / det;
    document.getElementById('eq-result').textContent = 'x = ' + formatNumber(x) + ',  y = ' + formatNumber(y);
}

// ============================================================
// Cplx mode
// ============================================================
function cplxCalc(op) {
    var a = parseFloat(document.getElementById('cplx-a').value) || 0;
    var b = parseFloat(document.getElementById('cplx-b').value) || 0;
    var c = parseFloat(document.getElementById('cplx-c').value) || 0;
    var d = parseFloat(document.getElementById('cplx-d').value) || 0;

    var result = '';
    if (op === 'add') {
        result = formatCplx(a + c, b + d);
    } else if (op === 'sub') {
        result = formatCplx(a - c, b - d);
    } else if (op === 'mul') {
        result = formatCplx(a * c - b * d, a * d + b * c);
    } else if (op === 'div') {
        var den = c * c + d * d;
        if (den === 0) { result = 'Error: division by zero'; }
        else { result = formatCplx((a * c + b * d) / den, (b * c - a * d) / den); }
    } else if (op === 'abs') {
        result = formatNumber(Math.sqrt(a * a + b * b));
    } else if (op === 'conj') {
        result = formatCplx(a, -b);
    }
    document.getElementById('cplx-result').textContent = 'Result: ' + result;
}

function formatCplx(re, im) {
    if (im === 0) return formatNumber(re);
    if (re === 0) return formatNumber(im) + 'i';
    var imStr = formatNumber(Math.abs(im));
    return formatNumber(re) + (im >= 0 ? ' + ' : ' - ') + imStr + 'i';
}

// ============================================================
// Base mode
// ============================================================
function baseConvert() {
    var input = document.getElementById('base-input').value.trim();
    var from = parseInt(document.getElementById('base-from').value);
    if (!input) {
        document.getElementById('base-result').textContent = 'Result: — (no input)';
        return;
    }
    try {
        var decimal = parseInt(input, from);
        if (isNaN(decimal)) throw new Error('Invalid input');
        var result = 'BIN: ' + decimal.toString(2) + ' | OCT: ' + decimal.toString(8) + ' | DEC: ' + decimal + ' | HEX: ' + decimal.toString(16).toUpperCase();
        document.getElementById('base-result').textContent = result;
    } catch (e) {
        document.getElementById('base-result').textContent = 'Result: Error — ' + e.message;
    }
}

function baseQuick(type) {
    var input = document.getElementById('base-input').value.trim();
    if (!input) {
        document.getElementById('base-result').textContent = 'Result: — (no input)';
        return;
    }
    try {
        var decimal;
        if (type === '2' || type === '8' || type === '10' || type === '16') {
            var from = parseInt(document.getElementById('base-from').value);
            decimal = parseInt(input, from);
            if (isNaN(decimal)) throw new Error('Invalid input');
            document.getElementById('base-result').textContent = 'Result: ' + decimal.toString(parseInt(type)).toUpperCase();
        } else {
            var parts = input.split(',').map(function(s) { return parseInt(s.trim(), 10); });
            if (parts.length !== 2 || parts.some(isNaN)) throw new Error('For bit ops, use "a,b"');
            var a = parts[0], b = parts[1], r;
            if (type === 'and') r = a & b;
            else if (type === 'or') r = a | b;
            else if (type === 'xor') r = a ^ b;
            else if (type === 'not') r = ~a;
            document.getElementById('base-result').textContent = 'Result: ' + r + ' (0x' + (r >>> 0).toString(16).toUpperCase() + ')';
        }
    } catch (e) {
        document.getElementById('base-result').textContent = 'Result: Error — ' + e.message;
    }
}

// ============================================================
// Init
// ============================================================
sciUpdateDisplay();

document.addEventListener('keydown', function(e) {
    if (!document.getElementById('calculator-wrapper')) return;
    if (document.getElementById('calculator-wrapper').offsetParent === null) return;
    if (sciCurrentMode !== 'calc') return;
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (/^[0-9.]$/.test(e.key)) { sciInput(e.key); e.preventDefault(); }
    else if (e.key === '+') { sciInput('+'); e.preventDefault(); }
    else if (e.key === '-') { sciInput('-'); e.preventDefault(); }
    else if (e.key === '*') { sciInput('*'); e.preventDefault(); }
    else if (e.key === '/') { sciInput('/'); e.preventDefault(); }
    else if (e.key === '(') { sciInput('('); e.preventDefault(); }
    else if (e.key === ')') { sciInput(')'); e.preventDefault(); }
    else if (e.key === '^') { sciInput('^'); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === '=') { sciEquals(); e.preventDefault(); }
    else if (e.key === 'Backspace') { sciBackspace(); e.preventDefault(); }
    else if (e.key === 'Escape') { sciClear(); e.preventDefault(); }
});
