# Pasarela de pago

**Proyecto BIXE** · Ficha 3406211 · Juan Diego Cartagena Tuberquia

---

## 1. Qué es y qué no es

BIXE tiene una pasarela **simulada**. Eso significa:

| Sí es real | No es real |
|---|---|
| La validación del número con el **algoritmo de Luhn** | El movimiento de dinero |
| La detección de la marca por el prefijo | La conexión con un banco |
| El control de vigencia y de CVV | La autorización de un emisor |
| La emisión de la factura con IVA discriminado | — |
| La regla de no guardar datos sensibles | — |

**Por qué simulada y no Wompi o Mercado Pago:** conectarse a una pasarela de
verdad exige un NIT, una cuenta de comercio y un contrato. Para un proyecto
formativo no es posible. Lo que sí se reproduce es **el flujo completo y el
comportamiento**, que es lo que se está evaluando.

El endpoint lo dice claramente en su propia documentación (`/docs`), para que
nadie se confunda:

> **Es una pasarela simulada**: no mueve dinero real. Tarjetas de prueba —
> `4242 4242 4242 4242` aprueba, `4000 0000 0000 0002` la rechaza el banco y
> `4000 0000 0000 9995` no tiene fondos.

Es la misma convención que usan Stripe y Mercado Pago en sus entornos de prueba.

---

## 2. Los tres medios de pago

`app/services/pasarela.py`

| Medio | Qué pide | Qué se guarda |
|---|---|---|
| **Tarjeta** | número, titular, mes, año, CVV | marca (`visa`, `mastercard`…) + 4 últimos dígitos |
| **PSE** | banco, tipo de persona, documento | banco + 4 últimos del documento |
| **Nequi** | celular | `nequi` + 4 últimos del celular |

PSE trae la lista de bancos desde el servidor (`GET /api/pagos/metodos`), no
escrita en el frontend.

---

## 3. El algoritmo de Luhn

Es la comprobación que usan de verdad todas las pasarelas para descartar números
mal escritos **antes** de mandarlos al banco.

```python
def pasa_luhn(numero: str) -> bool:
    """Se recorre de derecha a izquierda duplicando una cifra sí y otra no;
    si el resultado pasa de 9 se le restan 9. La suma debe ser múltiplo de 10."""
    suma = 0
    for posicion, caracter in enumerate(reversed(numero)):
        cifra = int(caracter)
        if posicion % 2 == 1:
            cifra *= 2
            if cifra > 9:
                cifra -= 9
        suma += cifra
    return suma % 10 == 0
```

Cambiar un solo dígito de una tarjeta válida hace que deje de cumplirse. Hay
pruebas que lo verifican en los dos sentidos.

---

## 4. Lo que NO se guarda (lo más importante)

Esta es la parte que hay que saber defender.

```python
class Pago(Base):
    """Del número de tarjeta solo se conservan los cuatro últimos dígitos y la
    marca. El número completo y el CVV no se guardan en ningún momento."""

    referencia:     Mapped[str]         # BIXE-A3F9...
    metodo:         Mapped[str]         # tarjeta | pse | nequi
    marca:          Mapped[str | None]  # visa | bancolombia | nequi
    ultimos_cuatro: Mapped[str | None]  # "4242"
    titular:        Mapped[str | None]
    monto:          Mapped[float]
    estado:         Mapped[str]         # aprobado | rechazado
    motivo_rechazo: Mapped[str | None]
```

**La tabla no tiene ninguna columna donde meter el número completo ni el CVV.**
No es que no se escriban: es que no hay dónde. Una prueba lo comprueba:

```python
async def test_el_cvv_no_se_guarda_en_la_base_de_datos():
    columnas = set(Pago.__table__.columns.keys())
    assert "cvv" not in columnas
    assert "numero" not in columnas
```

Esto no es un capricho: el estándar **PCI-DSS** prohíbe almacenar el CVV después
de autorizar la operación, incluso cifrado.

Los datos sensibles entran en `pasarela.py`, se usan para decidir, y **no salen
de ahí**. Hacia fuera solo viaja un `ResultadoDePago` con la marca y los cuatro
dígitos. Eso es encapsulación aplicada a un problema real.

