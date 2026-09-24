# Comparativa técnica: FastAPI frente a Django REST Framework

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

Este documento no compara los dos marcos en abstracto: compara **lo que costó
hacer BIXE con FastAPI y lo que habría costado con Django REST Framework**, con
los archivos del proyecto delante. Incluye también las tres cosas en las que
Django habría ganado, porque fingir que la elección no tuvo coste no convence a
nadie.

---

## 1. Los dos en una línea

| | FastAPI | Django REST Framework |
|---|---|---|
| Qué es | Un marco para construir APIs | Una capa de API sobre Django, que es un marco web completo |
| Filosofía | Trae lo justo; tú eliges el resto | Trae todo decidido |
| Nació | 2018 | 2011 (Django, 2005) |
| Se apoya en | Starlette + Pydantic | Django + su ORM |

La diferencia de fondo: **Django es una casa amueblada y FastAPI es un solar con
buenos cimientos.** Ninguna de las dos es mejor siempre; depende de si los
muebles que trae Django son los que necesitas.

---

## 2. Asincronía — la razón principal de la elección

BIXE hace tres cosas que consisten en **esperar a otro**: consultar la base de
datos en Neon, enviar correos por SMTP y preguntarle al modelo de IA de Groq.

En FastAPI eso es el comportamiento normal:

```python
async def listar_productos(sesion: SesionDep, ...):
    return await crud_catalogo.listar(sesion, ...)
```

Mientras esa petición espera a Neon, el mismo proceso atiende otras. Con un solo
trabajador —que es lo que da el plan gratuito de Render: `WEB_CONCURRENCY=1`—
eso importa mucho.

El caso más claro es el chatbot. Una respuesta de Groq tarda entre uno y tres
segundos. Con FastAPI, durante esos segundos el servidor sigue sirviendo el
catálogo a todos los demás.

**En Django REST Framework** las vistas son síncronas por tradición. Django
soporta `async def` desde la versión 3.1, pero **el ORM sigue siendo síncrono**:
cada consulta hay que envolverla en `sync_to_async`, o usar la API `a`-prefijada
(`aget`, `acreate`), que no cubre todo. En la práctica se acaba sirviendo con
varios trabajadores síncronos, que consume más memoria — justo lo que escasea en
un plan gratuito de 512 MB.

> **Veredicto:** ventaja clara de FastAPI para este proyecto.

---

## 3. Validación: Pydantic frente a serializers

Las dos herramientas validan. La diferencia está en **de dónde sale la
información**.

**FastAPI + Pydantic** — la validación *es* la anotación de tipo:

```python
class ProductoCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=60)
    categoria: Literal["moto", "auto"] = "moto"
    precio: Precio

    @field_validator("nombre")
    @classmethod
    def sin_espacios_sobrantes(cls, valor: str) -> str:
        return limpiar_espacios(valor)
```

Con eso, FastAPI ya sabe tres cosas a la vez: cómo validar la entrada, qué
documentar en `/docs` y qué tipo tiene `datos.precio` dentro de la función. El
editor autocompleta y avisa de los errores antes de ejecutar.

**Django REST Framework** — el serializer es una clase aparte:

```python
class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ['nombre', 'categoria', 'precio']

    def validate_nombre(self, valor):
        return ' '.join(valor.split())
```

Es más corto cuando se limita a copiar el modelo (`ModelSerializer` deduce los
campos solo), pero el editor no sabe qué tipo tiene `serializer.validated_data`:
es un diccionario. En BIXE hay 14 archivos de esquemas con validaciones de
dominio —contraseña segura, tarjeta no vencida, sin artículos repetidos en el
carrito— y tenerlas tipadas ahorró bastantes errores.

El caso donde Pydantic gana de largo es la **unión discriminada** de los medios
de pago:

```python
DatosDePago = Annotated[
    Union[PagoConTarjeta, PagoConPse, PagoConNequi],
    Field(discriminator="metodo"),
]
```

Un solo endpoint valida tres formas distintas según el campo `metodo`, y los
tres aparecen por separado en la documentación. En DRF esto se resuelve a mano,
con un serializer que mira el tipo y delega.

> **Veredicto:** ventaja de FastAPI, sobre todo por el tipado.

---

## 4. Documentación automática

FastAPI genera **OpenAPI, Swagger UI y ReDoc sin instalar nada**. En BIXE solo
hubo que poner los textos:

```python
app = FastAPI(
    title=configuracion.nombre_app,
    openapi_tags=TAGS,     # 12 etiquetas con descripción
    version="2.0.0",
)
```

El resultado está en vivo en https://bixe-api.onrender.com/docs, con los
ejemplos de cada esquema y el botón «Authorize» funcionando.

En DRF, la documentación decente exige instalar **drf-spectacular** y anotar las
vistas con `@extend_schema`. Funciona bien, pero es una dependencia más y trabajo
extra.

> **Veredicto:** ventaja de FastAPI.

---

## 5. Donde Django habría ganado

Aquí está la parte honesta de la comparación.

### 5.1 El panel de administración

Esto es lo más caro que costó elegir FastAPI. Django trae un **panel de
administración generado automáticamente**: se registra el modelo y ya hay
pantallas de listar, crear, editar, borrar, buscar y filtrar.

```python
# En Django, esto basta para tener un CRUD completo con interfaz.
admin.site.register(Producto)
```

En BIXE hubo que escribir a mano **seis componentes de gestión**:

