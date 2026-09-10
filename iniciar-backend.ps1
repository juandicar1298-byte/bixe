# Levanta la API de FastAPI del cuarto avance.
#
# Uso desde PowerShell, parado en la carpeta del proyecto:
#     .\iniciar-backend.ps1
#
# No hace falta activar el entorno virtual: se llama directamente al Python
# que vive dentro de .venv, así que tampoco molesta la política de ejecución.

$ErrorActionPreference = "Stop"

# Para que las tildes y la ñ se vean bien en la consola de Windows.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = 'utf-8'

Set-Location (Join-Path $PSScriptRoot 'backend-fastapi')

$python = Join-Path '.' '.venv/Scripts/python.exe'

if (-not (Test-Path $python)) {
    Write-Host "No existe el entorno virtual. Créalo así:" -ForegroundColor Yellow
    Write-Host "    cd backend-fastapi"
    Write-Host "    python -m venv .venv"
    Write-Host "    .venv/Scripts/python.exe -m pip install -r requirements.txt"
    exit 1
}

if (-not (Test-Path '.env')) {
    Write-Host "Falta el archivo .env. Se copia del ejemplo..." -ForegroundColor Yellow
    Copy-Item '.env.example' '.env'
    Write-Host "Creado backend-fastapi/.env — revísalo antes de seguir." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  API            http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  Documentación  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  (Ctrl+C para detener)" -ForegroundColor DarkGray
Write-Host ""

& $python -m uvicorn app.main:app --reload --port 8000
