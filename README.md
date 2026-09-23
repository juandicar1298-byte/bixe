# BIXE — Catálogo de motos y autos

Proyecto del Tecnólogo en Análisis y Desarrollo de Software (SENA, Centro de
Servicios y Gestión Empresarial). Ficha 3406211.

Aplicación full stack: catálogo de vehículos, servicios de taller, carrito con
pedidos, pasarela de pago y facturación, módulo de ventas con reportes en PDF
y Excel, dashboards por rol, PQR y un chatbot con Inteligencia Artificial.

---

## Estructura

```
REACT/
├── frontend/           React 19 + Vite + Tailwind 4
├── backend-fastapi/    API en Python + FastAPI                    ← la activa
├── backend/            API del TERCER avance (Node.js + Express)  ← se conserva
└── evidencias/         Guiones que generan las capturas de la lista de chequeo
```

El tercer avance pedía un backend en Node/Express y del cuarto en adelante se
pide en FastAPI. Los dos están en el repositorio: `backend/` queda como
evidencia del entregable anterior y `backend-fastapi/` es el que consume el
frontend hoy. Para cambiar de uno a otro basta con editar `VITE_API_URL` en
`frontend/.env`.

---

## Puesta en marcha

Hacen falta **MySQL/MariaDB**, **Node.js 18+** y **Python 3.12+**.

### 1. Base de datos

Enciende MySQL (en XAMPP, el botón **Start** de MySQL). Después crea la base
`bixe_db`, carga el esquema y aplica las tres migraciones **en este orden**,
desde PowerShell en la carpeta del proyecto:

```
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root bixe_db < backend\sql\servicios_pedidos.sql"
```

```
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root bixe_db < backend-fastapi\sql\pagos_facturas_imagenes.sql"
```

```
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root bixe_db < backend-fastapi\sql\codigo_recuperacion.sql"
```

```
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root bixe_db < backend-fastapi\sql\quinto_avance.sql"
```

Van envueltas en `cmd /c` por dos motivos: **PowerShell no admite `<`** para
pasarle un archivo a un programa, y `mysql` no está en el PATH de Windows, así
que hay que llamarlo por su ruta de XAMPP. Si tu usuario `root` tiene
contraseña, añade `-p` después de `-u root` y te la pedirá.

La primera crea servicios y pedidos; la segunda, las galerías de fotos, los
pagos y las facturas; la tercera, el código de verificación para recuperar la
contraseña; la cuarta, las ventas, las PQR y las conversaciones del chatbot.
Las cuatro son idempotentes: se pueden ejecutar varias veces sin duplicar
nada. La última, además, da de alta las ventas de los pedidos que ya
estuvieran pagados, para que los informes no arranquen vacíos.

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
| `PROVEEDOR_IA` | backend-fastapi | `groq`, `openai`, `anthropic` o vacío |
| `IA_API_KEY` | backend-fastapi | Clave del servicio de IA. En Groq se saca en console.groq.com/keys |
| `IA_MODELO` | backend-fastapi | Modelo a usar; vacío para el que trae por defecto |
| `VITE_API_URL` | frontend | A qué backend apunta la web |

### Correo de recuperación

Mientras falte alguno de `SMTP_HOST`, `SMTP_USUARIO` o `SMTP_PASSWORD`, la API
**no envía nada**: escribe el código y el enlace de recuperación en el log del
servidor y los devuelve en la respuesta (solo con `ENTORNO=desarrollo`), de
modo que el flujo se puede probar completo sin servidor de correo. La pantalla
de recuperación enseña ahí mismo el código en ese caso.

Para activarlo con Gmail hace falta una *contraseña de aplicación*, que **no
es la contraseña de la cuenta**: se crea en Cuenta de Google → Seguridad →
Verificación en dos pasos → Contraseñas de aplicación, y son 16 letras.

Con eso a mano, un solo comando lo deja todo listo:

```
.venv/Scripts/python.exe scripts/configurar_correo.py
```

