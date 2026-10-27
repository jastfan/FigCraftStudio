@echo off
setlocal enabledelayedexpansion
title FigCraft Studio — Pure Rust Interface Design Suite
cd /d "%~dp0"

:MENU
cls
echo ========================================================================
echo   FIGCRAFT STUDIO ⚡ (Clean-Room Pure Rust Interface Design Suite)
echo   Official Architecture Parity: storytold/figcraft
echo ========================================================================
echo.
echo   Select Launch Mode:
echo.
echo   [1] 🦀 Launch Native Desktop Studio (apps/figcraft — Pure Rust + egui)
echo   [2] 🌐 Launch FigCraft Web Studio (apps/figcraft-web — WebAssembly/HTML5)
echo   [3] 🤖 Launch FigCraft MCP AI Agent Server (apps/figcraft-cli --mcp)
echo   [4] ⚡ Launch Multiplayer Collaboration Server (apps/figcraft-server)
echo   [5] 🛠️ Toolchain Diagnostics ^& Visual C++ Build Tools Setup
echo   [0] Exit
echo.
set /p choice="Enter choice [1-5, 0]: "

if "%choice%"=="1" goto LAUNCH_NATIVE
if "%choice%"=="2" goto LAUNCH_WEB
if "%choice%"=="3" goto LAUNCH_MCP
if "%choice%"=="4" goto LAUNCH_SERVER
if "%choice%"=="5" goto DIAGNOSTICS
if "%choice%"=="0" exit /b 0

echo Invalid selection. Please choose 1-5 or 0.
timeout /t 2 >nul
goto MENU

:LAUNCH_NATIVE
echo.
echo ========================================================================
echo   Starting FigCraft Native Desktop Application (apps/figcraft)...
echo ========================================================================
echo.
echo Checking for Microsoft C++ Build Tools (link.exe)...
where link.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] NOTICE: Visual C++ linker (link.exe) was not found on your PATH.
    echo     Rust needs Microsoft Visual C++ Build Tools to compile native Windows executables.
    echo.
    echo     To install Microsoft Visual C++ Build Tools automatically via winget,
    echo     open PowerShell as Administrator and run:
    echo.
    echo     winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    echo.
    set /p try_anyway="Would you like to attempt 'cargo run -p figcraft' anyway? (y/n): "
    if /i "!try_anyway!" NEQ "y" goto MENU
)

echo.
echo Executing: cargo run -p figcraft
cargo run -p figcraft
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Build exited with code %ERRORLEVEL%.
    echo     If you saw 'linker link.exe not found', please install Visual C++ Build Tools (Option 5).
)
echo.
pause
goto MENU

:LAUNCH_WEB
echo.
echo ========================================================================
echo   Starting FigCraft Web Studio (apps/figcraft-web)...
echo ========================================================================
echo Starting local offline server at http://localhost:3030...
start "" "http://localhost:3030"
python -m http.server 3030
pause
goto MENU

:LAUNCH_MCP
echo.
echo ========================================================================
echo   Starting FigCraft Model Context Protocol (MCP) Server...
echo ========================================================================
echo Listening for JSON-RPC 2.0 requests over stdio (Claude / Cursor / Antigravity)...
cargo run -p figcraft-cli -- --mcp
pause
goto MENU

:LAUNCH_SERVER
echo.
echo ========================================================================
echo   Starting FigCraft Real-time Multiplayer Collaboration Server...
echo ========================================================================
cargo run -p figcraft-server
pause
goto MENU

:DIAGNOSTICS
echo.
echo ========================================================================
echo   FigCraft Toolchain Diagnostics
echo ========================================================================
echo.
echo Rust Compiler:
rustc --version 2>nul || echo [MISSING] rustc not found
echo.
echo Cargo Package Manager:
cargo --version 2>nul || echo [MISSING] cargo not found
echo.
echo Microsoft C++ Linker (link.exe):
where link.exe 2>nul || echo [MISSING] link.exe not found on PATH
echo.
echo Windows Package Manager (winget):
winget --version 2>nul || echo [MISSING] winget not found
echo.
echo ------------------------------------------------------------------------
echo To install Microsoft Visual C++ Build Tools (required for link.exe):
echo Run this in PowerShell / Command Prompt:
echo   winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
echo ------------------------------------------------------------------------
echo.
pause
goto MENU
