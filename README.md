# BIXE — Catálogo de motos y autos

Proyecto del Tecnólogo en Análisis y Desarrollo de Software (SENA, Centro de
Servicios y Gestión Empresarial). Ficha 3406211.

Aplicación full stack: catálogo de vehículos, servicios de taller, carrito con
pedidos y tres paneles de gestión según el rol del usuario.

---

## Estructura

```
REACT/
├── frontend/           React 19 + Vite + Tailwind 4
├── backend-fastapi/    API del CUARTO avance (Python + FastAPI)   ← la activa
└── backend/            API del TERCER avance (Node.js + Express)  ← se conserva
```

El tercer avance pedía un backend en Node/Express y el cuarto lo pide en
FastAPI. Los dos están en el repositorio: `backend/` queda como evidencia del
entregable anterior y `backend-fastapi/` es el que consume el frontend hoy.
Para cambiar de uno a otro basta con editar `VITE_API_URL` en `frontend/.env`.

---

## Puesta en marcha

Hacen falta **MySQL/MariaDB**, **Node.js 18+** y **Python 3.12+**.

### 1. Base de datos

Enciende MySQL (en XAMPP, el botón **Start** de MySQL). Después crea la base
`bixe_db`, carga el esquema y aplica la migración de servicios y pedidos:

```
mysql -u root -p bixe_db < backend/sql/servicios_pedidos.sql
```

El script es idempotente: se puede ejecutar varias veces sin duplicar nada.

### 2. Arrancar el proyecto

Hay un script para cada parte. Desde PowerShell, en la carpeta del proyecto,
**en dos ventanas distintas**:

```
.\iniciar-backend.ps1
```

```
.\iniciar-frontend.ps1
```

El primero levanta la API en **http://127.0.0.1:8000** (documentación en
**/docs**) y el segundo la web en **http://localhost:5173**. Los scripts crean
el `.env` a partir del ejemplo e instalan las dependencias de npm si faltan.

### 3. La primera vez: crear el entorno de Python

Antes de usar `iniciar-backend.ps1` hay que crear el entorno virtual una sola
vez. Un comando por línea: **PowerShell 5.1 no acepta `&&`** para encadenarlos.

```
cd backend-fastapi
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

No hace falta «activar» el entorno: tanto el script como el comando de arriba
llaman directamente al Python que vive dentro de `.venv`, así que tampoco
estorba la política de ejecución de PowerShell.

Si prefieres levantar la API a mano, sin el script:

```
cd backend-fastapi
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

---

## Variables de entorno

Ninguna credencial vive en el código. Cada carpeta trae su `.env.example` con
los nombres de las variables y sin valores reales; el `.env` está en
`.gitignore`.

| Variable | Dónde | Para qué |
|---|---|---|
| `URL_BASE_DATOS` | backend-fastapi | Conexión a MySQL |
| `SECRET_KEY` | backend-fastapi | Firma de los JWT. Generar con `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ORIGENES_PERMITIDOS` | backend-fastapi | Lista explícita de orígenes para CORS |
| `SMTP_*` | backend-fastapi | Correo de recuperación de contraseña |
| `VITE_API_URL` | frontend | A qué backend apunta la web |

### Correo de recuperación

Si `SMTP_HOST` queda vacío, la API **no envía nada**: escribe el enlace de
recuperación en el log del servidor y lo devuelve en la respuesta (solo en
`ENTORNO=desarrollo`), de modo que el flujo se puede probar completo sin
servidor de correo.

Para activarlo con Gmail hace falta una **contraseña de aplicación** (Cuenta de
Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicación).
La contraseña normal de la cuenta no sirve.

---

## Cómo está organizado el backend

```
backend-fastapi/app/
├── main.py            Configuración de la app, middlewares y manejadores de error
├── dependencias.py    Sesión, paginación, usuario autenticado y permisos
├── errores.py         Excepciones del dominio (no saben de HTTP)
├── middlewares.py     Registro de peticiones y cabeceras de seguridad
├── core/              Configuración, motor de base de datos y seguridad
├── models/            Modelos SQLAlchemy 2.0 (Mapped, mapped_column)
├── schemas/           Esquemas Pydantic v2 de entrada, salida y actualización
├── crud/              Toda la lógica de datos
├── routers/           Un APIRouter por recurso, con prefix y tags
└── services/          Envío de correo
```

Cada capa tiene una responsabilidad: los routers no consultan la base de datos,
el `crud` no lanza `HTTPException` (levanta excepciones del dominio, que
`main.py` traduce al código HTTP correspondiente) y todos los errores de la API
salen con el mismo cuerpo:

```json
{ "codigo": "recurso_no_encontrado", "mensaje": "...", "ruta": "/api/...", "detalles": null }
```

---

## Roles y permisos

| Rol | id | Permisos |
|---|---|---|
| Administrador | 1 | gestionar_usuarios, gestionar_productos, gestionar_servicios, ver_panel_cliente |
| Empleado | 2 | gestionar_productos, gestionar_servicios |
| Cliente | 3 | ver_panel_cliente |

La autorización se resuelve leyendo la tabla `roles_permisos`, no con ids de rol
escritos en el código: cambiar quién puede hacer qué es cuestión de tocar la
base de datos. Las bajas definitivas (`DELETE`) sí quedan reservadas al
administrador por rol, porque no existe un permiso propio para eso.

El token se revalida contra la base de datos en cada petición, así que
desactivar a un usuario o cambiarle el rol tiene efecto inmediato y no cuando
caduque su sesión.

---

## Pruebas de la API

En `backend-fastapi/postman/` hay una colección lista para importar en Postman,
con 39 peticiones que cubren GET, POST, PUT, PATCH y DELETE, incluidos los
casos de error (401 sin token, 403 sin permiso, 404, 409 y 422).

Ejecuta primero **«Login (Administrador)»**: guarda el token en una variable de
la colección y el resto de peticiones salen ya autenticadas.

---

## Seguridad

- Contraseñas con hash **bcrypt** (`pwdlib`); nunca se guardan ni se devuelven en claro.
- **JWT** con `sub`, `rol` y `exp`, verificado en cada petición protegida.
- Se distingue 401 (no autenticado, con cabecera `WWW-Authenticate`) de 403 (sin permiso).
- **CORS** con lista explícita de orígenes, sin comodines.
- Cabeceras defensivas en todas las respuestas (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- Los precios de un pedido se releen de la base de datos: el carrito del
  navegador solo dice qué se pide y cuánto, nunca a qué precio.
- Las imágenes subidas se validan por tipo y tamaño, y la extensión se deduce
  del tipo declarado, no del nombre del archivo.
