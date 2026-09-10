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

# Si el puerto está tomado, uvicorn falla con un WinError 10013 que no explica
# nada. Mejor detectarlo aquí y decir quién lo tiene.
$ocupado = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($ocupado) {
    $pid8000 = $ocupado[0].OwningProcess
    $proceso = (Get-Process -Id $pid8000 -ErrorAction SilentlyContinue).ProcessName
    Write-Host ""
    Write-Host "El puerto 8000 ya está ocupado." -ForegroundColor Yellow
    Write-Host ("  Lo tiene el proceso {0} (PID {1}), seguramente otra copia de la API." -f $proceso, $pid8000)
    Write-Host "  Para liberarlo:" -ForegroundColor DarkGray
    Write-Host ("      taskkill /PID {0} /T /F" -f $pid8000) -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  API            http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  Documentación  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  (Ctrl+C para detener)" -ForegroundColor DarkGray
Write-Host ""

& $python -m uvicorn app.main:app --reload --port 8000