Pide la contraseña sin mostrarla en pantalla, le quita los espacios con los
que Google la enseña, la escribe en el `.env` sin tocar nada más y a
continuación se conecta a Gmail y manda un correo de prueba a la propia
cuenta. Hay que ejecutarlo en una terminal de verdad, porque tiene que
preguntar.

Lo único que hay que rellenar a mano es `SMTP_USUARIO` con la cuenta desde la
que saldrán los correos. El resto (`SMTP_HOST=smtp.gmail.com`,
`SMTP_PUERTO=587`, `SMTP_TLS=true`) ya viene en el `.env.example`, y
`SMTP_REMITENTE` se deja **vacío** a propósito: Gmail exige que el remitente
sea la misma cuenta con la que se inicia sesión. Solo tiene sentido rellenarlo
si tienes un dominio propio.

Para comprobar una configuración que ya está puesta, sin volver a escribirla:

```
.venv/Scripts/python.exe scripts/probar_correo.py
```

```
.venv/Scripts/python.exe scripts/probar_correo.py tucuenta@gmail.com
```

El primero se conecta e inicia sesión sin enviar nada; el segundo manda además
un mensaje de prueba. Enseña la configuración (la contraseña nunca: solo
cuántos caracteres tiene), avisa de los errores típicos antes de conectarse y
traduce el fallo de SMTP a algo que se pueda arreglar.

### Cómo se recupera la contraseña

Son tres pasos, todos en la misma pantalla (`/login` → «¿Olvidaste tu
contraseña?»), sin cambiar de página:

1. **El correo.** `POST /api/auth/recuperar` emite un **código de seis
   dígitos** y lo envía. La respuesta es siempre la misma exista o no la
   cuenta, para que el formulario no sirva para averiguar qué correos están
   registrados.
2. **El código.** `POST /api/auth/verificar-codigo` lo cambia por un token de
   un solo uso. Las seis casillas saltan solas al escribir y admiten pegar el
   código entero.
3. **La contraseña nueva.** `POST /api/auth/restablecer` la fija con ese token.

Seis dígitos son solo un millón de combinaciones, así que el código se apoya en
cuatro defensas: caduca a los 30 minutos, sirve una sola vez, **a los cinco
intentos fallidos queda inutilizado** y pedir uno nuevo invalida el anterior.
Además no se emiten dos códigos al mismo usuario con menos de un minuto de
diferencia, para que nadie use el formulario para inundar una bandeja ajena;
ese freno actúa en silencio, porque anunciarlo también delataría que la cuenta
existe.

El correo lleva el código en el asunto —así se lee en la notificación del móvil
sin abrirlo— y además un botón que entra directamente, para quien prefiera no
copiar nada.

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

## Ventas y reportes

Un **pedido** es el carrito que confirma el cliente; una **venta** es la
operación comercial que queda registrada cuando ese pedido se paga, o cuando
alguien del taller la registra a mano desde el mostrador. Son cosas distintas:
un pedido puede quedarse pendiente o cancelarse y no llegar nunca a ser venta,
y por eso las ventas viven en su propia tabla y no se derivan de los pedidos.

La venta de la web se crea sola, en el mismo commit que el pago y la factura.
La de mostrador se registra desde **Panel → Ventas → Nueva venta**, y admite
descuento por línea. En los dos casos los precios los relee el servidor del
catálogo: el navegador solo dice qué se vende y cuánto.

### El historial

En **Panel → Ventas** se filtra por fecha, cliente, producto, servicio, estado,
canal, rango de valor y texto libre (número de venta, nombre, documento o
correo). Buscar por artículo mira dentro del detalle con un `EXISTS`, no con un
`JOIN`: con el `JOIN`, una venta de dos líneas saldría repetida en la lista.

Una venta no se borra. Se **anula**, y entonces sigue apareciendo en el
historial pero deja de sumar en los reportes y en las gráficas. Solo el
administrador puede hacerlo.

### El reporte diario

