# Conceptos y principios: respuestas para la sustentación

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

Todos los ejemplos son código real del proyecto, con su archivo indicado. No
hay ninguno inventado: si te piden abrirlo, está ahí.

---

## 1. ¿Qué es una clase?

Una clase es el **molde**: describe qué datos tiene algo y qué sabe hacer. Por
sí sola no guarda información de nadie en concreto.

`app/models/bixe.py`:

```python
class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column("id_producto", primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), index=True)
    categoria: Mapped[str] = mapped_column(String(10), default="moto")
    precio: Mapped[float] = mapped_column(Numeric(12, 2))
    estado: Mapped[str] = mapped_column(String(10), default="activo")
```

Esto dice **cómo es un producto** en BIXE: tiene nombre, categoría, precio y
estado. No dice nada de ninguna moto en particular.

> **En una frase:** *«Una clase es el plano; el objeto es la casa construida con
> ese plano.»*

---

## 2. ¿Qué es un objeto?

Un objeto es **un ejemplar concreto** creado a partir de una clase. Tiene sus
propios valores y ocupa su propio espacio en memoria.

```python
moto = Producto(nombre="Moto Deportiva 650", categoria="moto", precio=45000000)
auto = Producto(nombre="Auto Familiar",      categoria="auto", precio=90000000)
```

`moto` y `auto` son **dos objetos** de la **misma clase**. Comparten la
estructura, no los datos: cambiarle el precio a `moto` no toca a `auto`.

En BIXE, **cada fila de la tabla `productos` se convierte en un objeto
`Producto`** cuando se lee de la base de datos. Si hay 30 motos en el catálogo,
hay 30 objetos.

---

## 3. ¿En qué proceso se convierten las clases en objetos?

**Se llama INSTANCIACIÓN.** Al objeto creado se le dice *instancia* de la clase.

### Los tres pasos

Cuando se escribe `Producto(nombre="Moto Deportiva 650", precio=45000000)`:

| Paso | Qué ocurre | Método responsable |
|---|---|---|
| 1 | Se **reserva memoria** para el objeto vacío | `__new__` |
| 2 | Se **rellenan** sus atributos con los valores dados | `__init__` (el constructor) |
| 3 | Se **devuelve** el objeto ya listo para usar | — |

En Python el constructor se llama **`__init__`**. En Java se llama igual que la
clase; en C# también. Es el método que corre automáticamente en el momento de
crear el objeto.

### Dónde se ve en el proyecto

`app/errores.py` tiene un constructor escrito a mano:

```python
class RecursoNoEncontrado(ErrorDeDominio):
    codigo = "recurso_no_encontrado"

    def __init__(self, recurso: str, identificador: int | str):
        self.recurso = recurso                # ← aquí se rellena la instancia
        self.identificador = identificador
        super().__init__(f"No existe {recurso} con identificador {identificador}.")
```

Y se instancia así, en `app/dependencias.py`:

```python
raise RecursoNoEncontrado("un producto", producto_id)
```

En ese momento nace un objeto nuevo con `recurso = "un producto"` y
`identificador = 7`, por ejemplo.

### El caso especial del ORM

En BIXE hay una segunda vía por la que nacen objetos, y conviene saberla porque
es la que más se usa: **SQLAlchemy instancia solo**.

```python
producto = await sesion.get(Producto, 7)
```

Esa línea consulta la base, recibe una fila de la tabla `productos` y
**construye un objeto `Producto`** con los valores de esa fila. Nadie escribió
`Producto(...)`: lo hizo el ORM por debajo. A eso se le llama *mapeo
objeto-relacional* — traducir filas en objetos y objetos en filas.

> **Si te preguntan «¿en qué proceso se convierten las clases en objetos?»:**
> *«En la instanciación. Se invoca la clase como si fuera una función, Python
> reserva memoria con `__new__` y ejecuta el constructor `__init__`, que rellena
> los atributos de esa instancia. En el proyecto pasa de dos formas: a mano,
> como cuando lanzo un `RecursoNoEncontrado`, y automáticamente, cuando
> SQLAlchemy convierte cada fila de la tabla en un objeto del modelo.»*

