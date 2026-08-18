# 推送到 GitHub 备份指南（约 2 分钟）

## 本机已为你准备好
- **.gitignore**：忽略系统垃圾文件（.DS_Store / Thumbs.db 等）；
- **git_backup.bat**：一键 初始化→提交→推送到 GitHub 的脚本（双击运行）。

## 方法 A（推荐给不熟悉命令行的同学）：GitHub Desktop，全程图形界面
1. 安装 GitHub Desktop：https://desktop.github.com （登录你的 GitHub 账号）；
2. 打开后：File → Add local repository → 选择文件夹 **D:\six_one** → Add；
3. 点右上角 **Publish repository** → 起个名字（如 sixone）→ 点 Publish；
4. 之后每次改完文件：左下角填一句话（如"更新素材"）→ Commit to main → Push origin。

## 方法 B：命令行脚本（最省事）
1. 到 https://github.com/new 新建一个**空仓库**（不要勾选 Add README / .gitignore / license）；
2. 复制仓库地址（https 形式，如 https://github.com/用户名/sixone.git）；
3. 双击 **D:\six_one\git_backup.bat**，粘贴地址回车；
4. 弹窗登录 GitHub（或自动弹出）→ 看到"备份完成"即成功；
5. 之后每周更新完素材，双击脚本即可再次备份。

## 方法 C：纯命令行
```bat
cd /d D:\six_one
git init
git add -A
git commit -m "六个一素材本备份"
git remote add origin https://github.com/用户名/sixone.git
git branch -M main
git push -u origin main
```

## 常见问题
- **没有 Git？** 装 https://git-scm.com/download/win ，或直接用方法 A（GitHub Desktop 自带 Git）。
- **推送要密码/被拒绝？** 2021 年后 GitHub 不再支持账号密码推送，用以下任一方式：
  - 装 GitHub Desktop 并登录（推荐，最省事）；
  - 或命令行执行 `gh auth login`（GitHub CLI）；
  - 或生成 Personal Access Token：GitHub → Settings → Developer settings → Personal access tokens → Generate（勾选 repo 权限），推送时用户名填你的 GitHub 用户名、密码填这个 token。
- **改了仓库地址？** 直接改脚本里的 `GIT_REPO_URL`，或先 `git remote set-url origin 新地址`。

## 安全确认（已检查）
- 项目文件里**没有**你的 DeepSeek API Key（Key 只存在浏览器 localStorage，从未写入文件）；
- 仓库会包含：程序源码、内置素材数据、导出文件说明、本计划文档 —— 都是安全内容；
- 提醒：**不要把浏览器里设置面板的 Key 截图/复制到任何文件再提交**。
