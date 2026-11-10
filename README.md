# the-website

A collection of unblocked games, with a calculator on the front page that unlocks the game list when you type `12345`.

## Hosting / 托管

The site is now hosted on **Cloudflare Workers** at:
https://the-website.uran1um.dpdns.org/

text

The old Vercel deployment is paused because the Hobby plan limits were exceeded. Google sign-in has been removed; manual login still works.

本网站现已托管在 **Cloudflare Workers**，地址是 `https://the-website.uran1um.dpdns.org/`。旧的 Vercel 部署因为超出 Hobby 计划限额被暂停。Google 登录已移除，手动登录仍然可用。

## Password / 密码

`12345`

You can type it on the keyboard, or click the calculator buttons in that order.

可以键盘敲，也可以按顺序点计算器按钮。

## How to open a game / 如何打开游戏

Click a game link. It loads **inside the current page** via `openSiteInside`. Hover the mouse over the top area to reveal a gray bar; click it to return to the home page. You can also press `Esc` twice — the first press releases the mouse/keyboard from the game, the second returns you to the previous view.

Some websites reject being embedded and will open in a new tab instead.

点击游戏链接，会在**当前页面内**通过 `openSiteInside` 加载。把鼠标移到页面顶部会显示一条灰色横条，点击它即可回到首页。也可以按两次 `Esc` 键 —— 第一次把鼠标/键盘从游戏上下文中释放，第二次返回上一个视图。

部分网站因为拒绝被嵌入，会在新标签页中打开。

## How user tracking works / 用户追踪说明

- The site uses a **temporary ID** (`temp-xxx`) on first unlock if you don't sign in.
  首次解锁且未登录时，使用临时 ID（`temp-xxx`）。
- Manual login: enter any email (no password). Emails in `public/js/allowed-emails.json` → `developers` get **Dev Mode**; emails in `users` are normal users; anything else is **automatically added to `users`**.
  手动登录：输入任意邮箱（不需要密码）。`public/js/allowed-emails.json` 的 `developers` 里的邮箱获得 **Dev Mode**；`users` 里的是普通用户；都不在的会**自动加到 `users`**。
- Every **60 seconds**, if there's any activity, the site bundles the logs and sends them to GitHub Issues as a single issue.
  每 **60 秒**，只要有任何操作，网站会把日志打包成一条 Issue 发到 GitHub。
- Issues from logged-in users include the real email; temporary visitors get a `[TEMP]` prefix in the title.
  登录用户的 Issue 带真实邮箱；临时访客的 Issue 标题带 `[TEMP]` 前缀。
- Manual login is **session-only** — refresh will sign you out.
  手动登录**仅当前会话有效**，刷新会掉线。

⚠️ **Security note:** Manual login has no password. Anyone can enter a developer email and see Dev Mode, but sensitive actions (like clearing issues) are still verified on the backend by reading `allowed-emails.json`.

⚠️ **安全说明：** 手动登录没有密码。任何人都能输入开发者邮箱看到 Dev Mode，但敏感操作（比如清理 Issue）仍然由后端读取 `allowed-emails.json` 验证。

## Project structure / 项目结构
the-website/
├── wrangler.jsonc
├── public/
│ ├── index.html
│ ├── 404.html
│ ├── x.ico
│ ├── css/style.css
│ └── js/
│ ├── app.js
│ └── allowed-emails.json
├── src/
│ └── index.js
├── .github/workflows/
│ └── clear-issues.yml
└── README.md

text

All front-end JS is merged into `public/js/app.js`. The API logic lives in `src/index.js` as a Cloudflare Worker.

所有前端 JS 合并在 `public/js/app.js`。API 逻辑在 `src/index.js`，作为 Cloudflare Worker 运行。

## API routes / API 路由

| Route | Method | Purpose |
|---|---|---|
| `/api/check-email` | POST | Check email role, auto-add to users if unknown / 检查邮箱身份，未知邮箱自动收录 |
| `/api/log-issue` | POST | Create a GitHub Issue with logs / comments / 写 GitHub Issue（日志或留言） |
| `/api/trigger-clear-issues` | POST | Developer-only, trigger `clear-issues` workflow / 仅开发者，触发清理 Issue 的 workflow |

## Deploy / 部署

1. Install Node.js 18+ and Wrangler:

```powershell
winget install -e --id OpenJS.NodeJS.LTS
npm install -g wrangler
```
2. Set the GitHub token as a Worker secret:
```
powershell
npx wrangler secret put MY_GITHUB_TOKEN
Paste a GitHub PAT with Contents: Read and write and Actions: Write.
```
3. Deploy:
```
powershell
npx wrangler deploy
```
4. Bind a custom domain: Cloudflare Dashboard → Workers & Pages → the-website → Settings → Domains & Routes → Add → Custom Domain → the-website.uran1um.dpdns.org.

GitHub 65536-character limit / GitHub 65536 字符上限
GitHub issue bodies have a hard limit of 65,536 characters. The site truncates log bundles at 60,000 characters and appends [TRUNCATED] before sending, so submissions won't fail with a 422.

GitHub Issue 正文有 65,536 字符的硬性上限。本站会在发送前把日志截断到 60,000 字符并附加 [TRUNCATED]，避免提交时因超限返回 422。

Other notes / 其他说明
Dino was removed because it couldn't be opened via hyperlinks.
移除 Dino，因为无法通过超链接打开。

sandboxels was removed — it's not working, play it on neal.fun.
移除 sandboxels —— 用不了，去 neal.fun 玩。

chess.com was removed — it wasn't working with href="".
移除 chess.com —— 用 href="" 打开时用不了。

Game lag has nothing to do with me; I'm only responsible for aggregating websites and migrating blocked sites to new domains.
游戏卡顿与我无关；我只负责聚合网站、把被墙的站迁移到新域名让它继续能用。

## License / 许可证
MIT, See LICENCE in repo
