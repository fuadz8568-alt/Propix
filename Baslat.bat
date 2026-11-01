@echo off
chcp 65001 > nul
title Əmlak Pro — Makler Köməkçisi
cls

echo =======================================================
echo          ƏMLAK PRO — MAKLER KÖMƏKÇİSİ
echo =======================================================
echo.
echo  Sistem başladılır, zəhmət olmasa gözləyin...
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo  İlk quraşdırma aparılır...
    call npm install
)

start "" http://localhost:3000

echo  Sayt brauzerinizdə açılır: http://localhost:3000
echo.
echo  Serveri dayandırmaq üçün bu pəncərəni bağlaya bilərsiniz.
echo =======================================================
echo.

node server.js
pause
