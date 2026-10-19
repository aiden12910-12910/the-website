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
// Windows 11 Calculator
// ============================================================
var winExpr = '';
var winLastAns = 0;
var winAngleMode = 'DEG';
var winCurrentMode = 'standard';
var winProgBase = 10;
var winProgValue = '0';
var winProgPending = null;

// ---------- 通用 ----------
function winUpdateDisplay() {
    var exprEl = document.getElementById('win-expr');
    var resultEl = document.getElementById('win-result');
    var indEl = document.getElementById('win-indicator');
    if (exprEl) exprEl.textContent = winExpr || '';
    if (indEl) indEl.textContent = winAngleMode;
    if (resultEl) {
        if (!winExpr) resultEl.textContent = '0';
        else {
            try {
                var preview = winEvaluate(winExpr);
                if (preview !== null && isFinite(preview)) resultEl.textContent = winFormat(preview);
                else resultEl.textContent = '';
            } catch (e) { resultEl.textContent = ''; }
        }
    }
}

function winSetMode(mode) {
    winCurrentMode = mode;
    var panels = ['standard', 'scientific', 'graphing', 'programmer', 'date', 'currency', 'volume', 'length'];
    panels.forEach(function(p) {
        var el = document.getElementById('win-panel-' + p);
        if (el) el.style.display = (p === mode) ? 'block' : 'none';
    });
    document.querySelectorAll('.win-mode').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (mode === 'graphing') setTimeout(winDrawGraph, 50);
    if (mode === 'programmer') winProgUpdate();
    winUpdateDisplay();
}

// ---------- 标准/科学 输入 ----------
function winInput(ch) {
    winExpr += ch;
    if (winExpr.includes('12345')) {
        if (typeof unlockSecretZone === 'function') unlockSecretZone();
    }
    winUpdateDisplay();
}
function winFn(fn) {
    var map = {
        'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(',
        'log': 'log(', 'ln': 'ln(',
        'sqrt': 'sqrt(', 'pow': '^', 'fact': '!',
        'pi': 'π', 'e': 'e'
    };
    winExpr += map[fn] || '';
    winUpdateDisplay();
}
function winToggleAngle() {
    winAngleMode = winAngleMode === 'DEG' ? 'RAD' : 'DEG';
    var btn = document.getElementById('win-angle-btn');
    if (btn) btn.textContent = winAngleMode;
    winUpdateDisplay();
}
function winClear() { winExpr = ''; winUpdateDisplay(); }
function winClearAll() { winExpr = ''; winLastAns = 0; winUpdateDisplay(); }
function winBackspace() { winExpr = winExpr.slice(0, -1); winUpdateDisplay(); }
function winEquals() {
    if (!winExpr) return;
    try {
        var r = winEvaluate(winExpr);
        if (r === null || !isFinite(r)) { document.getElementById('win-result').textContent = 'Error'; return; }
        winLastAns = r;
        document.getElementById('win-expr').textContent = winExpr + ' =';
        document.getElementById('win-result').textContent = winFormat(r);
        winExpr = '';
    } catch (e) { document.getElementById('win-result').textContent = 'Error'; }
}

