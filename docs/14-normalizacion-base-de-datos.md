# Normalización de la base de datos

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

La base tiene **18 tablas** y está en **tercera forma normal (3FN)**, con tres
excepciones deliberadas que se explican al final. Esas excepciones no son
descuidos: son la respuesta correcta a un requisito contable, y conviene
llevarlas preparadas porque es justo lo que pregunta un jurado.

---

## 1. Qué es normalizar, en una frase

Repartir los datos en tablas de forma que **cada dato se guarde una sola vez y
en el sitio que le corresponde**. Si el mismo dato está en dos sitios, tarde o
temprano uno de los dos se queda desactualizado.

---

## 2. Primera forma normal (1FN)

> Cada celda guarda **un solo valor**, no una lista. Y cada fila se distingue
> de las demás por una clave primaria.

**Cómo se cumple en BIXE.** Las 18 tablas tienen clave primaria y ningún campo
guarda listas.

El caso que lo enseña mejor son las **fotos de un producto**. Lo incorrecto
sería:

| id_producto | nombre | imagenes |
|---|---|---|
| 1 | Moto Deportiva 650 | `foto1.jpg, foto2.jpg, foto3.jpg` |

Esa celda guarda tres valores. Para buscar un producto por una foto habría que
partir el texto, y borrar una foto sería reescribir la cadena entera. La
solución es una tabla aparte:

```
productos ────< producto_imagenes
                (id_imagen, id_producto, url, descripcion, orden)
```

Una fila por foto. `orden` decide en qué posición sale en la galería. Lo mismo
con `servicio_imagenes` para los servicios.

**La pregunta que te pueden hacer:** *¿y `usuarios.direccion`, que es un texto
largo?* Guarda **una** dirección, no una lista, así que cumple 1FN. Si el
negocio necesitara varias direcciones por cliente (casa, trabajo), habría que
sacar una tabla `direcciones`; hoy no lo necesita.

---

## 3. Segunda forma normal (2FN)

> Cumple 1FN **y** ningún campo depende solo de una parte de la clave primaria.
> Solo tiene sentido preguntárselo a las tablas con **clave primaria
> compuesta** (formada por más de una columna).

**En BIXE solo hay una tabla con clave compuesta: `roles_permisos`.**

```
roles ────< roles_permisos >──── permisos
            PK: (id_rol, id_permiso)
```

Y no tiene **ningún** campo más aparte de esas dos columnas. Al no haber
atributos fuera de la clave, no hay nada que pueda depender de media clave:
cumple 2FN por construcción.

Si en esa tabla se hubiera metido, por ejemplo, `nombre_rol`, sería una
violación de 2FN: `nombre_rol` depende solo de `id_rol`, que es la mitad de la
clave. Por eso el nombre del rol vive en `roles` y aquí solo está el
identificador.

Esta tabla es además la que hace que **los permisos se puedan cambiar sin tocar
el código**: la API pregunta a `roles_permisos` quién puede hacer qué, en vez de
llevar los identificadores de rol escritos a mano.

---

## 4. Tercera forma normal (3FN)

> Cumple 2FN **y** ningún campo depende de otro campo que no sea la clave
> (dependencia transitiva).

**El ejemplo del proyecto.** Un pedido lo hace un cliente. Lo incorrecto sería:

| id_pedido | id_usuario | nombre_cliente | email_cliente | total |
|---|---|---|---|---|

`nombre_cliente` no depende del pedido: depende de `id_usuario`, que a su vez
depende del pedido. Eso es una dependencia transitiva. Y trae un problema
práctico: si el cliente se cambia el correo, hay que ir a corregirlo a todos
sus pedidos, y el que se escape queda mal para siempre.

Lo que hay en BIXE es esto:

```
usuarios ────< pedidos ────< pedido_items
   │              │
   │              ├──── pagos
   │              └──── facturas
   └────< pqr
   └────< conversaciones ────< mensajes
   └────< recuperaciones
   └────< ventas ────< detalle_ventas
```

`pedidos` guarda **solo `id_usuario`**. El nombre y el correo se leen de
`usuarios` con un JOIN cuando hacen falta. El dato vive en un único sitio.

**Otros sitios donde se aplicó la misma regla:**

| Tabla | Guarda la referencia | En vez de copiar |
|---|---|---|
| `usuarios` | `id_rol` | el nombre del rol |
| `producto_imagenes` | `id_producto` | el nombre del producto |
| `mensajes` | `id_conversacion` | los datos del usuario |
| `pagos` | `id_pedido` | el total del pedido |
| `ventas` | `id_cliente`, `id_vendedor` | los nombres de ambos |
| `pqr` | `id_atendido_por` | el nombre del empleado |

---

## 5. Las tres excepciones (esto es lo que te van a preguntar)

