"""Publica en el catálogo las ilustraciones de assets/servicios/.

Copia cada PNG a la carpeta uploads/ (con el mismo formato de nombre que usa
la API) y lo deja como portada del servicio que le corresponde.

El emparejamiento es por palabras clave del nombre, así que sigue funcionando
aunque hayas renombrado un servicio. Los que ya tengan portada no se tocan,
salvo que se pase --forzar.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/publicar_imagenes_servicios.py
    .venv/Scripts/python.exe scripts/publicar_imagenes_servicios.py --forzar
"""

import asyncio
import shutil
import sys
import time
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# El script vive en scripts/, así que la raíz del proyecto no está en el path.
sys.path.insert(0, str(RAIZ))

from sqlalchemy import select  # noqa: E402

from app.core.base_datos import FabricaDeSesiones, motor  # noqa: E402
from app.core.configuracion import configuracion  # noqa: E402
from app.models.bixe import Servicio  # noqa: E402
ORIGEN = RAIZ / "assets" / "servicios"
DESTINO = RAIZ / configuracion.carpeta_uploads

# La primera regla cuyas palabras aparezcan todas en el nombre, gana.
REGLAS = [
    (("aceite",), "cambio-de-aceite"),
    (("llanta",), "cambio-de-llantas"),
    (("detailing",), "detailing-pulido"),
    (("pulido",), "detailing-pulido"),
    (("diagnostico",), "diagnostico-electronico"),
    (("sincronizacion",), "sincronizacion-carburacion"),
    (("carburacion",), "sincronizacion-carburacion"),
    (("mantenimiento",), "mantenimiento-preventivo"),
]

# Si nada encaja, se reparte lo que quede para no dejar servicios sin foto.
POR_DEFECTO = "mantenimiento-preventivo"


def sin_tildes(texto: str) -> str:
    descompuesto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")


def elegir_imagen(nombre_servicio: str) -> str:
    normalizado = sin_tildes(nombre_servicio)
    for palabras, imagen in REGLAS:
        if all(palabra in normalizado for palabra in palabras):
            return imagen
    return POR_DEFECTO


def copiar_a_uploads(nombre_imagen: str) -> str:
    """Deja el PNG en uploads/ y devuelve la ruta pública que guarda la API."""
    origen = ORIGEN / f"{nombre_imagen}.png"
    if not origen.exists():
        raise FileNotFoundError(
            f"Falta {origen}. Genera primero las imágenes con "
            f"scripts/generar_imagenes_servicios.py"
        )

    DESTINO.mkdir(parents=True, exist_ok=True)
    destino = DESTINO / f"{int(time.time() * 1000)}-{nombre_imagen}.png"
    shutil.copy2(origen, destino)
    return f"/uploads/{destino.name}"


async def principal(forzar: bool) -> None:
    async with FabricaDeSesiones() as sesion:
        servicios = list(await sesion.scalars(select(Servicio).order_by(Servicio.id)))

        if not servicios:
            print("No hay servicios en la base de datos.")
            return

        cambiados = 0
        for servicio in servicios:
            if servicio.imagen_url and not forzar:
                print(f"  {servicio.nombre:34} ya tenía portada, se deja")
                continue

            imagen = elegir_imagen(servicio.nombre)
            servicio.imagen_url = copiar_a_uploads(imagen)
            cambiados += 1
            print(f"  {servicio.nombre:34} -> {imagen}.png")

        if cambiados:
            await sesion.commit()

        print(f"\n{cambiados} servicio(s) actualizados.")

    await motor.dispose()


if __name__ == "__main__":
    asyncio.run(principal(forzar="--forzar" in sys.argv))
