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
var iframeLoadTimeout = null;
var iframeCurrentUrl = '';

function openSiteInside(targetUrl) {
    if (typeof winReset === 'function') winReset();

    iframeCurrentUrl = targetUrl;

    // 隐藏错误层
    var errorOverlay = document.getElementById('iframe-error-overlay');
    if (errorOverlay) errorOverlay.style.display = 'none';

    // 清除之前的超时
    if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);

    // 设置 30 秒超时：如果 iframe 没触发 onload，就认为加载失败
    iframeLoadTimeout = setTimeout(function() {
        // 检查 iframe 是否真的加载了
        // 跨域时无法读 contentDocument，只能靠 onload 是否触发
        if (!window.__iframeLoaded) {
            showIframeError(targetUrl);
        }
    }, 30000);

    window.__iframeLoaded = false;

    // 监听 iframe 加载成功
    iframe.onload = function() {
        // 跨域 iframe 的 onload 会在页面加载时触发（即使内容是错误页）
        // 但如果是 X-Frame-Options 拒绝，onload 可能不触发或立即触发
        window.__iframeLoaded = true;
        if (iframeLoadTimeout) {
            clearTimeout(iframeLoadTimeout);
            iframeLoadTimeout = null;
        }
        console.log('iframe loaded:', targetUrl);
    };

    iframe.onerror = function() {
        showIframeError(targetUrl);
    };

    iframe.src = targetUrl;
    layer.style.display = 'block';
    panicBar.style.display = 'block';
    setTimeout(function() {
        iframe.focus();
        if (iframe.contentWindow) iframe.contentWindow.focus();
    }, 200);
    if (window.devRecordUrl) window.devRecordUrl(targetUrl);
}

function showIframeError(url) {
    var errorOverlay = document.getElementById('iframe-error-overlay');
    if (!errorOverlay) return;
    var urlEl = document.getElementById('iframe-error-url');
    if (urlEl) urlEl.textContent = url || '';
    var openEl = document.getElementById('iframe-error-open');
    if (openEl && url) openEl.href = url;
    errorOverlay.style.display = 'flex';
    console.warn('iframe load failed or timeout:', url);
}