Hay tres sitios donde **a propósito** se copia un dato en vez de referenciarlo.
No es un fallo: es la única manera de que los documentos contables sigan siendo
correctos con el paso del tiempo.

### 5.1 `pedido_items` y `detalle_ventas` copian nombre y precio

```
pedido_items (id_item, id_pedido, tipo, id_referencia,
              nombre, imagen_url, precio_unitario, cantidad)
```

`nombre` y `precio_unitario` ya están en `productos`. ¿Por qué repetirlos?

**Porque una factura no puede cambiar.** Si el pedido solo guardara
`id_referencia` y el precio se leyera de `productos`, pasaría esto:

1. El cliente compra una moto el 3 de marzo por $45.000.000 y se le factura.
2. En julio sube el precio a $52.000.000.
3. El cliente abre su factura de marzo… y ahora dice $52.000.000.

La factura habría cambiado sola. Eso, además de estar mal, es ilegal: una
factura emitida es un documento que no se modifica.

Por eso el precio y el nombre se **congelan** en el momento de la compra. A esto
se le llama *snapshot* o dato histórico, y es una desnormalización aceptada y
recomendada en cualquier sistema de facturación. `id_referencia` se conserva
igualmente, para poder saber de qué producto se trataba.

> **Si te preguntan:** «esto viola la 3FN». Respuesta: sí, y está hecho a
> propósito. `precio_unitario` no es el precio *del producto*, es el precio *al
> que se vendió en esta línea*. Visto así, ni siquiera es redundante: es un dato
> distinto que casualmente coincidía el día de la venta.

### 5.2 `ventas` guarda subtotal, impuesto y total

```
ventas (..., subtotal, descuento, impuesto, total, ...)
```

Esos cuatro valores **se podrían calcular** sumando `detalle_ventas`. Guardarlos
es redundancia.

Se guardan por lo mismo de antes: el total de una venta es un valor cerrado. Si
mañana cambia el porcentaje de IVA del 19 % al 21 %, las ventas de este año
tienen que seguir mostrando el 19 % que se cobró. Por eso `facturas` guarda
incluso `porcentaje_iva`: no se lee de una constante del código, se congela en
la fila.

### 5.3 `pqr` guarda nombre y correo de contacto

```
pqr (..., id_usuario, nombre_contacto, email_contacto, ...)
```

Parece duplicado de `usuarios`, pero **una PQR se puede radicar sin tener
cuenta**. En ese caso `id_usuario` va nulo y los únicos datos de contacto son
estos dos. Cuando sí hay sesión iniciada, el servidor los rellena desde la
cuenta e ignora lo que venga del formulario, para que nadie radique a nombre de
otro.

---

## 6. Integridad referencial

Normalizar no sirve de nada si las referencias se pueden quedar apuntando al
vacío. Cada clave foránea declara qué hacer cuando desaparece la fila a la que
apunta:

| Regla | Dónde | Por qué |
|---|---|---|
| `ON DELETE CASCADE` | `pedido_items`, `detalle_ventas`, `producto_imagenes`, `servicio_imagenes`, `mensajes`, `pagos`, `facturas`, `recuperaciones` | Son *partes de* algo. Un ítem sin pedido no significa nada. |
| `ON DELETE SET NULL` | `ventas.id_pedido`, `ventas.id_vendedor`, `pqr.id_usuario`, `pqr.id_atendido_por`, `conversaciones.id_usuario` | La venta **tiene que sobrevivir** aunque se borre el pedido o se dé de baja al vendedor: es un registro contable. |
| Sin regla (restringe) | `usuarios.id_rol`, `pedidos.id_usuario` | No se puede borrar un rol que alguien esté usando, ni un cliente con pedidos. La base lo impide. |

Y las restricciones `UNIQUE` que impiden duplicados reales:

- `usuarios.email` y `usuarios.numero_documento` — una persona, una cuenta.
- `facturas.consecutivo` y `ventas.consecutivo` — la numeración no se repite.
- `facturas.id_pedido` y `ventas.id_pedido` — un pedido no se factura dos veces.
- `pagos.referencia`, `pqr.radicado`, `conversaciones.clave`, `recuperaciones.token`.

---

## 7. Resumen para la sustentación

| Forma | ¿Se cumple? | La frase para decirlo |
|---|---|---|
| **1FN** | Sí | «Ningún campo guarda listas. Las fotos están en `producto_imagenes`, una fila por foto.» |
| **2FN** | Sí | «Solo hay una tabla con clave compuesta, `roles_permisos`, y no tiene más columnas que la clave.» |
| **3FN** | Sí | «`pedidos` guarda `id_usuario`, no el nombre del cliente. El nombre vive solo en `usuarios`.» |
| **Excepciones** | 3, a propósito | «Las líneas de pedido y de venta congelan nombre y precio, porque una factura emitida no puede cambiar de importe.» |
