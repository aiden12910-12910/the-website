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
