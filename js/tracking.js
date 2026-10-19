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

  function readStored(key) { try { return window.localStorage.getItem(key) || ''; } catch (e) { return ''; } }
  function writeStored(key, val) { try { window.localStorage.setItem(key, val); } catch (e) {} }
  function removeStored(key) { try { window.localStorage.removeItem(key); } catch (e) {} }
  function clearSession() { removeStored(STORAGE_KEY_ID); removeStored(STORAGE_KEY_EMAIL); removeStored(STORAGE_KEY_TS); }
  function isSessionExpired() { var ts = readStored(STORAGE_KEY_TS); if (!ts) return true; return (Date.now() - Number(ts)) > SESSION_MAX_AGE; }

  function getDeviceFingerprint() {
    try {
      var parts = [navigator.userAgent || '', navigator.language || '', (navigator.languages || []).join(','), navigator.platform || '', navigator.hardwareConcurrency || '', navigator.deviceMemory || '', (window.screen ? window.screen.width + 'x' + window.screen.height + 'x' + (window.screen.colorDepth || '') : ''), window.devicePixelRatio || '', (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), (new Date().getTimezoneOffset())];
      var seed = parts.join('|');
      var hash = 0;
      for (var i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0; }
      return 'fp-' + Math.abs(hash).toString(36);
    } catch (e) { return 'fp-unknown'; }
  }

  function decodeJWT(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) { return null; }
  }

  function getDeviceMeta() {
    try {
      return ['UA=' + (navigator.userAgent || ''), 'Lang=' + (navigator.language || ''), 'TZ=' + (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), 'Screen=' + (window.screen ? window.screen.width + 'x' + window.screen.height : ''), 'Platform=' + (navigator.platform || '')].join(' | ');
    } catch (e) { return 'meta-unavailable'; }
  }

  window.handleGoogleCredential = function(response) {
    var payload = decodeJWT(response.credential);
    if (!payload) { console.error('Failed to decode JWT'); return; }
    var googleSub = payload.sub || '';
    var email = payload.email || '';
    if (googleSub) {
      userID = 'g-' + googleSub;
      userEmail = email;
      window.currentUserEmail = email;
      window.currentUserRole = 'google';
      writeStored(STORAGE_KEY_ID, userID);
      writeStored(STORAGE_KEY_EMAIL, email);
      writeStored(STORAGE_KEY_TS, String(Date.now()));
      console.log('Google login success:', userID, email);
      addLog('Google Login', { target: email });
      sendLog();
      if (window.hideLoginUI) window.hideLoginUI();
      setTimeout(function() {
        if (window.checkDevMode) window.checkDevMode();
        if (window.devRefreshIdentity) window.devRefreshIdentity();
      }, 100);
    }
  };

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

      // 手动登录不写 localStorage，刷新即掉线
      console.log('Manual login success (session only):', userID, email, 'role:', data.role);
      addLog('Manual Login', { target: email, tag: data.role });
      sendLog();

      statusEl.textContent = '✓ signed in as ' + email + ' (' + data.role + (data.added ? ', added to users' : '') + ')';
      statusEl.style.color = '#2e7d32';

      if (window.hideLoginUI) window.hideLoginUI();

      // 🚀 Bug 1 修复：手动登录成功后立即发一次日志
      addLog('Manual Login Success', { target: email, tag: data.role });
      sendLog();

      if (isDev) {
        setTimeout(function() {
          if (window.checkDevMode) window.checkDevMode();
          if (window.devRefreshIdentity) window.devRefreshIdentity();
        }, 100);
      }
    })
    .catch(function(err) {
      statusEl.textContent = '✗ ' + err.message;
      statusEl.style.color = '#a1260d';
    });
  };

  function triggerGoogleLogin() {
    var googleContainer = document.getElementById('google-signin-container');
    if (googleContainer) googleContainer.style.display = 'block';
    var manualContainer = document.getElementById('manual-login-container');
    if (manualContainer) manualContainer.style.display = 'block';
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: '624606480216-tt6p88tcaccloctrq9bm3c2t6ghch48d.apps.googleusercontent.com',
        callback: window.handleGoogleCredential,
        prompt: 'select_account'
      });
      window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', text: 'sign_in_with' });
      window.google.accounts.id.prompt();
    } else {
      console.warn('Google GSI not loaded yet, retrying in 1s...');
      setTimeout(triggerGoogleLogin, 1000);
    }
  }

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

      if (cachedID.indexOf('g-') === 0) {
        if (window.hideLoginUI) window.hideLoginUI();
      } else {
        var googleContainer = document.getElementById('google-signin-container');
        if (googleContainer) googleContainer.style.display = 'block';
        var manualContainer = document.getElementById('manual-login-container');
        if (manualContainer) manualContainer.style.display = 'block';
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id: '624606480216-tt6p88tcaccloctrq9bm3c2t6ghch48d.apps.googleusercontent.com',
            callback: window.handleGoogleCredential,
            prompt: 'select_account'
          });
          window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', text: 'sign_in_with' });
        } else {
          setTimeout(function() {
            if (window.google && window.google.accounts) {
              window.google.accounts.id.initialize({
                client_id: '624606480216-tt6p88tcaccloctrq9bm3c2t6ghch48d.apps.googleusercontent.com',
                callback: window.handleGoogleCredential,
                prompt: 'select_account'
              });
              window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', text: 'sign_in_with' });
            }
          }, 1000);
        }
      }

      setTimeout(function() {
        if (window.checkDevMode) window.checkDevMode();
        if (window.devRefreshIdentity) window.devRefreshIdentity();
      }, 100);
      return;
    }
    if (cachedID && isSessionExpired()) { clearSession(); }
    var fp = getDeviceFingerprint();
    var rand = Math.random().toString(36).slice(2, 7);
    userID = 'temp-' + fp + '-' + rand + '-' + Date.now().toString(36);
    // 🚀 Bug 2 修复：如果内存里有登录邮箱，保留它
    userEmail = window.currentUserEmail || '';
    isInitialized = true;
    writeStored(STORAGE_KEY_ID, userID);
    writeStored(STORAGE_KEY_TS, String(Date.now()));
    addLog('Unlock Secret Zone (temp)', { page: window.location.href });
    logInterval = setInterval(sendLog, 60000);
    triggerGoogleLogin();
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
    operationLog.push(entry);
    window.devLogBufferCount = operationLog.length;
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
    console.log('Log added:', entry);
  }

  function sendLog() {
    if (!isInitialized || operationLog.length === 0) return;

    // 🚀 Bug 3 修复：如果 userEmail 空但内存有，恢复
    if (!userEmail && window.currentUserEmail) {
      userEmail = window.currentUserEmail;
    }

    var logContent = operationLog.map(function(log) {
      return log.time + ' | ' + log.type + ' | tag=' + log.tag + ' | target=' + log.target + ' | href=' + log.href + ' | ' + log.meta;
    }).join('\n');
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
      email: userEmail || ''
    };
    operationLog = [];
    window.devLogBufferCount = 0;
    window.devLogSentCount = (window.devLogSentCount || 0) + 1;
    if (window.devRefreshLogBuffer) window.devRefreshLogBuffer();
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log-issue', JSON.stringify(payload));
      console.log('1 min Log bundle sent via sendBeacon');
    } else {
      fetch('/api/log-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(function() { console.log('1 min Log bundle sent via fetch'); })
      .catch(function(err) { console.error('Request error:', err); });
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
    addLog('Click', { target: className || text || (target && target.outerHTML ? target.outerHTML.slice(0, 80) : 'N/A'), href: href || 'N/A', tag: tag });
  }, true);

  document.addEventListener('dblclick', function(event) {
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toLowerCase() : 'unknown';
    addLog('DoubleClick', { tag: tag });
  }, true);

  document.addEventListener('keydown', function(event) {
    var key = event.key;
    if (/^[0-9]$/.test(key)) { addLog('KeyDown', { target: 'digit-key' }); }
    else if (key === 'Escape') { addLog('KeyDown', { target: 'Escape' }); }
  }, true);

  document.addEventListener('input', function(event) {
    var target = event.target;
    if (target && target.id === 'issueContent') { addLog('Input', { target: 'issueContent', tag: 'textarea' }); }
  }, true);

  document.addEventListener('submit', function() { addLog('Submit', { target: 'form-submit' }); }, true);
  document.addEventListener('copy', function() { addLog('Copy', { target: 'clipboard' }); }, true);
  document.addEventListener('paste', function(event) {
    var target = event.target;
    if (target && target.id === 'issueContent') { addLog('Paste', { target: 'issueContent' }); }
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
    if (now - lastResizeLog > 5000) {
      lastResizeLog = now;
      addLog('Resize', { target: window.innerWidth + 'x' + window.innerHeight });
    }
  });

  window.addEventListener('error', function(event) {
    addLog('JSError', { target: (event.message || 'unknown').slice(0, 80) });
  });

  window.addEventListener('beforeunload', function() {
    if (isInitialized) sendLog();
    if (logInterval) clearInterval(logInterval);
  });
})();