---

## 4. Herencia

Una clase **hereda** de otra cuando toma sus atributos y métodos y añade o
cambia lo suyo. Sirve para **no repetir código** y para expresar que algo *es un
tipo de* otra cosa.

### El ejemplo más claro: los errores

`app/errores.py` tiene una jerarquía de tres niveles:

```
Exception  (de Python)
└── ErrorDeDominio          ← la raíz de todos los errores de BIXE
    ├── RecursoNoEncontrado
    ├── NoAutenticado
    ├── PermisoDenegado
    ├── ImagenInvalida
    └── ConflictoDeNegocio
        ├── CorreoYaRegistrado
        ├── DocumentoYaRegistrado
        ├── CarritoVacio
        ├── PedidoYaPagado
        ├── PagoRechazado
        └── TokenDeRecuperacionInvalido
```

```python
class ErrorDeDominio(Exception):
    codigo = "error_de_dominio"

    def __init__(self, mensaje: str):
        self.mensaje = mensaje
        super().__init__(mensaje)          # ← llama al constructor del padre


class ConflictoDeNegocio(ErrorDeDominio):
    codigo = "conflicto_de_negocio"        # ← solo cambia el código


class CorreoYaRegistrado(ConflictoDeNegocio):
    codigo = "correo_ya_registrado"

    def __init__(self, correo: str):
        super().__init__(f"Ya existe una cuenta registrada con el correo {correo}.")
```

`CorreoYaRegistrado` no vuelve a escribir cómo se guarda el mensaje: eso ya está
resuelto tres niveles más arriba. Solo aporta **lo que lo diferencia**.

La palabra clave es **`super()`**: así se llama al constructor del padre desde el
del hijo.

### Otros dos sitios donde hay herencia

**Los esquemas de Pydantic** — `app/schemas/usuario.py`:

```python
class _DatosPersonales(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    # ... los campos comunes

class UsuarioRegistro(_DatosPersonales):   # registro público: el rol lo pone el servidor
    contrasena: Contrasena
    confirmar_contrasena: str

class UsuarioCrear(_DatosPersonales):      # alta desde el panel: aquí sí se elige rol
    contrasena: Contrasena
    rol_id: int
```

Los siete campos personales se escriben **una vez**. Si mañana hay que añadir
«ciudad», se añade en el padre y aparece en los dos hijos.

**En el frontend también hay herencia** — `frontend/src/services/api.js`:

```javascript
export class ErrorDeApi extends Error {
  constructor(mensaje, { estado, codigo, detalles } = {}) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.estado = estado;
    this.codigo = codigo;
  }
}
```

`extends` es el `(Padre)` de Python, y `super()` hace lo mismo.

---

## 5. Polimorfismo

Polimorfismo significa **«muchas formas»**: el mismo nombre o la misma llamada
se comporta distinto según el objeto que haya detrás. Lo importante es que
**quien llama no necesita saber cuál es**.

### Ejemplo 1: los tres medios de pago

`app/schemas/pago.py` define tres clases distintas:

```python
class PagoConTarjeta(_PagoBase):
    metodo: Literal["tarjeta"]
    numero: str
    titular: str
    cvv: str

class PagoConPse(_PagoBase):
    metodo: Literal["pse"]
    banco: str
    numero_documento: str

class PagoConNequi(_PagoBase):
    metodo: Literal["nequi"]
    celular: str

# Una sola puerta de entrada para las tres.
DatosDePago = Annotated[
    Union[PagoConTarjeta, PagoConPse, PagoConNequi],
    Field(discriminator="metodo"),
]
```

El endpoint declara **un solo parámetro**:

```python
async def pagar_pedido(..., datos: DatosDePago):
    pago, factura = await crud_pagos.cobrar(sesion, pedido, datos.model_dump(), ...)
```

Según lo que traiga el campo `metodo`, FastAPI construye un objeto de una clase
u otra, con validaciones completamente distintas — el CVV solo se exige en
tarjeta, el celular solo en Nequi. **El endpoint es el mismo para los tres.**