En la misma pantalla se elige una fecha y se descarga en **PDF** o en **Excel**.
Los dos salen de los mismos datos, así que no pueden contar cosas distintas.

- El **PDF** va apaisado, con el membrete de BIXE, una fila por venta y el
  cuadre del día al final.
- El **Excel** trae **autofiltro** y la fila de encabezado fija, que es justo
  para lo que pide el requerimiento que exista la exportación: poder filtrar y
  analizar después.

Sobre las cifras: como los precios del catálogo ya incluyen IVA, la venta no le
suma nada al total. **«Subtotal» es la base gravable** (lo que queda al quitarle
el impuesto) e **«impuesto» es el IVA que ya venía dentro**, de modo que siempre
se cumple `subtotal + impuesto = total`. Es el mismo criterio de la factura.

---

## Dashboards

Tres, según el rol, y ninguno con cifras escritas en el frontend: todas salen de
`/api/estadisticas/ventas` o de `/api/estadisticas/mi-panel`, que las calculan
en la base de datos.

| Rol | Qué ve |
|---|---|
| Administrador | Todo: indicadores, gráficas, más vendidos, facturación y PQR |
| Empleado | Lo mismo, pero no puede anular ventas ni entrar a usuarios |
| Cliente | Solo lo suyo: cuánto ha comprado, en qué y sus PQR |

Los filtros —rango de fechas, agrupación por día o por mes, canal, producto y
servicio— gobiernan a la vez las tarjetas y las dos gráficas.

Las gráficas van **separadas a propósito**: los ingresos en barras y la cantidad
de ventas en una línea. Juntarlas obligaría a poner un segundo eje vertical, que
es la forma más fácil de hacer que dos series parezcan relacionadas sin estarlo.
La serie rellena con ceros los periodos sin ventas; sin eso, la línea uniría el
lunes con el jueves como si el martes y el miércoles no existieran.

El panel del cliente **no acepta un identificador por parámetro**: lo saca del
token, así que nadie puede ver las cifras de otra persona cambiando un número en
la URL.

---

## PQR

Peticiones, quejas, reclamos y sugerencias, en **/pqr**. Puede radicar tanto un
cliente con sesión como alguien que llega sin cuenta; en ese caso indica un
nombre y un correo de contacto. Siempre se devuelve un **radicado**
(`PQR-000001`) con el que se consulta el estado sin necesidad de iniciar sesión.

Los estados son `pendiente → en proceso → respondida → cerrada`, con
transiciones definidas: una PQR **cerrada no se reabre** —si el cliente insiste,
radica una nueva y queda el rastro de las dos— y ninguna se da por respondida
sin tener respuesta.

El personal las atiende en **Panel → PQR**; el cliente ve las suyas, con la
respuesta del taller, en **Panel → Mis PQR**. Si un cliente pide una PQR ajena
recibe el mismo 404 que si no existiera, para que nadie averigüe qué radicados
hay probando números.

---

## Chatbot con Inteligencia Artificial

Un botón flotante en todas las páginas. Resuelve dudas frecuentes, orienta sobre
los modelos y los servicios, explica cómo comprar y encamina hacia el módulo de
PQR.

Al modelo se le pasa el **catálogo publicado de verdad** —los modelos, los
servicios y sus precios, leídos de la base en cada mensaje— y se le prohíbe
inventar precios, plazos o promociones. La conversación se guarda en
`conversaciones` y `mensajes`, con una clave que el navegador conserva para no
perder el hilo al cambiar de página.

### Configurar la IA

El proyecto usa **Groq**: habla el mismo idioma que la API de OpenAI, responde
rápido y tiene capa gratuita, que para un proyecto de formación es lo que
importa. La clave se saca en **https://console.groq.com/keys**.

```
PROVEEDOR_IA=groq
IA_API_KEY=gsk_...
IA_MODELO=
```

`PROVEEDOR_IA` admite `groq`, `openai` y `anthropic`. Los dos primeros comparten
código —Groq expone la misma API— y solo cambian la dirección y el modelo por
defecto. `IA_MODELO` se puede dejar vacío: en Groq usa `llama-3.3-70b-versatile`.

