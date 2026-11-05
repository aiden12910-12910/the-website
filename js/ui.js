// Temporary recovery shim: load the complete UI implementation from the last
// intact revision, then replace only the issue-submission handler.
(function() {
    var script = document.createElement('script');
    script.src = 'https://raw.githubusercontent.com/aiden12910-12910/the-website/ca00a64b07cad2a742fcf56be11e0abeb97d5813/js/ui.js';
    script.onload = function() {
        window.submitIssue = function(event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();

            var textarea = document.getElementById('issueContent');
            var content = textarea ? textarea.value.trim() : '';
            if (!content) {
                alert('Please enter a message');
                return false;
            }

            if (typeof addLog === 'function') {
                addLog('Submit Issue', { target: 'issueContent', tag: 'comment' });
            }

            var payload = JSON.stringify({
                title: 'User Comment (Anonymous)',
                body: content,
                type: 'comment',
                email: window.currentUserEmail || ''
            });

            try {
                if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/log-issue', new Blob([payload], {
                        type: 'application/json; charset=utf-8'
                    }));
                } else {
                    fetch('/api/log-issue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: payload,
                        keepalive: true
                    }).catch(function(err) { console.error('Issue submission failed:', err); });
                }
            } catch (err) {
                console.error('Issue submission failed:', err);
                alert('Could not send your issue. Please try again.');
                return false;
            }

            if (textarea) textarea.value = '';
            var issueModal = document.getElementById('issueModal');
            if (issueModal) issueModal.style.display = 'none';
            var successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.style.display = 'flex';
                setTimeout(function() { successModal.style.display = 'none'; }, 3000);
            }
            return false;
        };
    };
    script.onerror = function() {
        console.error('Could not load the recovered UI script.');
    };
    document.head.appendChild(script);
})();