function retryIframe() {
    if (iframeCurrentUrl) {
        openSiteInside(iframeCurrentUrl);
    }
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
    if (iframeLoadTimeout) {
        clearTimeout(iframeLoadTimeout);
        iframeLoadTimeout = null;
    }
    var errorOverlay = document.getElementById('iframe-error-overlay');
    if (errorOverlay) errorOverlay.style.display = 'none';

    if (typeof winReset === 'function') {
        winReset();
    } else if (typeof winClearAll === 'function') {
        winClearAll();
    } else if (typeof winClear === 'function') {
        winClear();
    }
    var exprEl = document.getElementById('win-expr');
    if (exprEl) exprEl.textContent = '';
    var resultEl = document.getElementById('win-result');
    if (resultEl) resultEl.textContent = '0';

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
// Windows 11 Calculator - Full Implementation
// ============================================================

var winTokens = [];
var winLastAns = 0;
var winAngleMode = 'DEG';
var winCurrentMode = 'scientific';
var winJustEvaluated = false;
var winPendingParen = 0;
var winLastResult = null;

var winProgBase = 10;
var winProgDisplayValue = '0';
var winProgPending = null;

// 全局解锁序列：任何输入都会追加到这个字符串，包含 12345 即解锁
var winInputSequence = '';

// ---------- 显示 ----------
function winUpdateDisplay() {
    var exprEl = document.getElementById('win-expr');
    var resultEl = document.getElementById('win-result');
    var indEl = document.getElementById('win-indicator');

    if (indEl) indEl.textContent = winAngleMode;

    if (exprEl) {
        exprEl.textContent = winTokensToDisplay();
    }

    if (resultEl) {
        if (winJustEvaluated && winLastResult !== null) {
            resultEl.textContent = formatNumber(winLastResult);
        } else if (winTokens.length === 0) {
            resultEl.textContent = '0';
        } else {
            try {
                var preview = winEvaluateTokens(winTokens);
                if (preview !== null && isFinite(preview)) {
                    resultEl.textContent = formatNumber(preview);
                } else {
                    resultEl.textContent = winTokensToDisplay() || '0';
                }
            } catch (e) {
                resultEl.textContent = winTokensToDisplay() || '0';
            }
        }
    }
}

function winTokensToDisplay() {
    var s = '';
    for (var i = 0; i < winTokens.length; i++) {
        var t = winTokens[i];
        if (t.type === 'num') s += t.value;
        else if (t.type === 'op') {
            if (t.value === '*') s += ' × ';
            else if (t.value === '/') s += ' ÷ ';
            else if (t.value === '-') s += ' − ';
            else if (t.value === '+') s += ' + ';
            else if (t.value === '^') s += ' ^ ';
            else s += t.value;
        } else if (t.type === 'paren') s += t.value;
        else if (t.type === 'const') {
            if (t.value === 'π') s += 'π';
            else if (t.value === 'e') s += 'e';
            else if (t.value === 'Ans') s += 'Ans';
        } else if (t.type === 'func') s += t.value + '(';
    }
    return s;
}

// ---------- 解锁检查（每个输入函数都调用） ----------
function winCheckUnlock() {
    if (winInputSequence.indexOf('12345') !== -1) {
        if (typeof unlockSecretZone === 'function') {
            console.log('UNLOCK TRIGGERED by 12345');
            unlockSecretZone();
        }
    }
}

// ---------- 模式切换 ----------
function winSetMode(mode) {
    winCurrentMode = mode;
    var panels = ['standard', 'scientific', 'programmer', 'date', 'currency', 'volume', 'length'];
    panels.forEach(function(p) {
        var el = document.getElementById('win-panel-' + p);
        if (el) el.style.display = (p === mode) ? 'block' : 'none';
    });
    document.querySelectorAll('.win-mode').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (mode === 'programmer') {
        winProgSetBase(winProgBase);
    }
    winUpdateDisplay();
}

// ---------- 输入 ----------
function winDigit(d) {
    // 解锁序列
    winInputSequence = (winInputSequence + String(d)).slice(-20);
    winCheckUnlock();

    if (winJustEvaluated) {
        winTokens = [];
        winJustEvaluated = false;
    }

    if (d === 'π' || d === 'e' || d === 'Ans') {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'const', value: d });
        winUpdateDisplay();
        return;
    }

    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num' && !last.isParen) {
        last.value += d;
    } else {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'num', value: d });
    }
    winUpdateDisplay();
}

function winDecimal() {
    winInputSequence = (winInputSequence + '.').slice(-20);
    winCheckUnlock();

    if (winJustEvaluated) {
        winTokens = [];
        winJustEvaluated = false;
    }
    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num' && !last.isParen) {
        if (last.value.indexOf('.') === -1) last.value += '.';
    } else {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'num', value: '0.' });
    }
    winUpdateDisplay();
}

function winOperator(op) {
    if (winJustEvaluated) {
        winTokens = [{ type: 'num', value: formatNumber(winLastResult) }];
        winJustEvaluated = false;
    }
    var last = winTokens[winTokens.length - 1];
    if (!last) {
        if (op === '-') winTokens.push({ type: 'num', value: '-' });
        return;
    }
    if (last.type === 'op') {
        last.value = op;
    } else {
        winTokens.push({ type: 'op', value: op });
    }
    winUpdateDisplay();
}

function winParen(p) {
    if (winJustEvaluated) {
        winTokens = [];
        winJustEvaluated = false;
    }
    if (p === '(') {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'paren', value: '(' });
        winPendingParen++;
    } else {
        if (winPendingParen > 0) {
            winTokens.push({ type: 'paren', value: ')' });
            winPendingParen--;
        }
    }
    winUpdateDisplay();
}

function winUnary(fn) {
    if (winJustEvaluated) {
        winTokens = [];
        winJustEvaluated = false;
    }
    if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
    winTokens.push({ type: 'func', value: fn });
    winPendingParen++;
    winUpdateDisplay();
}

function winPercent() {
    if (winTokens.length === 0) return;
    var last = winTokens[winTokens.length - 1];
    if (last.type === 'num') {
        last.value = String(parseFloat(last.value) / 100);
        winUpdateDisplay();
    }
}

function winNegate() {
    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num') {
        if (last.value.charAt(0) === '-') last.value = last.value.slice(1);
        else last.value = '-' + last.value;
        winUpdateDisplay();
    }
}

function needsImplicitMultiply() {
    var last = winTokens[winTokens.length - 1];
    if (!last) return false;
    if (last.type === 'num' && !last.isParen) return true;
    if (last.type === 'const') return true;
    if (last.type === 'paren' && last.value === ')') return true;
    return false;
}