Para comprobar que quedó bien:

```
.venv/Scripts/python.exe scripts/probar_ia.py
```

Lista los modelos que acepta tu clave, hace una pregunta de prueba y, si algo
falla, dice qué. Distingue los casos que importan: clave rechazada, modelo que
no existe en ese proveedor, cupo agotado o falta de conexión. Si pegaste la
clave de otro proveedor también lo avisa, porque cada uno tiene su prefijo
(`gsk_` en Groq, `sk-` en OpenAI, `sk-ant-` en Anthropic) y es un error fácil
de cometer y difícil de ver. De la clave solo enseña los cuatro primeros
caracteres y cuántos tiene.

**La clave va en el `.env` y en ningún otro sitio.** No está en el código, no se
sube al repositorio, no aparece en las respuestas de la API y del fallo solo se
registra el tipo de excepción, nunca el cuerpo del error, que podría traerla de
vuelta.

**Sin clave el chat sigue funcionando.** Responde con textos preparados a partir
del catálogo real en lugar de quedarse mudo delante de un cliente, y lo mismo
hace si el proveedor falla o tarda demasiado. La insignia de la cabecera del
chat dice en cuál de los dos modos está: «IA» o «Básico».

---

## Despliegue

El proyecto trae lo necesario para llevarlo a **Railway** (o a cualquier sitio
que corra contenedores): un `Dockerfile` en cada carpeta y la configuración de
Nginx para el frontend.

### Backend

`backend-fastapi/Dockerfile` levanta uvicorn en el puerto que indique la
variable `PORT` de la plataforma. Hay que configurarle:

| Variable | Valor |
|---|---|
| `URL_BASE_DATOS` | La que dé el servicio de MySQL de la plataforma |
| `SECRET_KEY` | Una generada, distinta a la de desarrollo |
| `ORIGENES_PERMITIDOS` | `["https://tu-frontend.up.railway.app"]` |
| `ENTORNO` | `produccion` |
| `DEPURACION` | `false` |
| `SMTP_*` e `IA_*` | Las mismas que en local |

Con `DEPURACION=false` se apagan `/docs` y `/redoc`. Para la sustentación
conviene dejarlo en `true`, que es justo lo que el instructor va a querer ver.

Las imágenes subidas desde el panel viven en `uploads/`. En un contenedor eso se
borra en cada despliegue, así que hay que **montar un volumen** en esa ruta si
se quiere que sobrevivan.

### Frontend

`frontend/Dockerfile` compila con Node y sirve el resultado con Nginx.
`VITE_API_URL` **se incrusta al compilar**, no al arrancar, así que va como
argumento de construcción y apunta a la URL pública del backend.

La configuración de Nginx redirige todo a `index.html`: sin eso, entrar directo
a `/modelos` o recargar esa página daría un 404, porque en el disco no existe
ningún archivo con ese nombre —las rutas las resuelve React Router en el
navegador.

### Orden

1. Crear el servicio de MySQL y cargar los cuatro scripts de `sql/`.
2. Desplegar el backend con sus variables y anotar su URL pública.
3. Desplegar el frontend con `VITE_API_URL` apuntando a esa URL.
4. Volver al backend y poner la URL del frontend en `ORIGENES_PERMITIDOS`.

El paso 4 es el que más se olvida: sin él, el navegador bloquea todas las
peticiones por CORS y la web aparece vacía sin dar ningún error visible.

---

## Pruebas de la API

En `backend-fastapi/postman/` hay una colección lista para importar en Postman,
con 90 peticiones repartidas en 14 carpetas, que cubren GET, POST, PUT, PATCH
y DELETE, incluidos los casos de error (401 sin token, 403 sin permiso, 404,
409 y 422). Las cuatro últimas carpetas son las del quinto avance: ventas y
reportes, dashboards, PQR y chatbot.

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
