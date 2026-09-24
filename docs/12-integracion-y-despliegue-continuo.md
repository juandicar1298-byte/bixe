# Integración continua y despliegue continuo (CI/CD)

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

---

## 1. Qué es cada cosa

| | Qué significa | Qué lo hace en BIXE |
|---|---|---|
| **CI** · Integración continua | Que cada cambio se **revise y se pruebe automáticamente** al subirlo, en vez de descubrir los fallos al final | GitHub Actions |
| **CD** · Despliegue continuo | Que lo que pasa las pruebas **llegue solo a producción**, sin subir archivos a mano | Render (API) y Vercel (web) |

La idea de fondo: **nadie sube nada a mano y nadie se acuerda de pasar las
pruebas**. Lo hace la máquina, siempre, en cada cambio.

---

## 2. El circuito completo

```
  Tu portátil
      │  git push
      ▼
  GitHub  ──────────────────────────────────────────────┐
      │                                                 │
      ▼  dispara                                        │
  ┌─────────────────────────────────┐                   │
  │  CI  (.github/workflows/ci.yml) │                   │
  │                                 │                   │
  │  Backend:   ruff check          │                   │
  │             pytest  (92)        │                   │
  │  Frontend:  npm run lint        │                   │
  │             npm run build       │                   │
  └─────────────┬───────────────────┘                   │
                │                                       │
        ┌───────┴───────┐                               │
        │               │                               ▼
      ROJO            VERDE                         Vercel
        │               │                      (frontend, automático)
        │               ▼                               │
        │   ┌──────────────────────────────┐            │
        │   │  CD  (despliegue.yml)        │            │
        │   │  avisa a Render y comprueba  │            │
        │   │  que /salud responde 200     │            │
        │   └──────────────┬───────────────┘            │
        │                  ▼                            ▼
   no despliega        bixe-api.onrender.com      bixe.vercel.app
```

---

## 3. Integración continua

**Archivo:** `.github/workflows/ci.yml`

**Cuándo se ejecuta:** en cada `push` a `main`, en cada *pull request*, y a mano
desde la pestaña **Actions** de GitHub.

**Dos trabajos en paralelo:**

### Backend

```yaml
- name: Revisar el estilo del código
  run: ruff check app tests scripts

- name: Pasar las pruebas
  run: pytest -v
```

Las **92 pruebas** corren sobre **SQLite en memoria**. Eso importa: el servidor
de GitHub no tiene MySQL encendido ni acceso a Neon, y no hace falta. Tampoco se
usa ningún secreto — `tests/conftest.py` pone sus propias variables de entorno:

```python
os.environ["URL_BASE_DATOS"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "clave-de-pruebas-no-se-usa-en-ningun-servidor"
```

La versión de Python se lee de `backend-fastapi/.python-version` (3.12.7), **el
mismo archivo que usa Render**. Así el CI prueba sobre la misma versión en la
que va a correr en producción.

### Frontend

```yaml
- run: npm ci          # instala exactamente lo del package-lock
- run: npm run lint    # ESLint
- run: npm run build   # compila con Vite
```

`npm ci` en vez de `npm install`: instala las versiones exactas del
`package-lock.json` sin actualizar nada, de modo que la compilación de hoy es
idéntica a la de ayer. El resultado (`frontend/dist`) se guarda como artefacto
descargable durante 7 días.

---

## 4. Despliegue continuo

**Archivo:** `.github/workflows/despliegue.yml`

```yaml
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  desplegar-api:
    if: github.event.workflow_run.conclusion == 'success'
```

Ese `if` es la clave: **si una prueba falla, este trabajo no llega a
ejecutarse**. A producción solo pasa lo que está en verde.

Después de avisar a Render, espera a que la API vuelva a responder, comprobando
`/salud` cada 15 segundos durante 5 minutos como máximo. Si no responde, el
despliegue sale marcado en rojo.

### Lo que hay que configurar una vez

1. **En Render** → `bixe-api` → Settings → Build & Deploy → **Auto-Deploy: OFF**.
   Si se deja en ON, Render despliega en cuanto llega el commit, sin esperar a
   las pruebas, y el control sobra.

2. **En GitHub** → Settings → Secrets and variables → Actions → **New repository
   secret**:

   | Nombre | Valor |
   |---|---|
   | `RENDER_DEPLOY_HOOK_URL` | la URL de Render → Settings → Deploy Hook |

   Esa URL lleva una clave dentro, por eso va como **secreto del repositorio** y
   no escrita en el archivo: `bixe` es un repositorio público.

Mientras el secreto no exista, el trabajo lo detecta, avisa y termina sin error.

---

## 5. Los tres servicios en la nube

| Servicio | Qué aloja | URL | Se despliega |
|---|---|---|---|
| **Neon** | PostgreSQL | — | — |
| **Render** | API FastAPI | `https://bixe-api.onrender.com` | con el gancho, tras el CI |
| **Vercel** | Frontend React | `https://bixe.vercel.app` | solo, al recibir el push |

**Ninguna clave está en el repositorio.** Todas viven en el panel de cada
servicio como variables de entorno: `URL_BASE_DATOS`, `SECRET_KEY`,
`SMTP_PASSWORD`, `IA_API_KEY`, `ORIGENES_PERMITIDOS`, `URL_FRONTEND`. El archivo
`.env` está en `.gitignore`; lo que sí se versiona es `.env.example`, con los
nombres de las variables y sin ningún valor.

---

## 6. Cómo enseñarlo en la sustentación

1. Abre **github.com/juandicar1298-byte/bixe** → pestaña **Actions**.
2. Se ve la lista de ejecuciones, cada una con su check verde.
3. Entra en la última → se despliegan los dos trabajos y, dentro, cada paso con
   su tiempo y su salida: las 92 pruebas pasando una por una.
4. Muestra el archivo `.github/workflows/ci.yml` desde el propio GitHub.

**Para demostrarlo en vivo:** cambia algo que rompa una prueba, haz push y
enseña el check en rojo y el despliegue que no se ejecuta. Después revierte.

---

## 7. Para la sustentación

> *«La integración continua está en GitHub Actions: cada vez que subo código se
> revisa el estilo con ruff y ESLint, se pasan las 92 pruebas del backend sobre
> SQLite en memoria y se compila el frontend con Vite. El despliegue continuo
> solo se dispara si todo eso termina en verde: entonces avisa a Render por un
> gancho de despliegue y comprueba que la API vuelve a responder. Vercel
> despliega el frontend por su cuenta al recibir el push. Ninguna clave está en
> el repositorio: las de producción viven en el panel de cada servicio y el
> gancho de Render es un secreto del repositorio.»*
