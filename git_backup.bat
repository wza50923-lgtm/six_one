@echo off
chcp 65001 >nul
title 六个一素材本 - GitHub 一键备份
cd /d "%~dp0"

echo ============================================
echo   六个一 · 语文素材本  Git 备份脚本
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Git。
  echo 请先安装 Git：https://git-scm.com/download/win （一路下一步即可）
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/4] 初始化本地仓库...
  git init
)

echo [2/4] 设置提交身份...
git config user.name >nul 2>nul || git config user.name "sixone"
git config user.email >nul 2>nul || git config user.email "sixone@local"

echo [3/4] 添加并提交全部文件...
git add -A
git commit -m "六个一素材本备份 %date% %time%"

echo [4/4] 推送 GitHub...
if "%GIT_REPO_URL%"=="" (
  echo.
  echo 请输入 GitHub 仓库地址（新建空仓库后复制，形如）：
  echo     https://github.com/你的用户名/仓库名.git
  set /p GIT_REPO_URL=URL: 
)
git remote remove origin 2>nul
git remote add origin %GIT_REPO_URL%
git branch -M main
git push -u origin main

echo.
echo 备份完成！之后每次备份直接双击本脚本即可。
pause
