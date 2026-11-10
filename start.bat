@echo off
chcp 65001 >nul
title Check Export NDP
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] ไม่พบ Node.js กรุณาติดตั้ง Node.js 20 ขึ้นไปจาก https://nodejs.org แล้วเปิดไฟล์นี้อีกครั้ง
  pause
  exit /b 1
)

if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo [!] สร้างไฟล์ backend\.env แล้ว กรุณาใส่ DATABASE_URL ของ รพ. ในไฟล์นั้น แล้วเปิดไฟล์นี้อีกครั้ง
  notepad "backend\.env"
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] กำลังติดตั้งแพ็กเกจ ^(ครั้งแรกใช้เวลาสักครู่^)...
  call npm install || goto :fail
)

if not exist "frontend\dist\index.html" (
  echo [2/3] กำลัง build...
  call npm run build || goto :fail
)

echo [3/3] เปิดระบบที่ http://localhost:6010
start "" http://localhost:6010
call npm start
goto :eof

:fail
echo [!] เกิดข้อผิดพลาด ดูข้อความด้านบน
pause
exit /b 1