// ---------- 清空 ----------
function winClearEntry() {
    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num') winTokens.pop();
    winJustEvaluated = false;
    winUpdateDisplay();
}

function winClearAll() {
    winTokens = [];
    winLastAns = 0;
    winJustEvaluated = false;
    winPendingParen = 0;
    winLastResult = null;
    winInputSequence = '';
    winUpdateDisplay();
}

function winBackspace() {
    if (winJustEvaluated) {
        winJustEvaluated = false;
        winUpdateDisplay();
        return;
    }
    var last = winTokens[winTokens.length - 1];
    if (!last) return;
    if (last.type === 'num') {
        last.value = last.value.slice(0, -1);
        if (last.value === '' || last.value === '-') winTokens.pop();
    } else if (last.type === 'paren') {
        if (last.value === ')') winPendingParen++;
        else winPendingParen--;
        winTokens.pop();
    } else {
        winTokens.pop();
    }
    winUpdateDisplay();
}

// ---------- 求值 ----------
function winEquals() {
    if (winTokens.length === 0) return;
    while (winPendingParen > 0) {
        winTokens.push({ type: 'paren', value: ')' });
        winPendingParen--;
    }
    try {
        var r = winEvaluateTokens(winTokens);
        if (r === null || !isFinite(r)) {
            document.getElementById('win-result').textContent = 'Error';
            return;
        }
        winLastAns = r;
        winLastResult = r;
        winJustEvaluated = true;
        document.getElementById('win-expr').textContent = winTokensToDisplay() + ' =';
        document.getElementById('win-result').textContent = formatNumber(r);
    } catch (e) {
        document.getElementById('win-result').textContent = 'Error';
    }
}

function winEvaluateTokens(tokens) {
    var s = '';
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (t.type === 'num') s += t.value;
        else if (t.type === 'op') {
            if (t.value === '^') s += '**';
            else s += t.value;
        } else if (t.type === 'paren') s += t.value;
        else if (t.type === 'const') {
            if (t.value === 'π') s += '(' + Math.PI + ')';
            else if (t.value === 'e') s += '(' + Math.E + ')';
            else if (t.value === 'Ans') s += '(' + winLastAns + ')';
        } else if (t.type === 'func') {
            var fnMap = {
                'sin': winAngleMode === 'DEG' ? 'Math.sin((Math.PI/180)*' : 'Math.sin(',
                'cos': winAngleMode === 'DEG' ? 'Math.cos((Math.PI/180)*' : 'Math.cos(',
                'tan': winAngleMode === 'DEG' ? 'Math.tan((Math.PI/180)*' : 'Math.tan(',
                'log': 'Math.log10(',
                'ln': 'Math.log(',
                'sqrt': 'Math.sqrt('
            };
            if (t.value === 'fact') s += 'factorial(';
            else s += fnMap[t.value] || 'Math.' + t.value + '(';
        }
    }
    var factorial = function(n) {
        n = Number(n);
        if (n < 0 || n !== Math.floor(n)) return NaN;
        if (n > 170) return Infinity;
        var r = 1;
        for (var i = 2; i <= n; i++) r *= i;
        return r;
    };
    var fn = new Function('factorial', 'return (' + s + ');');
    return fn(factorial);
}

function winToggleAngle() {
    winAngleMode = winAngleMode === 'DEG' ? 'RAD' : 'DEG';
    var btn = document.getElementById('win-angle-btn');
    if (btn) btn.textContent = winAngleMode;
    winUpdateDisplay();
}

function formatNumber(n) {
    if (!isFinite(n)) return 'Error';
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    var abs = Math.abs(n);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(8).replace(/\.?0+e/, 'e');
    return parseFloat(n.toPrecision(10)).toString();
}

