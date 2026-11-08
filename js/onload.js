
// ===== 主题切换（不持久化，刷新后回到跟随系统）=====
(function() {
    var currentTheme = 'auto';

    function applyTheme(theme) {
        var html = document.documentElement;
        if (theme === 'auto') {
            html.removeAttribute('data-theme');
        } else {
            html.setAttribute('data-theme', theme);
        }
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
        console.log('Theme changed to:', currentTheme);
    };

    applyTheme('auto');

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
            if (currentTheme === 'auto') applyTheme('auto');
        });
    }
})();
