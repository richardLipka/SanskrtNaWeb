<#
==============================================================================
 Vidyut WebAssembly Build Script from Source (Windows PowerShell)
 Clones ambuda-org/vidyut and compiles Rust crates to WebAssembly using wasm-pack
==============================================================================
#>

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Kontrola předpokladů ===" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Chyba: 'git' není nainstalován nebo není v PATH."
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Warning "Upozornění: Rust toolchain ('cargo') není v PATH. Lze využít předkompilovaný npm balíček '@siva-sh/vidyut'."
    Write-Host "Pokud chcete kompilovat ze zdrojáků, nainstalujte Rust z https://rustup.rs a následně spusťte:"
    Write-Host "  rustup target add wasm32-unknown-unknown"
    Write-Host "  cargo install wasm-pack"
    exit 0
}

if (-not (Get-Command wasm-pack -ErrorAction SilentlyContinue)) {
    Write-Error "Chyba: 'wasm-pack' není nainstalován. Spusťte: cargo install wasm-pack"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkDir = Join-Path $ScriptDir "..\..\_vidyut_build_temp"

Write-Host "=== 2. Klonování upstream repozitáře ambuda-org/vidyut ===" -ForegroundColor Cyan
if (Test-Path $WorkDir) {
    Remove-Item -Recurse -Force $WorkDir
}

git clone --depth 1 https://github.com/ambuda-org/vidyut.git $WorkDir

Set-Location $WorkDir
$commitHash = git rev-parse HEAD
Write-Host "Klonován commit: $commitHash" -ForegroundColor Green

Write-Host "=== 3. Překlad do WebAssembly (wasm-pack) ===" -ForegroundColor Cyan
Set-Location (Join-Path $WorkDir "vidyut-prakriya")
wasm-pack build --target web --release

Write-Host "=== 4. Překlad dokončen! ===" -ForegroundColor Green
Write-Host "Výstupní WebAssembly balíček se nachází v: $WorkDir\vidyut-prakriya\pkg"
