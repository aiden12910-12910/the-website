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
            navigator.sendBeacon('/api/log-issue', blob);
        } else {
            fetch('/api/log-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadJson,
                keepalive: true
            }).catch(function(err) {
                console.error('Request error:', err);
            });
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
