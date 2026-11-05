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
window.submitIssue = function(event) {
    try {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        var textarea = document.getElementById('issueContent');
        var content = textarea ? textarea.value.trim() : '';
        if (!content) {
            alert('Please enter a message');
            return;
        }

        if (typeof addLog === 'function') {
            addLog('Submit Issue', { target: 'issueContent', tag: 'comment' });
        }

        var payload = {
            title: 'User Comment (Anonymous)',
            body: content,
            type: 'comment',
            email: window.currentUserEmail || ''
        };
        var payloadJson = JSON.stringify(payload);

        if (navigator.sendBeacon && typeof navigator.sendBeacon === 'function') {
            var blob = new Blob([payloadJson], { type: 'application/json; charset=utf-8' });
            var queued = navigator.sendBeacon('/api/log-issue', blob);
            console.log('Issue sent via sendBeacon:', queued);
        } else {
            fetch('/api/log-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadJson,
                keepalive: true
            }).catch(function(err) { console.error('Request error:', err); });
        }

        if (textarea) textarea.value = '';

        var issueModal = document.getElementById('issueModal');
        if (issueModal) issueModal.style.display = 'none';

        var successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.style.display = 'flex';
            setTimeout(function() { successModal.style.display = 'none'; }, 3000);
        }

        var issueForm = document.getElementById('issueForm');
        if (issueForm && typeof issueForm.reset === 'function') issueForm.reset();
    } catch (err) {
        console.error('submitIssue failed:', err);
        alert('Submission failed. Please try again.');
    }
};

var issueForm = document.getElementById('issueForm');
if (issueForm) {
    issueForm.addEventListener('submit', function(e) {
        e.preventDefault();
        window.submitIssue(e);
    });
}

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
