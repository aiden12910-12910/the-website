// ============================================================
// 1. Theme toggle / 主题切换
// ============================================================
(function() {
    var currentTheme = 'auto';

    function applyTheme(theme) {
        var html = document.documentElement;
        if (theme === 'auto') html.removeAttribute('data-theme');
        else html.setAttribute('data-theme', theme);
        updateIcon(theme);
    }
    function updateIcon(theme) {
        var icon = document.getElementById('theme-icon');
        if (!icon) return;
        if (theme === 'auto') icon.textContent = '🌓';
        else if (theme === 'light') icon.textContent = '☀️';
        else icon.textContent = '🌙';
    }
    window.toggleTheme = function() {
        if (currentTheme === 'auto') currentTheme = 'light';
        else if (currentTheme === 'light') currentTheme = 'dark';
        else currentTheme = 'auto';
        applyTheme(currentTheme);
    };
    applyTheme('auto');
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
            if (currentTheme === 'auto') applyTheme('auto');
        });
    }
})();

// ============================================================
// 2. Tracking / 追踪
// ============================================================
(function() {
  var userID = null;
  var userEmail = '';
  var operationLog = [];
  var logInterval = null;
  var isInitialized = false;

  var STORAGE_KEY_ID = 'site_user_id_v1';
  var STORAGE_KEY_EMAIL = 'site_user_email_v1';
  var STORAGE_KEY_TS = 'site_login_ts_v1';
  var SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  function readStored(k) { try { return window.localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function writeStored(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function removeStored(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function clearSession() { removeStored(STORAGE_KEY_ID); removeStored(STORAGE_KEY_EMAIL); removeStored(STORAGE_KEY_TS); }
  function isSessionExpired() { var ts = readStored(STORAGE_KEY_TS); if (!ts) return true; return (Date.now() - Number(ts)) > SESSION_MAX_AGE; }

  function getDeviceFingerprint() {
    try {
      var parts = [navigator.userAgent || '', navigator.language || '', (navigator.languages || []).join(','), navigator.platform || '', navigator.hardwareConcurrency || '', navigator.deviceMemory || '', (window.screen ? window.screen.width + 'x' + window.screen.height + 'x' + (window.screen.colorDepth || '') : ''), window.devicePixelRatio || '', (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), (new Date().getTimezoneOffset())];
      var seed = parts.join('|');
      var hash = 0;
      for (var i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
      return 'fp-' + Math.abs(hash).toString(36);
    } catch (e) { return 'fp-unknown'; }
  }

  function getDeviceMeta() {
    try {
      return ['UA=' + (navigator.userAgent || ''), 'Lang=' + (navigator.language || ''), 'TZ=' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), 'Screen=' + (window.screen ? window.screen.width + 'x' + window.screen.height : ''), 'Platform=' + (navigator.platform || '')].join(' | ');
    } catch (e) { return 'meta-unavailable'; }
  }

  window.manualLogin = function() {
    var input = document.getElementById('manual-email-input');
    var statusEl = document.getElementById('manual-login-status');
    if (!input || !statusEl) return;
    var email = (input.value || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      statusEl.textContent = '✗ invalid email format';
      statusEl.style.color = '#a1260d';
      return;
    }
    statusEl.textContent = 'checking...';
    statusEl.style.color = '#718096';

    fetch('/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok) {
        statusEl.textContent = '✗ ' + (data.error || 'not allowed');
        statusEl.style.color = '#a1260d';
        return;
      }
      var isDev = data.role === 'developer';
      userID = (isDev ? 'dev-' : 'm-') + 'manual-' + Math.random().toString(36).slice(2, 9);
      userEmail = email;
      window.currentUserEmail = email;
      window.currentUserRole = data.role;
      statusEl.textContent = '✓ signed in as ' + email + ' (' + data.role + (data.added ? ', added to users' : '') + ')';
      statusEl.style.color = '#2e7d32';
      if (window.hideLoginUI) window.hideLoginUI();
      addLog('Manual Login Success', { target: email, tag: data.role });
      sendLog();
      if (isDev) setTimeout(function() {
        if (window.checkDevMode) window.checkDevMode();
        if (window.devRefreshIdentity) window.devRefreshIdentity();
      }, 100);
    })
    .catch(function(err) {
      statusEl.textContent = '✗ ' + err.message;
      statusEl.style.color = '#a1260d';
    });
  };

  window.initUserID = function() {
    var cachedID = readStored(STORAGE_KEY_ID);
    var cachedEmail = readStored(STORAGE_KEY_EMAIL);
    if (cachedID && !isSessionExpired()) {
      userID = cachedID;
      userEmail = cachedEmail;
      window.currentUserEmail = cachedEmail;
      if (cachedID.indexOf('g-') === 0) window.currentUserRole = 'google';
      isInitialized = true;
      addLog('Page Load (cached)', { page: window.location.href });
      logInterval = setInterval(sendLog, 60000);
      if (cachedID.indexOf('g-') === 0 || cachedID.indexOf('m-') === 0 || cachedID.indexOf('dev-') === 0) {
        if (window.hideLoginUI) window.hideLoginUI();
      } else {
        var manualContainer = document.getElementById('manual-login-container');
        if (manualContainer) manualContainer.style.display = 'block';
      }
      setTimeout(function() {
        if (window.checkDevMode) window.checkDevMode();
        if (window.devRefreshIdentity) window.devRefreshIdentity();
      }, 100);
      return;
    }
    if (cachedID && isSessionExpired()) clearSession();
    var fp = getDeviceFingerprint();
    var rand = Math.random().toString(36).slice(2, 7);
    userID = 'temp-' + fp + '-' + rand + '-' + Date.now().toString(36);
    userEmail = window.currentUserEmail || '';
    isInitialized = true;
    writeStored(STORAGE_KEY_ID, userID);
    writeStored(STORAGE_KEY_TS, String(Date.now()));
    addLog('Unlock Secret Zone (temp)', { page: window.location.href });
    logInterval = setInterval(sendLog, 60000);
    var manualContainer = document.getElementById('manual-login-container');
    if (manualContainer) manualContainer.style.display = 'block';
  };

  function addLog(actionType, detail) {
    if (!isInitialized) return;
    if (window.__acClicking) return;
    var timestamp = new Date().toLocaleString();
    var entry = {
      time: timestamp, type: actionType, page: window.location.href,
      target: detail && detail.target ? detail.target : 'N/A',
      href: detail && detail.href ? detail.href : 'N/A',
      tag: detail && detail.tag ? detail.tag : 'N/A',
      meta: getDeviceMeta()
    };
    window.addLog = addLog;
    operationLog.push(entry);
    window.devLogBufferCount = operationLog.length;
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
  }

  function sendLog() {
    if (!isInitialized || operationLog.length === 0) return;
    if (!userEmail && window.currentUserEmail) userEmail = window.currentUserEmail;

    var logContent = operationLog.map(function(log) {
      return log.time + ' | ' + log.type + ' | tag=' + log.tag + ' | target=' + log.target + ' | href=' + log.href + ' | ' + log.meta;
    }).join('\n');

    if (logContent.length > 60000) logContent = logContent.slice(0, 60000) + '\n\n[TRUNCATED]';

    var isTemp = userID && userID.indexOf('temp-') === 0;
    var isDev = userID && userID.indexOf('dev-') === 0;
    var isManual = userID && userID.indexOf('m-') === 0;
    var titlePrefix = isTemp ? '[TEMP] ' : (isDev ? '[DEV] ' : (isManual ? '[USER] ' : ''));
    var identityType = isTemp ? 'TEMP' : (isDev ? 'DEV (manual)' : (isManual ? 'USER (manual)' : 'Google'));
    var sessionNote = (isDev || isManual) ? ' (session only, not persisted)' : '';
    var payload = {
      title: titlePrefix + 'Log: ' + (userEmail || userID),
      body: 'UserID: ' + userID + '\n' +
        'Email: ' + (userEmail || '(not logged in)') + '\n' +
        'Identity Type: ' + identityType + sessionNote + '\n' +
        'Log Bundle Sent: ' + new Date().toLocaleString() + '\n' +
        '---\n' + logContent,
      type: 'log',
      email: userEmail || ''
    };
    operationLog = [];
    window.devLogBufferCount = 0;
    window.devLogSentCount = (window.devLogSentCount || 0) + 1;
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log-issue', JSON.stringify(payload));
    } else {
      fetch('/api/log-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function() {});
    }
  }

  window.forceSendLog = sendLog;
  window.getLogSnapshot = function() {
    return operationLog.slice(-10).map(function(e) { return e.time + ' | ' + e.type + ' | ' + e.target; });
  };

  document.addEventListener('click', function(event) {
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toLowerCase() : 'unknown';
    var href = target && target.getAttribute ? target.getAttribute('href') : null;
    var className = target && target.className ? String(target.className) : '';
    var text = target && target.textContent ? target.textContent.slice(0, 50) : '';
    addLog('Click', { target: className || text || 'N/A', href: href || 'N/A', tag: tag });
  }, true);
  document.addEventListener('dblclick', function(event) {
    var target = event.target;
    addLog('DoubleClick', { tag: target && target.tagName ? target.tagName.toLowerCase() : 'unknown' });
  }, true);
  document.addEventListener('keydown', function(event) {
    if (/^[0-9]$/.test(event.key)) addLog('KeyDown', { target: 'digit-key' });
    else if (event.key === 'Escape') addLog('KeyDown', { target: 'Escape' });
  }, true);
  document.addEventListener('input', function(event) {
    if (event.target && event.target.id === 'issueContent') addLog('Input', { target: 'issueContent', tag: 'textarea' });
  }, true);
  document.addEventListener('submit', function() { addLog('Submit', { target: 'form-submit' }); }, true);
  document.addEventListener('copy', function() { addLog('Copy', { target: 'clipboard' }); }, true);
  document.addEventListener('paste', function(event) {
    if (event.target && event.target.id === 'issueContent') addLog('Paste', { target: 'issueContent' });
  }, true);
  document.addEventListener('visibilitychange', function() {
    addLog(document.hidden ? 'TabHidden' : 'TabVisible', { target: 'visibility' });
  });
  window.addEventListener('focus', function() { addLog('WindowFocus', { target: 'window' }); });
  window.addEventListener('blur', function() { addLog('WindowBlur', { target: 'window' }); });
  document.addEventListener('contextmenu', function() { addLog('RightClick', { target: 'contextmenu' }); }, true);
  var lastResizeLog = 0;
  window.addEventListener('resize', function() {
    var now = Date.now();
    if (now - lastResizeLog > 5000) { lastResizeLog = now; addLog('Resize', { target: window.innerWidth + 'x' + window.innerHeight }); }
  });
  window.addEventListener('error', function(event) {
    addLog('JSError', { target: (event.message || 'unknown').slice(0, 80) });
  });
  window.addEventListener('beforeunload', function() {
    if (isInitialized) sendLog();
    if (logInterval) clearInterval(logInterval);
  });
})();

// ============================================================
// 3. openSiteInside / 页面内打开
// ============================================================
var iframeLoadTimeout = null;
var currentIframeUrl = '';

function openSiteInside(url) {
    var layer = document.getElementById('secure-backdoor-layer');
    var iframe = document.getElementById('secure-iframe-target');
    var panicBar = document.getElementById('panic-hover-bar');
    var calcWrapper = document.getElementById('calculator-wrapper');
    var gameZone = document.getElementById('secret-game-zone');
    var errorOverlay = document.getElementById('iframe-error-overlay');

    if (!layer || !iframe) { window.open(url, '_blank'); return; }

    currentIframeUrl = url;
    if (errorOverlay) errorOverlay.style.display = 'none';
    if (calcWrapper) calcWrapper.style.display = 'none';
    if (gameZone) gameZone.style.display = 'none';
    layer.style.display = 'block';
    if (panicBar) panicBar.style.display = 'block';

    if (window.devRecordUrl) window.devRecordUrl(url);
    if (window.addLog) window.addLog('OpenSiteInside', { target: url });

    try { iframe.src = url; } catch (e) { window.open(url, '_blank'); return; }

    if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);
}

function retryIframe() {
    var errorOverlay = document.getElementById('iframe-error-overlay');
    if (errorOverlay) errorOverlay.style.display = 'none';
    if (currentIframeUrl) openSiteInside(currentIframeUrl);
}

function forceReturnToHome() {
    // 1. 切换回计算器的标题和图标
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = 'Calculator - Advanced';
    
    var iconEl = document.getElementById('page-icon');
    if (iconEl) iconEl.href = 'image.ico';

    // 2. 原有的返回逻辑
    var layer = document.getElementById('secure-backdoor-layer');
    var panicBar = document.getElementById('panic-hover-bar');
    var gameZone = document.getElementById('secret-game-zone');
    var calcWrapper = document.getElementById('calculator-wrapper');
    var iframe = document.getElementById('secure-iframe-target');
    var errorOverlay = document.getElementById('iframe-error-overlay');

    if (layer) layer.style.display = 'none';
    if (panicBar) panicBar.style.display = 'none';
    if (iframe) iframe.src = '';
    if (errorOverlay) errorOverlay.style.display = 'none';
    if (calcWrapper) calcWrapper.style.display = 'block';
    if (gameZone) gameZone.style.display = 'none';

    if (iframeLoadTimeout) { clearTimeout(iframeLoadTimeout); iframeLoadTimeout = null; }
    currentIframeUrl = '';

    if (typeof winReset === 'function') winReset();
    var exprEl = document.getElementById('win-expr');
    if (exprEl) exprEl.textContent = '';
    var resultEl = document.getElementById('win-result');
    if (resultEl) resultEl.textContent = '0';

    var issueTrigger = document.getElementById('issueTrigger');
    if (issueTrigger) issueTrigger.style.display = 'none';
    window.focus();
}
// ============================================================
// 4. Unlock / UI / Submit / Dev
// ============================================================
function unlockSecretZone() {
    // 1. 切换为游戏站的标题和图标
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = 'Uran1um';
    
    var iconEl = document.getElementById('page-icon');
    if (iconEl) iconEl.href = 'gamezone.ico';

    // 2. 原有的界面切换逻辑
    var calcWrapper = document.getElementById('calculator-wrapper');
    var gameZone = document.getElementById('secret-game-zone');
    var issueTrigger = document.getElementById('issueTrigger');
    if (calcWrapper) calcWrapper.style.display = 'none';
    if (gameZone) gameZone.style.display = 'block';
    if (issueTrigger) issueTrigger.style.display = 'inline-block';
    
    // 3. 追踪逻辑
    if (!window.trackingStarted) {
        window.trackingStarted = true;
        if (window.initUserID) window.initUserID();
    }
    window.scrollTo(0, 0);
}
window.submitIssue = function() {
    var contentEl = document.getElementById('issueContent');
    if (!contentEl) return;
    var content = contentEl.value.trim();
    if (!content) { alert('Please enter a message'); return; }
    if (window.addLog) window.addLog('Submit Issue', { target: 'issueContent', tag: 'comment' });
    var payload = {
        title: 'User Comment (Anonymous)',
        body: content,
        type: 'comment',
        email: window.currentUserEmail || ''
    };
    fetch('/api/log-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, status: res.status, data: data }; }); })
    .then(function(result) {
        if (!result.ok || !result.data.ok) {
            var msg = result.data && result.data.error ? result.data.error : ('HTTP ' + result.status);
            alert('提交失败: ' + msg);
            return;
        }
        contentEl.value = '';
        document.getElementById('issueModal').style.display = 'none';
        document.getElementById('successModal').style.display = 'flex';
        setTimeout(function() { document.getElementById('successModal').style.display = 'none'; }, 3000);
    })
    .catch(function(err) { alert('提交失败: ' + err.message); });
};

(function bindIssueForm() {
    function bind() {
        var form = document.getElementById('issueForm');
        if (!form || form._bound) return;
        form._bound = true;
        form.addEventListener('submit', function(e) { e.preventDefault(); window.submitIssue(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        var layer = document.getElementById('secure-backdoor-layer');
        var gameZone = document.getElementById('secret-game-zone');
        if ((layer && layer.style.display === 'block') || (gameZone && gameZone.style.display === 'block')) {
            forceReturnToHome();
        }
    }
});

window.hideLoginUI = function() {
    var manualContainer = document.getElementById('manual-login-container');
    if (manualContainer) manualContainer.style.display = 'none';
};

// ============================================================
// 5. Dev Mode
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
    if (historyEl) historyEl.innerHTML = devUrlHistory.map(function(e) { return '<div>' + e + '</div>'; }).join('');
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
        if (statusEl) statusEl.textContent = data.ok ? ('✓ triggered at ' + new Date().toLocaleTimeString()) : ('✗ ' + (data.error || 'unknown error'));
    })
    .catch(function(err) { if (statusEl) statusEl.textContent = '✗ ' + err.message; });
};

window.devFlushLog = function() {
    if (window.forceSendLog) window.forceSendLog();
    var statusEl = document.getElementById('dev-status');
    if (statusEl) statusEl.textContent = '✓ flushed at ' + new Date().toLocaleTimeString();
};

window.devClearStorage = function() {
    if (!confirm('Clear localStorage? This will log you out. 清空 localStorage？这会让你退出登录。')) return;
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
        var s = document.getElementById('dev-status');
        if (s) s.textContent = '✗ ' + e.message;
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
    if (!email && memEmail) email = memEmail + ' (session)';
    if (!email) email = '(not logged in)';
    var isTemp = id.indexOf('temp-') === 0;
    var isDev = id.indexOf('dev-') === 0;
    var typeText;
    if (memRole === 'developer') typeText = 'DEV (session)';
    else if (memRole === 'user') typeText = 'USER (session)';
    else if (isTemp) typeText = 'TEMP';
    else if (isDev) typeText = 'DEV';
    else if (id.indexOf('g-') === 0) typeText = 'Google';
    else typeText = 'unknown';
    var expireText = 'unknown';
    if (ts && ts !== '0') {
        var age = Date.now() - Number(ts);
        var maxAge = 7 * 24 * 60 * 60 * 1000;
        var remain = maxAge - age;
        if (remain <= 0) expireText = 'EXPIRED';
        else {
            var hours = Math.floor(remain / (60 * 60 * 1000));
            var mins = Math.floor((remain % (60 * 60 * 1000)) / (60 * 1000));
            expireText = hours + 'h ' + mins + 'm';
        }
    } else if (memRole) expireText = 'session only';
    idEl.innerHTML = '<div>ID: ' + id + '</div><div>Email: ' + email + '</div><div>Type: ' + typeText + '</div><div>Expires in: ' + expireText + '</div>';
};

window.devLogBufferCount = 0;
window.devLogSentCount = 0;

window.devRefreshLogBuffer = function() {
    var el = document.getElementById('dev-logbuffer');
    if (!el) return;
    el.innerHTML = '<div>Buffered: ' + window.devLogBufferCount + ' entries</div><div>Sent bundles: ' + window.devLogSentCount + '</div>';
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
// 6. Windows 11 Calculator
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
var winInputSequence = '';

function winUpdateDisplay() {
    var exprEl = document.getElementById('win-expr');
    var resultEl = document.getElementById('win-result');
    var indEl = document.getElementById('win-indicator');
    if (indEl) indEl.textContent = winAngleMode;
    if (exprEl) exprEl.textContent = winTokensToDisplay();
    if (resultEl) {
        if (winJustEvaluated && winLastResult !== null) resultEl.textContent = formatNumber(winLastResult);
        else if (winTokens.length === 0) resultEl.textContent = '0';
        else {
            try {
                var preview = winEvaluateTokens(winTokens);
                if (preview !== null && isFinite(preview)) resultEl.textContent = formatNumber(preview);
                else resultEl.textContent = winTokensToDisplay() || '0';
            } catch (e) { resultEl.textContent = winTokensToDisplay() || '0'; }
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

function winCheckUnlock() {
    if (winInputSequence.indexOf('12345') !== -1) {
        if (typeof unlockSecretZone === 'function') unlockSecretZone();
    }
}

function winSetMode(mode) {
    winCurrentMode = mode;
    ['standard','scientific','programmer','date','currency','volume','length'].forEach(function(p) {
        var el = document.getElementById('win-panel-' + p);
        if (el) el.style.display = (p === mode) ? 'block' : 'none';
    });
    document.querySelectorAll('.win-mode').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    if (mode === 'programmer') winProgSetBase(winProgBase);
    winUpdateDisplay();
}

function winDigit(d) {
    winInputSequence = (winInputSequence + String(d)).slice(-20);
    winCheckUnlock();
    if (winJustEvaluated) { winTokens = []; winJustEvaluated = false; }
    if (d === 'π' || d === 'e' || d === 'Ans') {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'const', value: d });
        winUpdateDisplay();
        return;
    }
    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num' && !last.isParen) last.value += d;
    else {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'num', value: d });
    }
    winUpdateDisplay();
}

function winDecimal() {
    winInputSequence = (winInputSequence + '.').slice(-20);
    winCheckUnlock();
    if (winJustEvaluated) { winTokens = []; winJustEvaluated = false; }
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
    if (winJustEvaluated) { winTokens = [{ type: 'num', value: formatNumber(winLastResult) }]; winJustEvaluated = false; }
    var last = winTokens[winTokens.length - 1];
    if (!last) { if (op === '-') winTokens.push({ type: 'num', value: '-' }); return; }
    if (last.type === 'op') last.value = op;
    else winTokens.push({ type: 'op', value: op });
    winUpdateDisplay();
}

function winParen(p) {
    if (winJustEvaluated) { winTokens = []; winJustEvaluated = false; }
    if (p === '(') {
        if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
        winTokens.push({ type: 'paren', value: '(' });
        winPendingParen++;
    } else {
        if (winPendingParen > 0) { winTokens.push({ type: 'paren', value: ')' }); winPendingParen--; }
    }
    winUpdateDisplay();
}

function winUnary(fn) {
    if (winJustEvaluated) { winTokens = []; winJustEvaluated = false; }
    if (needsImplicitMultiply()) winTokens.push({ type: 'op', value: '*' });
    winTokens.push({ type: 'func', value: fn });
    winPendingParen++;
    winUpdateDisplay();
}

function winPercent() {
    if (winTokens.length === 0) return;
    var last = winTokens[winTokens.length - 1];
    if (last.type === 'num') { last.value = String(parseFloat(last.value) / 100); winUpdateDisplay(); }
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

function winClearEntry() {
    var last = winTokens[winTokens.length - 1];
    if (last && last.type === 'num') winTokens.pop();
    winJustEvaluated = false;
    winUpdateDisplay();
}

function winClearAll() {
    winTokens = []; winLastAns = 0; winJustEvaluated = false; winPendingParen = 0; winLastResult = null; winInputSequence = '';
    winUpdateDisplay();
}

function winBackspace() {
    if (winJustEvaluated) { winJustEvaluated = false; winUpdateDisplay(); return; }
    var last = winTokens[winTokens.length - 1];
    if (!last) return;
    if (last.type === 'num') {
        last.value = last.value.slice(0, -1);
        if (last.value === '' || last.value === '-') winTokens.pop();
    } else if (last.type === 'paren') {
        if (last.value === ')') winPendingParen++;
        else winPendingParen--;
        winTokens.pop();
    } else winTokens.pop();
    winUpdateDisplay();
}

function winEquals() {
    if (winTokens.length === 0) return;
    while (winPendingParen > 0) { winTokens.push({ type: 'paren', value: ')' }); winPendingParen--; }
    try {
        var r = winEvaluateTokens(winTokens);
        if (r === null || !isFinite(r)) { document.getElementById('win-result').textContent = 'Error'; return; }
        winLastAns = r; winLastResult = r; winJustEvaluated = true;
        document.getElementById('win-expr').textContent = winTokensToDisplay() + ' =';
        document.getElementById('win-result').textContent = formatNumber(r);
    } catch (e) { document.getElementById('win-result').textContent = 'Error'; }
}

function winEvaluateTokens(tokens) {
    var s = '';
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (t.type === 'num') s += t.value;
        else if (t.type === 'op') { if (t.value === '^') s += '**'; else s += t.value; }
        else if (t.type === 'paren') s += t.value;
        else if (t.type === 'const') {
            if (t.value === 'π') s += '(' + Math.PI + ')';
            else if (t.value === 'e') s += '(' + Math.E + ')';
            else if (t.value === 'Ans') s += '(' + winLastAns + ')';
        } else if (t.type === 'func') {
            var fnMap = {
                'sin': winAngleMode === 'DEG' ? 'Math.sin((Math.PI/180)*' : 'Math.sin(',
                'cos': winAngleMode === 'DEG' ? 'Math.cos((Math.PI/180)*' : 'Math.cos(',
                'tan': winAngleMode === 'DEG' ? 'Math.tan((Math.PI/180)*' : 'Math.tan(',
                'log': 'Math.log10(', 'ln': 'Math.log(', 'sqrt': 'Math.sqrt('
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

function winReset() {
    winTokens = []; winLastAns = 0; winLastResult = null; winJustEvaluated = false; winPendingParen = 0; winInputSequence = ''; winAngleMode = 'DEG'; winProgDisplayValue = '0'; winProgPending = null;
    var exprEl = document.getElementById('win-expr'); if (exprEl) exprEl.textContent = '';
    var resultEl = document.getElementById('win-result'); if (resultEl) resultEl.textContent = '0';
    var indEl = document.getElementById('win-indicator'); if (indEl) indEl.textContent = 'DEG';
    var angleBtn = document.getElementById('win-angle-btn'); if (angleBtn) angleBtn.textContent = 'DEG';
    var progDisplay = document.getElementById('prog-display'); if (progDisplay) progDisplay.textContent = '0';
    ['date-result','date-add-result','curr-result','vol-result','len-result'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.textContent = '—';
    });
}

function winProgSetBase(base) {
    var oldBase = winProgBase;
    winProgBase = parseInt(base);
    var dec = parseInt(winProgDisplayValue, oldBase) || 0;
    winProgDisplayValue = dec.toString(winProgBase).toUpperCase();
    var display = document.getElementById('prog-display'); if (display) display.textContent = winProgDisplayValue;
    var grid = document.getElementById('prog-grid');
    if (grid) grid.querySelectorAll('.prog-hex').forEach(function(btn) {
        btn.style.opacity = (winProgBase === 16) ? '1' : '0.3';
        btn.style.pointerEvents = (winProgBase === 16) ? 'auto' : 'none';
    });
}

function winProgInput(ch) {
    var valid = '0123456789ABCDEF'.slice(0, winProgBase === 16 ? 16 : (winProgBase === 8 ? 8 : (winProgBase === 2 ? 2 : 10)));
    if (!valid.includes(ch)) return;
    if (winProgDisplayValue === '0') winProgDisplayValue = '';
    winProgDisplayValue += ch;
    var display = document.getElementById('prog-display'); if (display) display.textContent = winProgDisplayValue;
}

function winProgBackspace() {
    winProgDisplayValue = winProgDisplayValue.slice(0, -1) || '0';
    var display = document.getElementById('prog-display'); if (display) display.textContent = winProgDisplayValue;
}

function winProgClear() {
    winProgDisplayValue = '0'; winProgPending = null;
    var display = document.getElementById('prog-display'); if (display) display.textContent = '0';
}

function winProgOp(op) {
    var dec = parseInt(winProgDisplayValue, winProgBase) || 0;
    winProgPending = { op: op, value: dec };
    winProgDisplayValue = '0';
    var display = document.getElementById('prog-display'); if (display) display.textContent = '0';
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
    var display = document.getElementById('prog-display'); if (display) display.textContent = winProgDisplayValue;
}

function winProgBit(op) {
    var a = parseInt(winProgDisplayValue, winProgBase) || 0;
    var r;
    if (op === 'not') { r = ~a; winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase(); var d = document.getElementById('prog-display'); if (d) d.textContent = winProgDisplayValue; }
    else if (op === 'shl') { r = a << 1; winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase(); var d2 = document.getElementById('prog-display'); if (d2) d2.textContent = winProgDisplayValue; }
    else if (op === 'shr') { r = a >> 1; winProgDisplayValue = (r >>> 0).toString(winProgBase).toUpperCase(); var d3 = document.getElementById('prog-display'); if (d3) d3.textContent = winProgDisplayValue; }
    else { winProgPending = { op: op, value: a }; winProgDisplayValue = '0'; var d4 = document.getElementById('prog-display'); if (d4) d4.textContent = '0'; }
}

function winDateDiff() {
    var d1 = document.getElementById('date1').value;
    var d2 = document.getElementById('date2').value;
    if (!d1 || !d2) { document.getElementById('date-result').textContent = '—'; return; }
    var diff = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
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

var winRates = { USD: 1, CNY: 6.72, EUR: 0.89, JPY: 158.5, GBP: 0.75 };
function winCurrency() {
    var amt = parseFloat(document.getElementById('curr-amount').value) || 0;
    var from = document.getElementById('curr-from').value;
    var to = document.getElementById('curr-to').value;
    var result = (amt / winRates[from]) * winRates[to];
    document.getElementById('curr-result').textContent = formatNumber(result) + ' ' + to;
}

var winVolFactors = { L: 1, mL: 0.001, m3: 1000, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735 };
function winVolume() {
    var amt = parseFloat(document.getElementById('vol-amount').value) || 0;
    var from = document.getElementById('vol-from').value;
    var to = document.getElementById('vol-to').value;
    var result = (amt * winVolFactors[from]) / winVolFactors[to];
    document.getElementById('vol-result').textContent = formatNumber(result) + ' ' + to;
}

var winLenFactors = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 };
function winLength() {
    var amt = parseFloat(document.getElementById('len-amount').value) || 0;
    var from = document.getElementById('len-from').value;
    var to = document.getElementById('len-to').value;
    var result = (amt * winLenFactors[from]) / winLenFactors[to];
    document.getElementById('len-result').textContent = formatNumber(result) + ' ' + to;
}

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

winUpdateDisplay();
winSetMode('scientific');