---

## 5. El flujo completo

```
1. El cliente confirma el carrito            POST /api/pedidos          → 201
     El servidor RELEE los precios del catálogo. El navegador no los manda.

2. Consulta los medios disponibles           GET  /api/pagos/metodos    → 200

3. Paga                                      POST /api/pedidos/7/pago   → 201
     ├─ Pydantic valida según el medio (unión discriminada)
     ├─ pasarela.procesar() decide: aprobado o rechazado
     ├─ Si aprueba → se emite la factura y el pedido queda "pagado"
     └─ Si rechaza → se registra el intento con su motivo. NO hay factura.

4. Descarga la factura                       GET  /api/pedidos/7/factura.pdf
```

**Detalle que conviene mencionar:** un pago rechazado responde **201, no un
error**. Un rechazo no es un fallo del sistema: la pasarela funcionó
perfectamente y contestó que no. El cuerpo lleva `aprobado: false` y el motivo.
Es como responde una pasarela de verdad.

---

## 6. La factura

Los precios del catálogo **ya incluyen IVA**, así que la factura no suma nada:
**discrimina** cuánto de ese total es impuesto.

```
total          = 45.000.000       (lo que paga el cliente)
base_gravable  = 37.815.126       (total ÷ 1,19)
valor_iva      =  7.184.874       (la diferencia)
                 ───────────
base + IVA     = 45.000.000  ✓
```

La fila guarda también `porcentaje_iva`. Si mañana el IVA sube al 21 %, las
facturas de este año siguen mostrando el 19 % que se cobró: el dato está
congelado, no se lee de una constante del código.

La numeración es **consecutiva y única**: `BIXE-000001`, `BIXE-000002`… con una
restricción `UNIQUE` en la base que impide repetirla, y otra en `id_pedido` que
impide facturar dos veces el mismo pedido.

---

## 7. Tarjetas de prueba

Todas pasan Luhn, así que sirven para enseñar tanto el camino feliz como cada
motivo de rechazo.

| Número | Qué pasa |
|---|---|
| `4242 4242 4242 4242` | Aprueba (Visa) |
| `5555 5555 5555 4444` | Aprueba (Mastercard) |
| `4000 0000 0000 0002` | Rechazada por el banco emisor |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0000 0000 0069` | Tarjeta vencida |
| `4000 0000 0000 0127` | Código de seguridad incorrecto |

Para los otros medios: documento `10000000` en PSE y celular `3000000000` en
Nequi siempre rechazan.

---

## 8. Qué comprueban las pruebas

`tests/test_pasarela_de_pago.py` — 27 pruebas:

- Luhn acepta las válidas y rechaza las inventadas.
- La marca se deduce del prefijo (Visa, Mastercard, Amex, Diners).
- Un pago aprobado emite factura con numeración consecutiva.
- La factura discrimina el IVA sin sumarlo, y `base + IVA = total`.
- El PDF se descarga, empieza por `%PDF` y sale con `Cache-Control: no-store`.
- **De la tarjeta solo quedan cuatro dígitos**; ni el número ni el CVV aparecen
  en la respuesta.
- Las tres tarjetas de rechazo no emiten factura.
- Una tarjeta vencida la corta Pydantic antes de llegar a la pasarela.
- PSE y Nequi funcionan.
- Un medio inventado se rechaza con 422.
- **Un cliente no puede ver ni pagar el pedido de otro** (403).
- Sin sesión iniciada no se paga (401).

Todas se ejecutan en GitHub Actions en cada subida.

---

## 9. Para la sustentación

> *«La pasarela es simulada porque conectar una real exige NIT y contrato de
> comercio. Lo que sí es real es todo lo demás: valida con el algoritmo de Luhn,
> detecta la marca por el prefijo, distingue tres medios de pago con un solo
> endpoint gracias a una unión discriminada, y emite la factura con el IVA
> discriminado y numeración consecutiva. Lo más importante es lo que no hace:
> del número de tarjeta solo conserva la marca y los cuatro últimos dígitos, y
> el CVV no se guarda nunca — la tabla ni siquiera tiene una columna donde
> meterlo, y hay una prueba automática que lo verifica.»*
