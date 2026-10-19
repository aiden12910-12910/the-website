    var layer = document.getElementById('secure-backdoor-layer');
    var iframe = document.getElementById('secure-iframe-target');
    var panicBar = document.getElementById('panic-hover-bar');
    var gameZone = document.getElementById('secret-game-zone');
    var calcWrapper = document.getElementById('calculator-wrapper');
    var display = document.getElementById('display');
    var issueTrigger = document.getElementById('issueTrigger');

    var inputSequence = "";
    function pressCalc(num) {
        if (display.innerText === "0") display.innerText = "";
        display.innerText += num;
        inputSequence = (inputSequence + num).slice(-10);
        if (inputSequence.includes("12345")) { unlockSecretZone(); }
    }
    function clearCalc() { display.innerText = "0"; inputSequence = ""; }
    function calculate() {
        try { display.innerText = eval(display.innerText); }
        catch(err) { display.innerText = "Error"; }
        inputSequence = "";
    }

    function unlockSecretZone() {
        calcWrapper.style.display = "none";
        gameZone.style.display = "block";
        if (issueTrigger) issueTrigger.style.display = 'inline-block';
        inputSequence = "";
        if (!window.trackingStarted) {
            window.trackingStarted = true;
            if (window.initUserID) window.initUserID();
        }
    }

    window.submitIssue = function() {
        var content = document.getElementById('issueContent').value.trim();
        if (!content) { alert('Please enter a message'); return; }

        // 🚀 Bug 1 修复：记录留言提交操作
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

    function forceReturnToHome() {
        layer.style.display = 'none';
        panicBar.style.display = 'none';
        gameZone.style.display = "none";
        calcWrapper.style.display = "block";
        iframe.src = '';
        clearCalc();
        if (issueTrigger) issueTrigger.style.display = 'none';
        window.focus();
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (layer.style.display === 'block' || gameZone.style.display === "block") { forceReturnToHome(); }
        }
        if (["0","1","2","3","4","5","6","7","8","9"].includes(event.key)) {
            inputSequence = (inputSequence + event.key).slice(-10);
            if (inputSequence.includes("12345")) { unlockSecretZone(); }
        }
    });

    // ===== 统一隐藏登录 UI（Google 按钮 + 手动登录框）=====
    window.hideLoginUI = function() {
        var googleContainer = document.getElementById('google-signin-container');
        if (googleContainer) googleContainer.style.display = 'none';
        var manualContainer = document.getElementById('manual-login-container');
        if (manualContainer) manualContainer.style.display = 'none';
    };

    // ===== 开发者模式 =====
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
        if (!confirm('Clear localStorage? This will log you out, and a new temporary ID will be generated the next time you visit.清空 localStorage？这会让你退出登录，下次访问会重新生成临时 ID。')) return;
        try {
            localStorage.removeItem('site_user_id_v1');
            localStorage.removeItem('site_user_email_v1');
            localStorage.removeItem('site_login_ts_v1');
            window.currentUserEmail = '';
            window.currentUserRole = '';
            if (window.devRefreshIdentity) window.devRefreshIdentity();

            // 🚀 Bug 4 修复：隐藏 Dev Mode 面板和切换按钮
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

        // 🚀 Bug 3 修复：优先读内存
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

    // ===== 页面加载时检查 Dev Mode =====
    (function() {
    try {
        var cachedID = window.localStorage.getItem('site_user_id_v1') || '';
        var cachedEmail = window.localStorage.getItem('site_user_email_v1') || '';

        // 清理旧版手动登录残留
        if (cachedID.indexOf('dev-') === 0 || cachedID.indexOf('m-') === 0) {
            console.log('Cleaning up legacy manual login:', cachedID);
            localStorage.removeItem('site_user_id_v1');
            localStorage.removeItem('site_user_email_v1');
            localStorage.removeItem('site_login_ts_v1');
            cachedID = '';
            cachedEmail = '';
        }

        // Google 登录（g- 前缀）
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
            // 🚀 Bug 5 修复：未登录 → 显示手动登录框 + 渲染 Google 按钮
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
