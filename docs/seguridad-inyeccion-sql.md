# Cómo se resuelve el problema de la inyección SQL

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

---

## 1. El problema

La inyección SQL ocurre cuando **lo que escribe el usuario deja de tratarse
como un dato y pasa a formar parte de la instrucción** que ejecuta la base de
datos.

El caso clásico es el login. Un programador que arma la consulta pegando texto
escribiría algo así:

```python
# ESTO ESTÁ MAL. No existe en BIXE; se pone solo para explicar el ataque.
consulta = ("SELECT * FROM usuarios "
            f"WHERE email = '{email}' AND clave = '{clave}'")
```

Si el usuario escribe un correo normal, funciona:

```sql
SELECT * FROM usuarios WHERE email = 'ana@bixe.com' AND clave = 'Bixe2026*'
```

Pero si escribe **`' OR '1'='1' --`** en el campo del correo, lo que llega a la
base es:

```sql
SELECT * FROM usuarios WHERE email = '' OR '1'='1' --' AND clave = '...'
```

Y ahí pasan tres cosas:

1. La comilla `'` **cierra** el texto antes de tiempo.
2. `OR '1'='1'` es una condición **siempre verdadera**.
3. `--` convierte el resto de la línea en un **comentario**, así que la
   comprobación de la contraseña desaparece.

Resultado: la consulta devuelve el primer usuario de la tabla —normalmente el
administrador— y el atacante entra **sin saber ninguna contraseña**.

---

## 2. FORMA 1 — Escalonar el login (frontend)

> Separar el inicio de sesión en **dos formularios**: primero el correo,
> después la contraseña.

### Por qué funciona

Con un solo formulario, la tentación es resolverlo con **una sola consulta** que
pregunta las dos cosas a la vez:

```sql
SELECT * FROM usuarios WHERE email = ? AND clave = ?
```

Esa consulta es justo la que permite el ataque de arriba, porque la contraseña
entra en el SQL.

Al escalonarlo, el proceso se parte en dos y **la contraseña deja de aparecer en
ninguna consulta**:

| Paso | Qué se hace | ¿Toca la base de datos? |
|---|---|---|
| 1 | Se recoge el correo y se identifica al usuario | Sí: `WHERE email = ?` |
| 2 | Se compara la contraseña contra el hash guardado | **No**: se hace en Python |

Por el campo de la contraseña ya no hay nada que inyectar, porque ese campo no
llega a la base de datos: llega a una función de comparación de hashes.

### Cómo está hecho en BIXE

**En el frontend** — `frontend/src/components/Login.jsx` presenta dos pantallas.
La primera pide el correo y valida su formato. La segunda muestra ese correo
—con un botón para cambiarlo— y pide la contraseña.

```jsx
const PASO_CORREO = 'correo';
const PASO_CONTRASENA = 'contrasena';

const continuarConElCorreo = (e) => {
  e.preventDefault();
  const error = validarCampo('email', datos.email);
  setErrores({ email: error });
  if (error) return;
  setPaso(PASO_CONTRASENA);   // se pasa al segundo formulario
};
```

**En el backend** — `app/routers/auth.py` hace exactamente los dos pasos:

```python
async def iniciar_sesion(sesion: SesionDep, credenciales: Credenciales):
    # Paso 1: identificar por correo. Aquí sí hay consulta.
    usuario = await crud_usuarios.obtener_por_email(sesion, credenciales.email)

    # Paso 2: comparar la contraseña. Aquí NO hay consulta.
    if usuario is None or not verificar_contrasena(
        credenciales.contrasena, usuario.contrasena_hash
    ):
        raise NoAutenticado("Correo o contraseña incorrectos.")
```

Y la consulta del paso 1 busca **solo por correo**:

```python
async def obtener_por_email(sesion: AsyncSession, email: str) -> Usuario | None:
    return await sesion.scalar(select(Usuario).where(Usuario.email == email))
```

### Dos detalles importantes

**El paso 1 no le pregunta al servidor si el correo existe.** Es tentador hacer
que el botón «Continuar» consulte al backend, pero sería cambiar un agujero por
otro: cualquiera podría averiguar qué correos están registrados probándolos uno
por uno (*enumeración de usuarios*). Aquí el paso 1 solo valida el formato; las
dos credenciales viajan juntas en **una sola petición** al pulsar «Iniciar
sesión».

**El mensaje de error es el mismo en los dos casos.** Si el correo no existe y
si la contraseña está mal, la respuesta es idéntica: *«Correo o contraseña
incorrectos.»* Hay una prueba automática que lo verifica.

---

## 3. FORMA 2 — Consulta preparada (backend)

> El valor que escribe el usuario **viaja aparte** de la instrucción SQL.

### La idea

En lugar de pegar el valor dentro del texto de la consulta, se deja un **hueco**
y se manda el valor por separado:

```sql
SELECT * FROM usuarios WHERE cod_usuario = ? AND clave = ?
```

La base de datos recibe dos cosas distintas:

1. La **instrucción**, con sus huecos. La analiza y decide el plan de ejecución
   **antes** de conocer los valores.
2. Los **valores**, que entran ya en los huecos, como datos.

Como la instrucción ya está compilada cuando llegan los valores, **lo que venga
en un valor no puede cambiar la estructura de la consulta**. Si alguien manda
`' OR '1'='1`, la base busca literalmente a un usuario cuyo correo *sea ese
texto raro*, no encuentra ninguno y devuelve cero filas.