Y en `app/services/pasarela.py`, el mismo patrón para procesarlos:

```python
_COBRADORES = {
    "tarjeta": _cobrar_con_tarjeta,
    "pse":     _cobrar_con_pse,
    "nequi":   _cobrar_con_nequi,
}

def procesar(datos: dict) -> ResultadoDePago:
    cobrador = _COBRADORES.get(datos["metodo"])
    return cobrador(datos)
```

Tres implementaciones, una sola llamada. Añadir «Daviplata» mañana es escribir
una función más y una línea en el diccionario: **no hay que tocar el endpoint**.

### Ejemplo 2: los proveedores de Inteligencia Artificial

`app/services/asistente.py` hace lo mismo con la IA:

```python
PROVEEDORES = {
    "anthropic": _preguntar_anthropic,
    "openai":    _preguntar_openai,
    "groq":      _preguntar_groq,
}
```

El chatbot llama igual en los tres casos. Cambiar de OpenAI a Groq fue cambiar
una variable de entorno, no el código del chatbot.

### Ejemplo 3: los manejadores de error

`app/main.py`:

```python
@app.exception_handler(RecursoNoEncontrado)
def manejar_no_encontrado(peticion: Request, exc: RecursoNoEncontrado):
    return _respuesta_error(peticion, 404, exc.codigo, exc.mensaje)
```

`exc.codigo` y `exc.mensaje` existen en **todas** las clases de la jerarquía,
porque todas heredan de `ErrorDeDominio`. El manejador no pregunta de qué clase
concreta se trata: usa el atributo y cada subclase pone el suyo. Eso es
polimorfismo por herencia.

---

## 6. Los otros dos pilares

### Encapsulación

Guardar los datos junto a la lógica que los maneja, y **no dejar ver por fuera**
lo que es asunto interno.

```python
class Usuario(Base):
    estado: Mapped[str] = mapped_column(String(10), default="activo")

    @property
    def activo(self) -> bool:
        return self.estado == "activo"
```

Por fuera se pregunta `usuario.activo`. Si mañana «activo» pasa a depender
también de una fecha de vencimiento, se cambia **dentro de la clase** y ningún
otro archivo se entera.

En `pasarela.py` el guion bajo marca lo privado:

```python
def _cobrar_con_tarjeta(datos): ...   # uso interno del módulo
def procesar(datos): ...              # la única puerta pública
```

Y el ejemplo más importante del proyecto: **el número de tarjeta y el CVV no
salen nunca** de ese módulo. Hacia fuera solo viajan la marca y los cuatro
últimos dígitos.

### Abstracción

Quedarse con lo esencial y esconder el mecanismo.

```python
class Base(DeclarativeBase):
    """Base declarativa: reúne los metadatos de todas las tablas."""
```

Heredando de `Base`, cada modelo consigue saber leerse y escribirse en la base
de datos sin que en el proyecto haya una sola línea de SQL. Quien usa
`sesion.get(Producto, 7)` no necesita saber si por debajo hay MySQL o
PostgreSQL — de hecho en BIXE hay los dos: MySQL en local y PostgreSQL en la
nube, con el mismo código.

---

## 7. Utilidad de cada componente del proyecto

### Backend (`backend-fastapi/app/`)

El backend está en capas. **Cada petición las atraviesa en este orden**, y cada
capa tiene una única responsabilidad:

```
Navegador
   ↓
middlewares.py   registra la petición y añade cabeceras de seguridad
   ↓
routers/         la puerta HTTP: ruta, verbo y código de respuesta
   ↓
schemas/         valida lo que entra y da forma a lo que sale (Pydantic)
   ↓
dependencias.py  ¿quién eres? ¿tienes permiso? (JWT y roles)
   ↓
crud/            las reglas del negocio y las consultas
   ↓
models/          las tablas, como clases de Python (SQLAlchemy)
   ↓
Base de datos
```

