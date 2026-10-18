something.
Pla/ying ga/mes and going under/cover at school.

**Password / 密码:** `12345`
You can type it on the keyboard, or click the calculator buttons in that order.
可以键盘敲，也可以按顺序点计算器按钮。

---

## How user tracking works / 用户追踪说明

- The site uses a **temporary ID** (`temp-xxx`) on first unlock if you don't sign in.
  首次解锁且未登录时，使用临时 ID（`temp-xxx`）。
- Sign in with Google once, and the site stores your Google `sub` + email in `localStorage` for **7 days** — after that you'll be asked to sign in again.
  用 Google 登录一次后，网站会把你的 Google `sub` 和邮箱存进 `localStorage`，有效期 **7 天**，过期后需重新登录。
- Every **60 seconds**, if there's any activity, the site bundles the logs and sends them to GitHub Issues as a single issue.
  每 **60 秒**，只要有任何操作，网站会把日志打包成一条 Issue 发到 GitHub。
- Issues from logged-in users include the real email; temporary visitors get a `[TEMP]` prefix in the title.
  登录用户的 Issue 带真实邮箱；临时访客的 Issue 标题带 `[TEMP]` 前缀。

---

## ⚠️ Note on GitHub's 65536-character limit / 关于 GitHub 65536 字符上限

GitHub issue bodies have a **hard limit of 65,536 characters**.
GitHub Issue 正文有 **65,536 字符的硬性上限**。

If a 60-second window accumulates too many logs (hundreds of clicks / keystrokes, heavy typing), the issue body may exceed this limit and the submission will fail with a `422` error.
如果 60 秒内累计的日志过多（数百次点击/按键、大量输入），Issue 正文可能超过这个上限，提交会以 `422` 错误失败。

**In practice this is rare** — normal use produces only tens of log lines per minute.
**实际使用中很少发生** —— 正常使用每分钟只有几十行日志。

<!--
If you want to be safe, add a truncation before sending:
如果想保险，可以在发送前加一行截断：

```javascript
if (logContent.length > 60000) {
  logContent = logContent.slice(0, 60000) + '\n\n[TRUNCATED]';
}
-->

## Manual Login / 手动登录

You can sign in manually by entering any email (no password required).
输入任意邮箱即可手动登录（不需要密码）。

- If your email is in `api/allowed-emails.json` → `developers`, you get **Dev Mode**.
- 如果邮箱在 `api/allowed-emails.json` 的 `developers` 里 → 获得 **Dev Mode**。
- If it's in `users`, you're a normal user.
- 如果在 `users` 里 → 普通用户。
- If it's in neither, it will be **automatically added to `users`**.
- 如果都不在，会**自动加到 `users`**。

⚠️ **Security note:** Manual login has no password. Anyone can enter `aidenliu2026@gmail.com` and see Dev Mode, but sensitive actions (like clearing issues) are still verified on the backend.
⚠️ **安全说明：** 手动登录没有密码。任何人都能输入 `aidenliu2026@gmail.com` 看到 Dev Mode，但敏感操作（比如清理 Issue）仍然由后端验证。

Other notes / 其他说明
I removed Dino because it couldn't be opened via hyperlinks.
移除 Dino，因为无法通过超链接打开。

Also removed sandboxels — it's not working, play it on neal.fun.
移除 sandboxels —— 用不了，去 neal.fun 玩。

I removed chess.com — I don't know why it isn't working, I used href="" to open it.
移除 chess.com —— 不知道为啥用不了，我用的是 href="" 打开的。

Game lag has nothing to do with me; I'm only responsible for aggregating websites and migrating blocked sites to new domains.
游戏卡顿与我无关；我只负责聚合网站、把被墙的站迁移到新域名让它继续能用。

This site has moved to a new URL — the one you're currently visiting. Users accessing the old URL will be redirected here.
本网站已迁移到新地址（你当前访问的这一个）。访问旧地址的用户会被重定向到这里。

GitHub Pages is shutting down (Oct 8) because the old code can't run there; everyone visiting the old URL will be redirected to the Vercel page.
GitHub Pages 于 10 月 8 日停用，因为旧的代码在那边跑不起来；访问旧地址的用户会被重定向到 Vercel 页面。
