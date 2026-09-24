# Documentación del proyecto BIXE

**Ficha 3406211** · Tecnólogo en Análisis y Desarrollo de Software · SENA
Aprendiz: Juan Diego Cartagena Tuberquia

---

## Documentos

| # | Documento | Qué responde |
|---|---|---|
| 11 | *Manual técnico* | **Pendiente** — lo aporta el aprendiz |
| 12 | [Integración y despliegue continuo](12-integracion-y-despliegue-continuo.md) | Cómo se prueban y despliegan los cambios sin tocar nada a mano |
| 13 | [Pasarela de pago](13-pasarela-de-pago.md) | Cómo se cobra, qué se guarda y qué no se guarda nunca |
| 14 | [Normalización de la base de datos](14-normalizacion-base-de-datos.md) | 1FN, 2FN y 3FN sobre las 18 tablas, con sus tres excepciones justificadas |
| 15 | [Conceptos y principios](15-conceptos-y-principios.md) | Clase, objeto, herencia, polimorfismo, instanciación y para qué sirve cada carpeta |
| 16 | [Seguridad: inyección SQL](seguridad-inyeccion-sql.md) | Las dos formas de resolverlo: login escalonado y consulta preparada |

**[Matriz de validación actualizada](Matriz_Validacion_Actualizada_3406211.pdf)** —
la matriz del instructor con el punto 10 eliminado, la renumeración aplicada y
los criterios nuevos del 11 al 16. Se regenera con:

```bash
backend-fastapi/.venv/Scripts/python.exe docs/generar_matriz.py
```

---

## Dónde está cada cosa en el código

| Tema | Archivos |
|---|---|
| Login escalonado (inyección SQL, forma 1) | `frontend/src/components/Login.jsx`, `backend-fastapi/app/routers/auth.py` |
| Consultas preparadas (forma 2) | todo `backend-fastapi/app/crud/` |
| Pruebas de inyección SQL | `backend-fastapi/tests/test_inyeccion_sql.py` |
| Pasarela de pago | `backend-fastapi/app/services/pasarela.py` |
| Facturación | `backend-fastapi/app/crud/pagos.py`, `app/services/factura.py` |
| Modelo de datos (18 tablas) | `backend-fastapi/app/models/bixe.py` |
| Integración continua | `.github/workflows/ci.yml` |
| Despliegue continuo | `.github/workflows/despliegue.yml` |

---

## Las pruebas

92 pruebas automáticas, sobre SQLite en memoria. No hace falta MySQL encendido
ni conexión a Neon.

```bash
cd backend-fastapi
.venv/Scripts/python.exe -m pytest
```

| Archivo | Qué cubre | Pruebas |
|---|---|---|
| `test_autenticacion.py` | Registro, login con JWT, autorización por rol | 22 |
| `test_catalogo_crud.py` | CRUD completo, validación de esquemas, filtros y paginación | 19 |
| `test_inyeccion_sql.py` | Las dos formas de defensa, contra los tres motores | 24 |
| `test_pasarela_de_pago.py` | Luhn, cobro, factura, PDF y datos sensibles | 27 |

Para ver solo las de inyección SQL, que es lo que se pregunta en la
sustentación:

```bash
.venv/Scripts/python.exe -m pytest tests/test_inyeccion_sql.py -v
```

---

## La aplicación en producción

| Servicio | URL |
|---|---|
| Web | https://bixe.vercel.app |
| API | https://bixe-api.onrender.com |
| Documentación de la API | https://bixe-api.onrender.com/docs |
| Repositorio | https://github.com/juandicar1298-byte/bixe |

> **Ojo el día de la sustentación:** en el plan gratuito de Render el servicio se
> duerme tras 15 minutos sin visitas y la primera petición tarda unos 50
> segundos en despertarlo. Abre la web cinco minutos antes.