| Carpeta | Para qué sirve | Ejemplo |
|---|---|---|
| `routers/` | Define las rutas de la API: qué URL, qué verbo, qué código devuelve | `productos.py` publica `GET /api/productos` |
| `schemas/` | Valida la entrada y decide qué se devuelve. **Entrada y salida separadas** | `ProductoCrear` no tiene `id`; `ProductoRespuesta` sí |
| `crud/` | Las reglas del negocio y las consultas a la base | `pedidos.py` relee el precio del servidor para que no lo manipule el navegador |
| `models/` | Las 18 tablas escritas como clases | `class Producto(Base)` |
| `core/` | Lo transversal: configuración, conexión, JWT y hashes | `seguridad.py` crea y valida los tokens |
| `services/` | Lo que habla con el mundo exterior | `correo.py` (SMTP), `pasarela.py` (pagos), `asistente.py` (IA), `factura.py` y `reportes.py` (PDF y Excel) |
| `dependencias.py` | Autenticación y autorización reutilizables | `Administrador`, `GestorDeProductos` |
| `errores.py` | Los errores del negocio, sin saber nada de HTTP | `CarritoVacio` |
| `middlewares.py` | Lo que envuelve **todas** las peticiones | mide el tiempo y pone `X-Peticion-Id` |
| `tests/` | Las 92 pruebas automáticas | `test_inyeccion_sql.py` |

**Por qué está separado así:** si el negocio cambia —por ejemplo, que un pedido
no se pueda cancelar después de pagado— se toca `crud/pedidos.py` y **nada más**.
El router, el esquema y el modelo se quedan como estaban. Eso es el *principio de
responsabilidad única*.

### Frontend (`frontend/src/`)

| Carpeta | Para qué sirve | Ejemplo |
|---|---|---|
| `pages/` | Una por pantalla completa | `Modelos.jsx`, `PaginaPago.jsx` |
| `components/` | Piezas reutilizables que se usan en varias páginas | `Input.jsx`, `Button.jsx`, `ChatBot.jsx` |
| `context/` | Estado compartido por toda la aplicación | `SesionContext` (quién entró), `CarritoContext` |
| `hooks/` | Lógica reutilizable con estado | `useAuth()` da la sesión a cualquier componente |
| `services/` | **El único archivo que habla con la API** | `api.js`, con la URL en `VITE_API_URL` |
| `utils/` | Funciones sueltas sin estado | `formato.js` pone los precios en pesos |
| `assets/` | Imágenes y tipografías | |

**Por qué `services/api.js` está centralizado:** la URL del backend aparece en
**un solo sitio**. Por eso, al desplegar, pasar de `localhost:8000` a
`bixe-api.onrender.com` fue cambiar una variable de entorno — no buscar y
reemplazar por treinta archivos.

---

## 8. Chuleta de respuestas cortas

| Pregunta | Respuesta en una frase |
|---|---|
| ¿Qué es una clase? | El molde que describe qué datos y qué comportamiento tiene algo. En BIXE, `class Producto`. |
| ¿Qué es un objeto? | Un ejemplar concreto de esa clase, con sus propios valores. Cada moto del catálogo es un objeto `Producto`. |
| ¿Cómo se convierte una clase en objeto? | Por **instanciación**: se invoca la clase, Python reserva memoria con `__new__` y ejecuta el constructor `__init__`. |
| ¿Qué es el constructor? | El método que corre automáticamente al crear el objeto y rellena sus atributos. En Python, `__init__`. |
| ¿Qué es la herencia? | Que una clase tome lo de otra y añada lo suyo. `CorreoYaRegistrado` hereda de `ConflictoDeNegocio`, que hereda de `ErrorDeDominio`. |
| ¿Para qué sirve `super()`? | Para llamar al constructor o a un método del padre desde el hijo. |
| ¿Qué es el polimorfismo? | Que la misma llamada se comporte distinto según el objeto. Un solo endpoint de pago atiende tarjeta, PSE y Nequi. |
| ¿Qué es la encapsulación? | Guardar los datos con su lógica y no exponer lo interno. El CVV nunca sale del módulo de la pasarela. |
| ¿Qué es la abstracción? | Usar algo sin saber cómo funciona por dentro. El ORM permite no escribir SQL, y corre igual sobre MySQL que sobre PostgreSQL. |
