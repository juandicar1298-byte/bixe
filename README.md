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
`bixe_db`, carga el esquema y aplica las dos migraciones **en este orden**:

```
mysql -u root -p bixe_db < backend/sql/servicios_pedidos.sql
```

```
mysql -u root -p bixe_db < backend-fastapi/sql/pagos_facturas_imagenes.sql
```

La primera crea servicios y pedidos; la segunda, las galerías de fotos, los
pagos y las facturas. Las dos son idempotentes: se pueden ejecutar varias
veces sin duplicar nada.

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

## Pagos y facturación

Todo ocurre en una sola página: **`/pago/:pedidoId`**. A la izquierda se ve lo
que se está comprando (con foto, cantidades y desglose de IVA) y a la derecha
se elige el medio de pago. En cuanto se aprueba, la factura aparece ahí mismo,
lista para descargar.

La pasarela es **simulada**: no mueve dinero real ni habla con ningún
proveedor. Las validaciones sí son las de verdad — algoritmo de Luhn, vigencia
de la tarjeta, longitud del CVV según la marca y formato del celular.

### Medios de pago y datos de prueba

| Medio | Dato | Qué hace |
|---|---|---|
| Tarjeta | `4242 4242 4242 4242` | Aprueba |
| Tarjeta | `5555 5555 5555 4444` | Aprueba (Mastercard) |
| Tarjeta | `4000 0000 0000 9995` | Fondos insuficientes |
| Tarjeta | `4000 0000 0000 0002` | La rechaza el banco emisor |
| Tarjeta | `4000 0000 0000 0069` | Tarjeta vencida |
| PSE | Documento `1036425871` | Aprueba |
| PSE | Documento `10000000` | El banco rechaza el débito |
| Nequi | Celular `3012345678` | Aprueba |
| Nequi | Celular `3000000000` | Sin saldo |

La página trae un botón para rellenar cada uno de estos datos sin escribirlos.

Solo se guardan **la entidad** (marca de la tarjeta o banco) y **los cuatro
últimos dígitos** del identificador. El número completo de la tarjeta y el CVV
no se almacenan en ningún momento.

Cuando el pago se aprueba se emite la factura con consecutivo automático
(`BIXE-000001`, `BIXE-000002`…), descargable en PDF desde la propia página, el
panel del cliente y el del administrador. Como los precios del catálogo ya
incluyen IVA, la factura **no suma nada al total**: descompone cuánto de lo que
pagó el cliente corresponde al impuesto del 19%.

Pago, factura y actualización del pedido ocurren en la misma transacción.

## Galería de fotos

Tanto los **productos** como los **servicios** admiten hasta **8 fotos**
además de la portada. La portada (`imagen_url`) es la que sale en la tarjeta
del catálogo; las demás viven en `producto_imagenes` y `servicio_imagenes`.

- En un **modelo** se ven en la ficha (`/modelos/:id`), con miniaturas y flechas.
- En un **servicio** se ven al pulsar su tarjeta en `/servicios`, en un detalle
  que muestra además la descripción larga.

Para cargarlas: panel → Productos o Servicios → Editar → *Galería*. Se pueden
elegir varias a la vez o arrastrarlas.

### Ilustraciones de los servicios

Los seis servicios de ejemplo traen ilustraciones propias, dibujadas con la
paleta de la marca — no son fotografías ni imágenes de terceros. Los originales
están en `backend-fastapi/assets/servicios/` y sí se versionan; las copias que
sirve la API viven en `uploads/`, que está en el `.gitignore`.

Después de clonar el repositorio, hay que publicarlas una vez:

```
.venv/Scripts/python.exe scripts/publicar_imagenes_servicios.py
```

Ese script copia cada PNG a `uploads/` y lo asigna como portada del servicio
que le corresponde, emparejando por palabras clave del nombre. Los servicios
que ya tengan portada no se tocan, salvo que se pase `--forzar`.

Para rehacer los dibujos (por ejemplo si cambias los colores de la marca):

```
.venv/Scripts/python.exe scripts/generar_imagenes_servicios.py
```

Puedes reemplazar cualquiera de esos PNG por una foto tuya con el mismo
nombre, o simplemente subir la que quieras desde el panel.

## Animación de carga

Hay dos, una para cada espera distinta.

**La cortina de entrada.** Al abrir el sitio, una pantalla en negro monta el
logotipo letra a letra mientras una barra sigue la carga real de la página; en
cuanto todo está listo se parte por la mitad y se abre como un telón. Sale una
sola vez por pestaña, así que moverse entre secciones no la repite. Para verla
otra vez sin abrir una pestaña nueva, se entra con **`?intro`** al final de la
dirección (`http://localhost:5173/?intro`).

La barra no llega al 100% hasta que el navegador termina de cargar la página y
las tipografías. Aun así hay dos redes de seguridad —a los 4 y a los 8
segundos— porque una animación de adorno no puede dejar el sitio inservible si
algo se cuelga. Por lo mismo el avance va con temporizadores y no con
`requestAnimationFrame`: en una pestaña que el navegador no está dibujando, rAF
no se ejecuta nunca y la cortina se quedaría puesta para siempre.

**El mosaico.** Mientras la API responde, el catálogo y los servicios muestran
la silueta de las tarjetas que están por llegar: piezas de distinta altura
repartidas en columnas, con un brillo que las recorre. Al llegar los datos, las
tarjetas reales entran con el mismo movimiento que traían los huecos, así que
el relevo no se nota ni da saltos de maquetación.

Quien tenga activado «reducir movimiento» en su sistema operativo no ve ninguna
de las dos: la cortina ni siquiera se monta y el resto de animaciones quedan en
nada.

## Pruebas de la API

En `backend-fastapi/postman/` hay una colección lista para importar en Postman,
con 57 peticiones repartidas en 10 carpetas, que cubren GET, POST, PUT, PATCH
y DELETE, incluidos los casos de error (401 sin token, 403 sin permiso, 404,
409 y 422).

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
