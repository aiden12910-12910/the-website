window.onload = function() {
    if (window.location.href.includes('github')) {
        var userConfirmed = confirm("This URL (aiden12910-12910.github.io/the-website/) is shutting down on October 10th, and the site is moving to aiden12910-12910.vercel.app/index.html. I won't be responsible if you can't access the site after the old URL closes, so be sure to bookmark the new one; you will be redirected after closing this pop-up.    该网址 (aiden12910-12910.github.io/the-website/) 将于 10 月 10 日停用，网站将迁移至 aiden12910-12910.vercel.app/index.html请务必收藏新网址；关闭此弹窗后，您将被自动重定向。");
        if (userConfirmed) {
            window.location.replace('https://aiden12910-12910.vercel.app/index.html');
        } else {
            alert('You canceled redirect,will stay on this tab.您取消了跳转，将留在当前页面。');
        }
    }
}


// ===== 主题切换（不持久化，刷新后回到跟随系统）=====
(function() {
    var currentTheme = 'auto'; // 只在内存里，不写 localStorage

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

    // 页面加载时应用默认（跟随系统）
    applyTheme('auto');

    // 系统主题变化时，如果当前是 auto，自动跟随
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
            if (currentTheme === 'auto') applyTheme('auto');
        });
    }
})();
