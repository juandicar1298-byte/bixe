# Evidencias del cuarto avance

Las capturas de la lista de chequeo y los guiones que las producen. Todo se
regenera, así que si el proyecto cambia no hay que rehacer nada a mano.

## Cómo se regeneran

Hacen falta **MySQL**, la **API** en el puerto 8000 y la **web** en el 5173,
las tres en marcha. Después, desde la raíz del proyecto:

```
backend-fastapi/.venv/Scripts/python.exe evidencias/generar.py
```

```
backend-fastapi/.venv/Scripts/python.exe evidencias/consola.py
```

```
backend-fastapi/.venv/Scripts/python.exe evidencias/llenar_excel.py
```

El primero saca las capturas del navegador y dibuja los fragmentos de código;
el segundo, lo que sale de la consola y de la base de datos; el tercero pega
todo en el Excel.

## Qué hace cada archivo

| Archivo | Para qué |
|---|---|
| `generar.py` | Capturas del navegador con Playwright y las imágenes de código |
| `consola.py` | Estructura, base de datos, rutas de la API y pruebas HTTP |
| `imagen_codigo.py` | Dibuja código y texto con aspecto de editor y de terminal |
| `llenar_excel.py` | Diligencia la lista de chequeo con sus evidencias |
| `imagenes/` | Los PNG que se pegan en el Excel |

## Las cuentas de demostración

Para fotografiar los tres paneles hay que entrar con un usuario de cada rol,
así que `generar.py` crea tres cuentas al empezar y **las borra al terminar**,
incluso si algo falla por el camino:

- Ana Gómez — `ana.gomez@bixe.com` — Administrador
- Luis Peña — `luis.pena@bixe.com` — Empleado
- Sara Ríos — `sara.rios@bixe.com` — Cliente

Son las únicas con correo `@bixe.com` y se eliminan por nombre exacto, nunca
por patrón, para que no haya forma de tocar una cuenta de verdad. Salen en la
captura del CRUD de usuarios porque estaban creadas en ese momento.

## Sobre las imágenes de código

No son capturas de VS Code: es el contenido real de cada archivo del
repositorio, dibujado por `imagen_codigo.py` con numeración de líneas y
coloreado. Si el código cambia, se vuelve a ejecutar el guion y las imágenes
quedan al día solas.