// ---------- 求值 ----------
function winEvaluate(expr) {
    var s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
        .replace(/π/g, '(' + Math.PI + ')').replace(/\be\b/g, '(' + Math.E + ')');
    s = s.replace(/(\d+(?:\.\d+)?)!/g, function(_, n) { return 'factorial(' + n + ')'; });
    s = s.replace(/\^/g, '**');
    var toRad = winAngleMode === 'DEG' ? '(Math.PI/180)' : '1';
    s = s.replace(/\bsin\(/g, 'Math.sin(' + toRad + '*');
    s = s.replace(/\bcos\(/g, 'Math.cos(' + toRad + '*');
    s = s.replace(/\btan\(/g, 'Math.tan(' + toRad + '*');
    s = s.replace(/\blog\(/g, 'Math.log10(');
    s = s.replace(/\bln\(/g, 'Math.log(');
    s = s.replace(/\bsqrt\(/g, 'Math.sqrt(');
    var factorial = function(n) { n = Number(n); if (n < 0 || n !== Math.floor(n)) return NaN; if (n > 170) return Infinity; var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; };
    var fn = new Function('factorial', 'return (' + s + ');');
    return fn(factorial);
}
function winFormat(n) {
    if (!isFinite(n)) return 'Error';
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    var abs = Math.abs(n);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(8).replace(/\.?0+e/, 'e');
    return parseFloat(n.toPrecision(10)).toString();
}

// ---------- 绘图 ----------
function winDrawGraph() {
    var canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var expr = document.getElementById('graph-fn').value || 'x^2';

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--screen-bg') || '#fff';
    ctx.fillRect(0, 0, w, h);

    // 坐标轴
    var cx = w / 2, cy = h / 2;
    var scale = 40; // 每单位 40px
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border') || '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();

    // 网格
    ctx.strokeStyle = 'rgba(128,128,128,0.15)';
    for (var x = cx; x < w; x += scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var x = cx; x > 0; x -= scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = cy; y < h; y += scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (var y = cy; y > 0; y -= scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // 函数
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--link') || '#0066cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var started = false;
    for (var px = 0; px < w; px++) {
        var xVal = (px - cx) / scale;
        try {
            var exprJs = expr.replace(/\^/g, '**');
            var yVal = new Function('x', 'return ' + exprJs + ';')(xVal);
            if (!isFinite(yVal)) { started = false; continue; }
            var py = cy - yVal * scale;
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
        } catch (e) { started = false; }
    }
    ctx.stroke();
}

// ---------- 程序员 ----------
function winProgUpdate() {
    var base = parseInt(document.getElementById('prog-base').value);
    var dec = parseInt(winProgValue, winProgBase) || 0;
    var display = document.getElementById('prog-display');
    if (display) display.textContent = dec.toString(base).toUpperCase();
    winProgBase = base;
}
function winProgInput(ch) {
    if (winProgValue === '0') winProgValue = '';
    winProgValue += ch;
    winProgUpdate();
}
function winProgBackspace() {
    winProgValue = winProgValue.slice(0, -1) || '0';
    winProgUpdate();
}
function winProgClear() {
    winProgValue = '0';
    winProgPending = null;
    winProgUpdate();
}
function winProgOp(op) {
    winProgPending = { op: op, value: parseInt(winProgValue, winProgBase) || 0 };
    winProgValue = '0';
    winProgUpdate();
}
function winProgEquals() {
    if (!winProgPending) return;
    var a = winProgPending.value;
    var b = parseInt(winProgValue, winProgBase) || 0;
    var r;
    if (winProgPending.op === '+') r = a + b;
    else if (winProgPending.op === '-') r = a - b;
    else if (winProgPending.op === '*') r = a * b;
    else if (winProgPending.op === '/') r = b === 0 ? 0 : Math.floor(a / b);
    winProgValue = (r || 0).toString();
    winProgPending = null;
    winProgUpdate();
}
function winProgBit(op) {
    var a = parseInt(winProgValue, winProgBase) || 0;
    if (op === 'not') winProgValue = (~a).toString();
    else if (op === 'shl') winProgValue = (a << 1).toString();
    else if (op === 'shr') winProgValue = (a >> 1).toString();
    else {
        winProgPending = { op: op, value: a };
        winProgValue = '0';
    }
    winProgUpdate();
}

// ---------- 日期 ----------
function winDateDiff() {
    var d1 = document.getElementById('date1').value;
    var d2 = document.getElementById('date2').value;
    if (!d1 || !d2) { document.getElementById('date-result').textContent = '—'; return; }
    var t1 = new Date(d1).getTime();
    var t2 = new Date(d2).getTime();
    var diff = Math.abs(t2 - t1);
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById('date-result').textContent = days + ' days / ' + days + ' 天';
}
function winDateAdd() {
    var base = document.getElementById('date-base').value;
    var days = parseInt(document.getElementById('date-days').value) || 0;
    if (!base) { document.getElementById('date-add-result').textContent = '—'; return; }
    var d = new Date(base);
    d.setDate(d.getDate() + days);
    document.getElementById('date-add-result').textContent = d.toISOString().slice(0, 10);
}

// ---------- 货币 ----------
var winRates = { USD: 1, CNY: 7.24, EUR: 0.92, JPY: 149.5, GBP: 0.79 };
function winCurrency() {
    var amt = parseFloat(document.getElementById('curr-amount').value) || 0;
    var from = document.getElementById('curr-from').value;
    var to = document.getElementById('curr-to').value;
    var usd = amt / winRates[from];
    var result = usd * winRates[to];
    document.getElementById('curr-result').textContent = winFormat(result) + ' ' + to;
}

// ---------- 体积 ----------
var winVolFactors = { L: 1, mL: 0.001, m3: 1000, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735 };
function winVolume() {
    var amt = parseFloat(document.getElementById('vol-amount').value) || 0;
    var from = document.getElementById('vol-from').value;
    var to = document.getElementById('vol-to').value;
    var liters = amt * winVolFactors[from];
    var result = liters / winVolFactors[to];
    document.getElementById('vol-result').textContent = winFormat(result) + ' ' + to;
}

// ---------- 长度 ----------
var winLenFactors = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 };
function winLength() {
    var amt = parseFloat(document.getElementById('len-amount').value) || 0;
    var from = document.getElementById('len-from').value;
    var to = document.getElementById('len-to').value;
    var meters = amt * winLenFactors[from];
    var result = meters / winLenFactors[to];
    document.getElementById('len-result').textContent = winFormat(result) + ' ' + to;
}

// ---------- 初始化 ----------
winUpdateDisplay();
