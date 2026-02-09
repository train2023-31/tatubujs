@echo off
REM PWA Setup Script for Windows
REM This script automates the initial setup of the PWA

setlocal enabledelayedexpansion

echo.
echo ================================
echo 🚀 Starting PWA Setup...
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

echo ✓ Python found
python --version

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 14 or higher.
    exit /b 1
)

echo ✓ Node.js found
node --version
echo ✓ npm found
npm --version

echo.
echo ================================
echo 📦 Step 1: Installing Backend Dependencies
echo ================================
echo.

cd back

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo Installing Python packages...
pip install -r requirements.txt

echo ✓ Backend dependencies installed

echo.
echo ================================
echo 🔑 Step 2: Generating VAPID Keys
echo ================================
echo.

REM Check if .env already exists
if exist ".env" (
    echo ⚠️  Backend .env file already exists
    set /p regenerate="Do you want to regenerate VAPID keys? (y/N): "
    if /i "!regenerate!"=="y" (
        python generate_vapid_keys.py
        echo.
        echo ⚠️  Please update your .env files with the new keys above
    ) else (
        echo Skipping VAPID key generation...
    )
) else (
    python generate_vapid_keys.py
    echo.
    echo 📝 Please create backend .env file with the keys above
    echo    Use back\.env.example as a template
)

cd ..

echo.
echo ================================
echo 📦 Step 3: Installing Frontend Dependencies
echo ================================
echo.

cd frontend

REM Install npm packages
echo Installing npm packages...
call npm install

echo ✓ Frontend dependencies installed

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  Frontend .env file not found
    echo    Please create frontend\.env and add REACT_APP_VAPID_PUBLIC_KEY
) else (
    echo ✓ Frontend .env file exists
    
    REM Check if VAPID key is set
    findstr /C:"REACT_APP_VAPID_PUBLIC_KEY=" .env >nul
    if errorlevel 1 (
        echo ⚠️  REACT_APP_VAPID_PUBLIC_KEY not found in .env
        echo    Please add the VAPID public key to frontend\.env
    ) else (
        echo ✓ VAPID public key configured
    )
)

cd ..

echo.
echo ================================
echo ✅ Setup Complete!
echo ================================
echo.
echo 📋 Next Steps:
echo.
echo 1. Configure environment variables (if not done):
echo    - Backend:  back\.env (use back\.env.example as template)
echo    - Frontend: frontend\.env
echo.
echo 2. Start the backend:
echo    cd back ^&^& python run.py
echo.
echo 3. Start the frontend (in a new terminal):
echo    cd frontend ^&^& npm start
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo 5. Test push notifications:
echo    - Click the notification bell icon
echo    - Grant permission when prompted
echo    - Send a test notification
echo.
echo 📚 Documentation:
echo    - Quick Start: docs\QUICK_START_PWA.md
echo    - Full Guide:  docs\PWA_SETUP_GUIDE.md
echo.
echo Happy coding! 🎉
echo.

pause