```
GestionProductos.jsx   GestionUsuarios.jsx   GestionVentas.jsx
GestionServicios.jsx   GestionPedidos.jsx    GestionPqr.jsx
```

Son varios cientos de líneas de React que Django habría dado gratis.

**El matiz:** el panel de Django es para el personal técnico y tiene su propia
estética, que no se parece en nada al resto de BIXE. Como aquí el panel de
administración **forma parte de la misma aplicación que ve el cliente** y comparte
diseño, tarde o temprano habría habido que rehacerlo igual. Pero para un
proyecto donde el panel puede ser feo, Django ahorra semanas.

### 5.2 Las migraciones

Django trae migraciones versionadas de serie:

```bash
python manage.py makemigrations
python manage.py migrate
```

Cada cambio del modelo queda en un archivo numerado, se aplica en orden y se
puede deshacer.

BIXE usa `Base.metadata.create_all()`, que **solo crea las tablas que faltan**:
no sabe modificar una columna existente. Por eso en `backend-fastapi/sql/` hay
tres guiones escritos a mano (`codigo_recuperacion.sql`,
`pagos_facturas_imagenes.sql`, `quinto_avance.sql`) que hubo que ejecutar
manualmente en cada avance.

**Esto es una debilidad real del proyecto.** La solución en el mundo FastAPI es
**Alembic**, que hace lo mismo que las migraciones de Django, pero hay que
instalarlo y configurarlo aparte. En Django viene puesto.

### 5.3 Autenticación y permisos

Django trae usuarios, grupos, permisos y sesiones ya hechos. En BIXE hubo que
construir:

- el hash de contraseñas (`core/seguridad.py`),
- la emisión y verificación del JWT,
- las tablas `roles`, `permisos` y `roles_permisos`,
- las dependencias `ExigirPermiso` y `ExigirRol`.

**El matiz:** construirlo enseñó cómo funciona por dentro, que para un proyecto
formativo vale mucho. Y el sistema que salió se ajusta exactamente a lo que
pedía el enunciado —tres roles con permisos consultados en base de datos, no
escritos en el código—. Pero si el objetivo fuera entregar rápido, Django lo
tenía resuelto.

---

## 6. Rendimiento

FastAPI es más rápido, aunque conviene decir cuánto y por qué. En las pruebas
públicas (TechEmpower), FastAPI mueve del orden de **2 a 3 veces más peticiones
por segundo** que Django REST Framework en cargas con espera de entrada/salida.

La razón no es que Python sea más rápido en un caso que en otro: es que FastAPI
corre sobre **ASGI** con un bucle de eventos, y mientras una petición espera a la
base de datos, el mismo proceso atiende otras. DRF sobre **WSGI** ocupa un
trabajador entero durante toda la espera.

**Para BIXE, con tráfico de proyecto formativo, esto no se nota.** Lo que sí se
nota es el consumo de memoria en Render: un solo proceso asíncrono cabe holgado
en los 512 MB del plan gratuito.

---

## 7. Cuadro resumen

| Criterio | FastAPI | Django REST | Para BIXE |
|---|---|---|---|
| Asincronía nativa | ✅ de serie | ⚠️ parcial, ORM síncrono | **FastAPI** — chatbot, correo y Neon |
| Validación tipada | ✅ Pydantic | ⚠️ serializers sin tipado | **FastAPI** |
| Documentación automática | ✅ incluida | ⚠️ requiere drf-spectacular | **FastAPI** |
| Rendimiento con espera de E/S | ✅ 2–3× | — | FastAPI (irrelevante a esta escala) |
| Panel de administración | ❌ no trae | ✅ generado solo | **Django** |
| Migraciones | ❌ requiere Alembic | ✅ incluidas | **Django** |
| Autenticación y permisos | ❌ a mano | ✅ incluidos | **Django** (aunque hacerlo enseñó más) |
| Curva de aprendizaje | ✅ suave | ⚠️ hay que aprender Django entero | FastAPI |
| Madurez del ecosistema | ⚠️ más joven | ✅ 20 años | Django |

---

## 8. Conclusión

**FastAPI fue la elección correcta para BIXE**, por tres razones concretas: el
chatbot y el envío de correos son operaciones de espera que se benefician de
`async/await`, la validación tipada con Pydantic sostiene 14 archivos de
esquemas con reglas de dominio, y la documentación en `/docs` salió gratis y es
lo que se enseña en la sustentación.

**El precio fueron dos cosas:** los seis paneles de gestión que hubo que escribir
a mano, y no tener migraciones versionadas —lo que obligó a ejecutar tres
guiones SQL a mano a lo largo del proyecto—.

**Si BIXE creciera**, lo primero que haría sería **añadir Alembic**: es la única
carencia de las tres que sigue doliendo, porque cada cambio del modelo obliga
hoy a escribir el SQL a mano y a acordarse de ejecutarlo en Neon.

> **Para la sustentación:** *«Elegí FastAPI porque el proyecto tiene tres
> operaciones que consisten en esperar —la base en Neon, el correo y la IA— y
> con async las atiende un solo proceso, que es lo que cabe en el plan gratuito
> de Render. A cambio perdí el panel de administración de Django, que me habría
> ahorrado seis componentes de React, y las migraciones, que tuve que suplir con
> guiones SQL a mano. Si el proyecto siguiera, lo siguiente sería meter
> Alembic.»*
