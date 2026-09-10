# Levanta la web de React.
#
# Uso desde PowerShell, parado en la carpeta del proyecto:
#     .\iniciar-frontend.ps1

$ErrorActionPreference = "Stop"

# Para que las tildes y la ñ se vean bien en la consola de Windows.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location (Join-Path $PSScriptRoot 'frontend')

if (-not (Test-Path 'node_modules')) {
    Write-Host "Instalando dependencias (solo la primera vez)..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host "Creado frontend/.env apuntando a http://localhost:8000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Web  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  El backend tiene que estar corriendo: .\iniciar-backend.ps1" -ForegroundColor DarkGray
Write-Host ""

npm run dev