// ---------- 完全重置 ----------
function winReset() {
    winTokens = [];
    winLastAns = 0;
    winLastResult = null;
    winJustEvaluated = false;
    winPendingParen = 0;
    winInputSequence = '';
    winAngleMode = 'DEG';
    winProgDisplayValue = '0';
    winProgPending = null;

    var exprEl = document.getElementById('win-expr');
    if (exprEl) exprEl.textContent = '';
    var resultEl = document.getElementById('win-result');
    if (resultEl) resultEl.textContent = '0';
    var indEl = document.getElementById('win-indicator');
    if (indEl) indEl.textContent = 'DEG';
    var angleBtn = document.getElementById('win-angle-btn');
    if (angleBtn) angleBtn.textContent = 'DEG';
    var progDisplay = document.getElementById('prog-display');
    if (progDisplay) progDisplay.textContent = '0';

    ['date-result', 'date-add-result', 'curr-result', 'vol-result', 'len-result'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

// ---------- 程序员模式 ----------
function winProgSetBase(base) {
    var oldBase = winProgBase;
    winProgBase = parseInt(base);
    var dec = parseInt(winProgDisplayValue, oldBase) || 0;
    winProgDisplayValue = dec.toString(winProgBase).toUpperCase();
    var display = document.getElementById('prog-display');
    if (display) display.textContent = winProgDisplayValue;

    var grid = document.getElementById('prog-grid');
    if (grid) {
        grid.querySelectorAll('.prog-hex').forEach(function(btn) {
            btn.style.opacity = (winProgBase === 16) ? '1' : '0.3';
            btn.style.pointerEvents = (winProgBase === 16) ? 'auto' : 'none';
        });
    }
}

function winProgInput(ch) {
    var valid = '0123456789ABCDEF'.slice(0, winProgBase === 16 ? 16 : (winProgBase === 8 ? 8 : (winProgBase === 2 ? 2 : 10)));
    if (!valid.includes(ch)) return;
    if (winProgDisplayValue === '0') winProgDisplayValue = '';
    winProgDisplayValue += ch;
    var display = document.getElementById('prog-display');
    if (display) display.textContent = winProgDisplayValue;
}

function winProgBackspace() {
    winProgDisplayValue = winProgDisplayValue.slice(0, -1) || '0';
    var display = document.getElementById('prog-display');
    if (display) display.textContent = winProgDisplayValue;
}

function winProgClear() {
    winProgDisplayValue = '0';
    winProgPending = null;
    var display = document.getElementById('prog-display');
    if (display) display.textContent = '0';
}

function winProgOp(op) {
    var dec = parseInt(winProgDisplayValue, winProgBase) || 0;
    winProgPending = { op: op, value: dec };
    winProgDisplayValue = '0';
    var display = document.getElementById('prog-display');
    if (display) display.textContent = '0';
}

function winProgEquals() {
    if (!winProgPending) return;
    var a = winProgPending.value;
    var b = parseInt(winProgDisplayValue, winProgBase) || 0;
    var r;
    if (winProgPending.op === '+') r = a + b;
    else if (winProgPending.op === '-') r = a - b;
    else if (winProgPending.op === '*') r = a * b;
    else if (winProgPending.op === '/') r = b === 0 ? 0 : Math.floor(a / b);
    winProgDisplayValue = (r || 0).toString(winProgBase).toUpperCase();
    winProgPending = null;
    var display = document.getElementById('prog-display');
    if (display) display.textContent = winProgDisplayValue;
}

function winProgBit(op) {
    var a = parseInt(winProgDisplayValue, winProgBase) || 0;
    var r;
    if (op === 'not') {
        r = ~a;
        winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase();
        var display = document.getElementById('prog-display');
        if (display) display.textContent = winProgDisplayValue;
    } else if (op === 'shl') {
        r = a << 1;
        winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase();
        var display2 = document.getElementById('prog-display');
        if (display2) display2.textContent = winProgDisplayValue;
    } else if (op === 'shr') {
        r = a >> 1;
        winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase();
        var display3 = document.getElementById('prog-display');
        if (display3) display3.textContent = winProgDisplayValue;
    } else {
        winProgPending = { op: op, value: a };
        winProgDisplayValue = '0';
        var display4 = document.getElementById('prog-display');
        if (display4) display4.textContent = '0';
    }
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
var winRates = { USD: 1, CNY: 6.72, EUR: 0.89, JPY: 158.5, GBP: 0.75 };
function winCurrency() {
    var amt = parseFloat(document.getElementById('curr-amount').value) || 0;
    var from = document.getElementById('curr-from').value;
    var to = document.getElementById('curr-to').value;
    var usd = amt / winRates[from];
    var result = usd * winRates[to];
    document.getElementById('curr-result').textContent = formatNumber(result) + ' ' + to;
}

// ---------- 体积 ----------
var winVolFactors = { L: 1, mL: 0.001, m3: 1000, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735 };
function winVolume() {
    var amt = parseFloat(document.getElementById('vol-amount').value) || 0;
    var from = document.getElementById('vol-from').value;
    var to = document.getElementById('vol-to').value;
    var liters = amt * winVolFactors[from];
    var result = liters / winVolFactors[to];
    document.getElementById('vol-result').textContent = formatNumber(result) + ' ' + to;
}

// ---------- 长度 ----------
var winLenFactors = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 };
function winLength() {
    var amt = parseFloat(document.getElementById('len-amount').value) || 0;
    var from = document.getElementById('len-from').value;
    var to = document.getElementById('len-to').value;
    var meters = amt * winLenFactors[from];
    var result = meters / winLenFactors[to];
    document.getElementById('len-result').textContent = formatNumber(result) + ' ' + to;
}

// ---------- 键盘支持 ----------
document.addEventListener('keydown', function(e) {
    var wrapper = document.getElementById('calculator-wrapper');
    if (!wrapper || wrapper.offsetParent === null) return;
    if (winCurrentMode !== 'standard' && winCurrentMode !== 'scientific') return;
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    if (/^[0-9]$/.test(e.key)) { winDigit(e.key); e.preventDefault(); return; }
    if (e.key === '.') { winDecimal(); e.preventDefault(); return; }
    if (e.key === '+') { winOperator('+'); e.preventDefault(); return; }
    if (e.key === '-') { winOperator('-'); e.preventDefault(); return; }
    if (e.key === '*') { winOperator('*'); e.preventDefault(); return; }
    if (e.key === '/') { winOperator('/'); e.preventDefault(); return; }
    if (e.key === '^') { winOperator('^'); e.preventDefault(); return; }
    if (e.key === '(') { winParen('('); e.preventDefault(); return; }
    if (e.key === ')') { winParen(')'); e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === '=') { winEquals(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { winBackspace(); e.preventDefault(); return; }
    if (e.key === 'Escape') { winClearAll(); e.preventDefault(); return; }
});

// ---------- 初始化 ----------
winUpdateDisplay();
winSetMode('scientific');
// ============================================================
// Dev Mode: Console Capture
// ============================================================
(function() {
    var consoleEl = document.getElementById('dev-console');
    if (!consoleEl) return;

    var MAX_LINES = 100;
    var lines = [];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function formatArg(arg) {
        if (typeof arg === 'string') return arg;
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch (e) { return String(arg); }
        }
        return String(arg);
    }

    function addLine(type, args) {
        // 只在 Dev Mode 打开时捕获
        var panel = document.getElementById('dev-panel');
        if (!panel || panel.style.display !== 'block') return;

        var time = new Date().toLocaleTimeString();
        var text = Array.prototype.map.call(args, formatArg).join(' ');
        var color = type === 'error' ? '#f48771' : (type === 'warn' ? '#dcdcaa' : '#9cdcfe');

        lines.push({ time: time, type: type, text: text, color: color });

        // 超过 100 条，全清空
        if (lines.length > MAX_LINES) {
            lines = [];
        }

        consoleEl.innerHTML = lines.map(function(l) {
            return '<div style="color:' + l.color + '; padding:2px 0; border-bottom:1px solid #1e1e1e; word-break:break-all;">' +
                '[' + l.time + '] ' + escapeHtml(l.text) +
                '</div>';
        }).join('');
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    // 拦截 console.*
    var origLog = console.log;
    var origWarn = console.warn;
    var origError = console.error;
    var origInfo = console.info;

    console.log = function() {
        origLog.apply(console, arguments);
        addLine('log', arguments);
    };
    console.warn = function() {
        origWarn.apply(console, arguments);
        addLine('warn', arguments);
    };
    console.error = function() {
        origError.apply(console, arguments);
        addLine('error', arguments);
    };
    console.info = function() {
        origInfo.apply(console, arguments);
        addLine('info', arguments);
    };

    // 清空函数
    window.devClearConsole = function() {
        lines = [];
        consoleEl.innerHTML = '(empty)';
    };

    // 拦截未捕获错误
    window.addEventListener('error', function(e) {
        addLine('error', ['Uncaught: ' + (e.message || 'unknown') + ' at ' + (e.filename || '?') + ':' + (e.lineno || '?')]);
    });

    // 拦截未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', function(e) {
        addLine('error', ['UnhandledRejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
    });
})();
