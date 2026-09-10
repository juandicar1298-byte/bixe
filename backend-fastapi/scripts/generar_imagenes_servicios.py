"""Genera las ilustraciones de portada de los servicios.

No son fotografías: son dibujos hechos con la paleta de la marca, para que el
catálogo no dependa de fotos de terceros. Cada servicio tiene su icono.

Uso, desde backend-fastapi/:
    .venv/Scripts/python.exe scripts/generar_imagenes_servicios.py

Las imágenes quedan en assets/servicios/. Para publicarlas en el catálogo,
usa scripts/publicar_imagenes_servicios.py, que las sube por la API.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

# El lienzo se dibuja a 3x y se reduce al final: así las curvas y los
# extremos de línea quedan suaves sin depender de antialiasing del motor.
ESCALA = 3
ANCHO, ALTO = 1200, 675

CARPETA = Path(__file__).resolve().parent.parent / "assets" / "servicios"

# Paleta del sistema de diseño (frontend/src/index.css)
CANVAS = (245, 246, 248)
SURFACE = (255, 255, 255)
INK = (13, 15, 19)
BRAND = (63, 169, 245)
BRAND_DEEP = (11, 124, 196)
BRAND_WASH = (237, 247, 254)
LINE = (231, 233, 238)


def _fondo(dibujo, tinte):
    """Degradado diagonal muy suave, del blanco al tinte de la marca."""
    ancho, alto = ANCHO * ESCALA, ALTO * ESCALA
    pasos = 120
    for i in range(pasos):
        proporcion = i / (pasos - 1)
        color = tuple(
            round(SURFACE[c] + (tinte[c] - SURFACE[c]) * proporcion) for c in range(3)
        )
        # Bandas diagonales: se pintan como polígonos que barren el lienzo.
        desplazamiento = (ancho + alto) * proporcion
        dibujo.polygon(
            [
                (desplazamiento - alto, alto),
                (desplazamiento, 0),
                (desplazamiento + (ancho + alto) / pasos, 0),
                (desplazamiento + (ancho + alto) / pasos - alto, alto),
            ],
            fill=color,
        )


def _circulo(dibujo, centro, radio, color, grosor=0):
    x, y = centro
    caja = [x - radio, y - radio, x + radio, y + radio]
    if grosor:
        dibujo.ellipse(caja, outline=color, width=grosor)
    else:
        dibujo.ellipse(caja, fill=color)


def _radial(centro, angulo_grados, distancia):
    """Punto a cierta distancia y ángulo del centro. 0° apunta a la derecha."""
    radianes = math.radians(angulo_grados)
    return (
        centro[0] + math.cos(radianes) * distancia,
        centro[1] + math.sin(radianes) * distancia,
    )


# ----------------------------- Los iconos -----------------------------
# Todos reciben el lienzo ya escalado y dibujan centrados en (cx, cy).


def icono_llanta(d, cx, cy, r, trazo):
    _circulo(d, (cx, cy), r, INK, trazo)
    _circulo(d, (cx, cy), r * 0.55, BRAND_DEEP, trazo)
    _circulo(d, (cx, cy), r * 0.16, INK)

    # Radios de la rueda
    for angulo in range(0, 360, 45):
        d.line(
            [_radial((cx, cy), angulo, r * 0.2), _radial((cx, cy), angulo, r * 0.52)],
            fill=INK,
            width=int(trazo * 0.7),
        )
    # Dibujo del labrado
    for angulo in range(0, 360, 15):
        d.line(
            [_radial((cx, cy), angulo, r * 1.02), _radial((cx, cy), angulo, r * 1.18)],
            fill=BRAND,
            width=int(trazo * 0.8),
        )


def icono_gota(d, cx, cy, r, trazo):
    """Gota de aceite: un triángulo rematado por un semicírculo."""
    punta = (cx, cy - r * 1.15)
    izquierda = (cx - r * 0.72, cy + r * 0.15)
    derecha = (cx + r * 0.72, cy + r * 0.15)

    d.polygon([punta, izquierda, derecha], fill=BRAND_DEEP)
    d.pieslice(
        [cx - r * 0.72, cy - r * 0.57, cx + r * 0.72, cy + r * 0.87],
        start=0, end=180, fill=BRAND_DEEP,
    )
    # Brillo interior
    _circulo(d, (cx - r * 0.26, cy + r * 0.16), r * 0.17, (255, 255, 255))

    # Gotas pequeñas que caen
    for dx, dy, factor in ((-1.35, 0.55, 0.20), (1.3, 0.75, 0.15)):
        _circulo(d, (cx + r * dx, cy + r * dy), r * factor, BRAND)


def icono_tacometro(d, cx, cy, r, trazo):
    caja = [cx - r, cy - r, cx + r, cy + r]
    d.arc(caja, start=150, end=390, fill=INK, width=trazo)

    # Marcas de la escala
    for i in range(11):
        angulo = 150 + i * 24
        largo = 0.82 if i % 5 else 0.72
        color = BRAND if i >= 8 else INK
        d.line(
            [_radial((cx, cy), angulo, r * largo), _radial((cx, cy), angulo, r * 0.95)],
            fill=color,
            width=int(trazo * (0.7 if i % 5 else 1.1)),
        )

    # Aguja marcando zona alta
    d.line([(cx, cy), _radial((cx, cy), 330, r * 0.72)], fill=BRAND_DEEP, width=trazo)
    _circulo(d, (cx, cy), r * 0.11, INK)


def icono_llave(d, cx, cy, r, trazo):
    """Llave inglesa inclinada, dibujada aparte y rotada."""
    lado = int(r * 3)
    capa = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    dl = ImageDraw.Draw(capa)
    mx, my = lado // 2, lado // 2

    # Mango
    dl.rounded_rectangle(
        [mx - r * 0.16, my - r * 0.15, mx + r * 0.16, my + r * 1.05],
        radius=r * 0.16, fill=INK + (255,),
    )
    # Cabeza abierta
    dl.ellipse(
        [mx - r * 0.56, my - r * 1.12, mx + r * 0.56, my + r * 0.0],
        outline=INK + (255,), width=int(r * 0.30),
    )
    # Boca de la llave
    dl.polygon(
        [
            (mx - r * 0.30, my - r * 1.30),
            (mx + r * 0.30, my - r * 1.30),
            (mx + r * 0.30, my - r * 0.72),
            (mx - r * 0.30, my - r * 0.72),
        ],
        fill=(0, 0, 0, 0),
    )
    capa = capa.rotate(-35, resample=Image.BICUBIC, center=(mx, my))
    d._imagen.alpha_composite(capa, (int(cx - mx), int(cy - my)))

    # Visto bueno al lado
    d.line(
        [
            (cx + r * 0.55, cy + r * 0.30),
            (cx + r * 0.85, cy + r * 0.62),
            (cx + r * 1.45, cy - r * 0.30),
        ],
        fill=BRAND_DEEP, width=int(trazo * 1.2), joint="curve",
    )


def icono_destello(d, cx, cy, r, trazo):
    """Estrella de cuatro puntas: el brillo del pulido."""

    def estrella(centro, tamano, color):
        x, y = centro
        d.polygon(
            [
                (x, y - tamano),
                (x + tamano * 0.24, y - tamano * 0.24),
                (x + tamano, y),
                (x + tamano * 0.24, y + tamano * 0.24),
                (x, y + tamano),
                (x - tamano * 0.24, y + tamano * 0.24),
                (x - tamano, y),
                (x - tamano * 0.24, y - tamano * 0.24),
            ],
            fill=color,
        )

    estrella((cx - r * 0.15, cy - r * 0.1), r * 0.95, BRAND_DEEP)
    estrella((cx + r * 0.78, cy + r * 0.62), r * 0.36, BRAND)
    estrella((cx + r * 0.62, cy - r * 0.78), r * 0.26, BRAND)


def icono_diagnostico(d, cx, cy, r, trazo):
    """Pantalla de escáner con una onda dentro."""
    d.rounded_rectangle(
        [cx - r * 1.15, cy - r * 0.85, cx + r * 1.15, cy + r * 0.6],
        radius=r * 0.16, outline=INK, width=trazo,
    )
    # Base
    d.line([(cx, cy + r * 0.6), (cx, cy + r * 0.95)], fill=INK, width=trazo)
    d.line(
        [(cx - r * 0.45, cy + r * 0.95), (cx + r * 0.45, cy + r * 0.95)],
        fill=INK, width=trazo,
    )
    # Onda
    d.line(
        [
            (cx - r * 0.85, cy - r * 0.12),
            (cx - r * 0.45, cy - r * 0.12),
            (cx - r * 0.28, cy - r * 0.55),
            (cx - r * 0.05, cy + r * 0.30),
            (cx + r * 0.18, cy - r * 0.12),
            (cx + r * 0.85, cy - r * 0.12),
        ],
        fill=BRAND_DEEP, width=int(trazo * 1.1), joint="curve",
    )


SERVICIOS = [
    ("mantenimiento-preventivo", icono_llave, BRAND_WASH),
    ("cambio-de-aceite", icono_gota, (240, 248, 252)),
    ("sincronizacion-carburacion", icono_tacometro, (243, 246, 250)),
    ("cambio-de-llantas", icono_llanta, (241, 245, 249)),
    ("detailing-pulido", icono_destello, BRAND_WASH),
    ("diagnostico-electronico", icono_diagnostico, (242, 247, 251)),
]


def generar(nombre, icono, tinte) -> Path:
    lienzo = Image.new("RGBA", (ANCHO * ESCALA, ALTO * ESCALA), SURFACE + (255,))
    d = ImageDraw.Draw(lienzo)
    d._imagen = lienzo  # el icono de la llave necesita componer una capa

    _fondo(d, tinte)

    cx, cy = ANCHO * ESCALA / 2, ALTO * ESCALA / 2
    radio = ALTO * ESCALA * 0.22
    trazo = int(ALTO * ESCALA * 0.022)

    # Aro decorativo detrás del icono
    _circulo(d, (cx, cy), radio * 1.85, LINE, int(trazo * 0.5))

    icono(d, cx, cy, radio, trazo)

    final = lienzo.convert("RGB").resize((ANCHO, ALTO), Image.LANCZOS)
    CARPETA.mkdir(parents=True, exist_ok=True)
    destino = CARPETA / f"{nombre}.png"
    final.save(destino, "PNG", optimize=True)
    return destino


def main() -> None:
    print(f"Generando en {CARPETA}")
    for nombre, icono, tinte in SERVICIOS:
        ruta = generar(nombre, icono, tinte)
        print(f"  {ruta.name:34} {ruta.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