### En Java (lo que se ve en clase)

```java
String sql = "SELECT * FROM usuario WHERE cod_usuario = ? AND clave = ?";
PreparedStatement ps = conexion.prepareStatement(sql);
ps.setString(1, codigo);   // el valor entra en el primer hueco
ps.setString(2, clave);    // el valor entra en el segundo
ResultSet rs = ps.executeQuery();
```

Lo que hace `setString()` es precisamente eso: entregar el valor **por el canal
de los datos**, no por el del texto.

### En BIXE (Python + SQLAlchemy)

SQLAlchemy prepara **todas** las consultas automáticamente. No hay que acordarse
de hacerlo: es el comportamiento por defecto del ORM.

```python
select(Usuario).where(Usuario.email == email)
```

Esa línea produce, según el motor:

| Motor | SQL que se envía | Valor |
|---|---|---|
| MySQL (local, XAMPP) | `WHERE usuarios.email = %s` | aparte |
| PostgreSQL (Neon, nube) | `WHERE usuarios.email = %(email_1)s` | aparte |
| SQLite (pruebas) | `WHERE usuarios.email = ?` | aparte |

El `?` de SQLite es literalmente el mismo `?` del ejemplo de clase.

### Demostración con una prueba

`tests/test_inyeccion_sql.py` lo comprueba contra los tres motores:

```python
carga = "' OR '1'='1"

consulta = select(Usuario).where(Usuario.email == carga)
compilada = consulta.compile(dialect=dialecto)

# La instrucción lleva un hueco, no el texto del atacante.
assert carga not in str(compilada)

# Y el texto del atacante está donde tiene que estar: entre los valores.
assert carga in list(compilada.params.values())
```

Y la demostración práctica: se crea un producto llamado
`'; DROP TABLE productos; --`, y después de guardarlo **la tabla sigue ahí** y
el nombre se lee tal cual, como texto:

```python
creado = await cliente.post("/api/productos", headers=como_admin,
                            json={"nombre": "'; DROP TABLE productos; --", ...})
assert creado.status_code == 201

listado = await cliente.get("/api/productos")
assert [p["nombre"] for p in listado.json()] == ["'; DROP TABLE productos; --"]
```

Si el valor se hubiera interpretado como código, esa tabla estaría borrada.

---

## 4. Las otras barreras que hay en el camino

Las dos formas anteriores son las que pidió el instructor, pero en BIXE una
carga maliciosa se choca antes con otras dos:

**Validación con Pydantic.** El campo del correo está declarado como `EmailStr`.
Un texto como `' OR '1'='1` no es un correo válido, así que la petición se
rechaza con un **422** sin llegar siquiera a la base de datos. La contraseña
tiene además un `max_length=20`, que corta las cargas largas.

```python
class Credenciales(BaseModel):
    email: EmailStr
    contrasena: str = Field(min_length=1, max_length=20)
```

**Las contraseñas no se guardan.** Lo que hay en la columna `password` es un
hash de **bcrypt**, no la contraseña. Aunque alguien consiguiera volcar la tabla
entera, no obtendría ninguna contraseña utilizable.

---

## 5. Una prueba que vigila el futuro

Las dos formas protegen el código que hay hoy. El riesgo real es que dentro de
tres meses alguien —yo mismo— escriba una consulta a mano para salir del paso.
Por eso hay una prueba que **recorre todos los archivos de `app/`** y falla si
encuentra SQL sin parametrizar:

```python
def test_no_hay_ni_una_consulta_escrita_a_mano_en_toda_la_aplicacion():
    sospechosos = {
        "text(":        "SQL en texto plano; usa select() del ORM",
        "execute(f":    "consulta construida con f-string",
        'execute("':    "consulta escrita a mano",
        "executescript": "varias instrucciones en una sola llamada",
    }
    ...
    assert not hallazgos, "SQL sin parametrizar:\n" + "\n".join(hallazgos)
```

Esta prueba corre en GitHub Actions en cada subida. Si alguien introduce una
consulta concatenada, el commit sale en rojo y el despliegue no se ejecuta.

**Estado actual: cero consultas escritas a mano en todo el proyecto.**

---

## 6. Resumen para la sustentación

| | Dónde | Qué hace | Archivo |
|---|---|---|---|
| **Forma 1** | Frontend + backend | Login en dos pasos: la contraseña nunca entra en una consulta | `Login.jsx`, `routers/auth.py` |
| **Forma 2** | Backend | Consulta preparada: el valor viaja aparte de la instrucción | todo `app/crud/` |
| Extra | Backend | Pydantic rechaza lo que no es un correo (422) | `schemas/auth.py` |
| Extra | Backend | Las contraseñas se guardan como hash bcrypt | `core/seguridad.py` |
| Extra | CI | Una prueba impide que vuelva a entrar SQL a mano | `tests/test_inyeccion_sql.py` |

**La frase corta:** *«Se resuelve por dos caminos. En el frontend, escalonando
el login en dos formularios, de modo que la contraseña nunca llega a formar
parte de una consulta. En el backend, con consultas preparadas: SQLAlchemy manda
`WHERE email = ?` y el valor por separado, así que la base de datos nunca
interpreta como código lo que escribió el usuario.»*
