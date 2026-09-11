"""Convierte un archivo de código en una imagen con aspecto de editor.

Las capturas de código de la lista de chequeo salen de aquí: se lee el archivo
real del repositorio y se dibuja con numeración de líneas, barra de título y
un coloreado por encima (palabras clave, textos, comentarios). No es una
captura de VS Code, es el mismo código dibujado por este script.

Uso como biblioteca:
    from imagen_codigo import dibujar_codigo
    dibujar_codigo(Path("app/main.py"), salida, desde=1, hasta=40)
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Paleta oscura, parecida a la de un editor, para que el texto se lea sin
# esfuerzo al reducir la imagen dentro de una celda de Excel.
FONDO = (24, 26, 32)
BARRA = (35, 38, 46)
BORDE = (52, 56, 66)
TEXTO = (218, 222, 230)
NUMERO = (99, 106, 120)
COMENTARIO = (114, 135, 118)
CADENA = (206, 165, 120)
CLAVE = (198, 145, 214)
NOMBRE = (110, 175, 235)
NUMEROLIT = (170, 205, 160)
TITULO = (168, 176, 190)

FUENTE = "C:/Windows/Fonts/consola.ttf"
FUENTE_TITULO = "C:/Windows/Fonts/calibrib.ttf"

TAMANO = 17
INTERLINEA = 24
MARGEN = 18
ALTO_BARRA = 38

PALABRAS = {
    # Python
    "def", "class", "return", "import", "from", "if", "elif", "else", "for",
    "while", "try", "except", "finally", "with", "as", "in", "not", "and",
    "or", "is", "None", "True", "False", "async", "await", "raise", "pass",
    "lambda", "yield", "global", "self",
    # JavaScript
    "const", "let", "var", "function", "export", "default", "new", "typeof",
    "null", "undefined", "this", "extends", "of", "case", "switch", "break",
    "continue", "throw", "catch", "finally",
}


def _colorear(linea: str) -> list[tuple[str, tuple[int, int, int]]]:
    """Parte la línea en trozos con su color. Es un coloreado aproximado: no
    pretende ser un analizador del lenguaje, solo que el código se lea bien."""
    recortada = linea.rstrip("\n")

    # Comentario de línea completa o al final.
    for marca in ("#", "//"):
        posicion = recortada.find(marca)
        if posicion != -1 and recortada[:posicion].count('"') % 2 == 0:
            return [
                *(_colorear(recortada[:posicion]) if posicion else []),
                (recortada[posicion:], COMENTARIO),
            ]

    trozos: list[tuple[str, tuple[int, int, int]]] = []
    for pieza in re.split(r'("[^"]*"|\'[^\']*\'|`[^`]*`)', recortada):
        if not pieza:
            continue
        if pieza[:1] in "\"'`":
            trozos.append((pieza, CADENA))
            continue

        for palabra in re.split(r"(\W)", pieza):
            if not palabra:
                continue
            if palabra in PALABRAS:
                color = CLAVE
            elif palabra.isdigit():
                color = NUMEROLIT
            elif palabra.isidentifier() and palabra[0].isupper():
                color = NOMBRE
            else:
                color = TEXTO
            trozos.append((palabra, color))

    return trozos


def _color_de_linea(linea: str) -> tuple[int, int, int]:
    if linea.startswith(">"):
        return (126, 211, 134)  # el comando, en verde
    if linea.startswith("#"):
        return COMENTARIO
    return TEXTO


def dibujar_texto(
    contenido: str,
    salida: Path,
    titulo: str = "PowerShell",
    ancho_maximo: int = 1400,
    columnas: int = 1,
) -> Path:
    """Dibuja texto plano con aspecto de terminal, sin numerar las líneas.

    Sirve para lo que no es un archivo del proyecto: la estructura de
    carpetas, la salida de una consulta a la base de datos o las respuestas de
    la API. Las líneas que empiezan por «>» se pintan como si fueran el
    comando que se escribió y las que empiezan por «#», como comentario.

    Con `columnas=2` el listado se reparte en dos mitades, una al lado de la
    otra. Los listados largos, si se dibujan en una sola tira, salen tan
    estrechos y altos que al reducirlos para caber en una celda no hay quien
    los lea.
    """
    lineas = contenido.splitlines() or [""]

    fuente = ImageFont.truetype(FUENTE, TAMANO)
    fuente_titulo = ImageFont.truetype(FUENTE_TITULO, 16)
    ancho_caracter = fuente.getlength("M")

    # Reparto equilibrado: todas las columnas con el mismo número de líneas.
    por_columna = -(-len(lineas) // columnas)
    bloques = [
        lineas[i * por_columna : (i + 1) * por_columna] for i in range(columnas)
    ]
    bloques = [b for b in bloques if b] or [[""]]

    anchos = [
        int(ancho_caracter * (max(len(l) for l in bloque) + 2)) for bloque in bloques
    ]
    separacion = int(ancho_caracter * 3)

    ancho = min(ancho_maximo, MARGEN * 2 + sum(anchos) + separacion * (len(bloques) - 1))
    alto = ALTO_BARRA + MARGEN * 2 + INTERLINEA * max(len(b) for b in bloques)

    lienzo = Image.new("RGB", (ancho, alto), FONDO)
    d = ImageDraw.Draw(lienzo)

    d.rectangle([0, 0, ancho, ALTO_BARRA], fill=BARRA)
    d.line([(0, ALTO_BARRA), (ancho, ALTO_BARRA)], fill=BORDE)
    for i, color in enumerate(((237, 106, 94), (245, 191, 79), (98, 197, 84))):
        d.ellipse([16 + i * 20, 15, 26 + i * 20, 25], fill=color)
    d.text((88, 11), titulo, font=fuente_titulo, fill=TITULO)

    x = MARGEN
    for indice, bloque in enumerate(bloques):
        if indice:
            # Filete vertical de separación entre columnas.
            medio = x - separacion // 2
            d.line([(medio, ALTO_BARRA + 10), (medio, alto - 10)], fill=BORDE)

        y = ALTO_BARRA + MARGEN
        for linea in bloque:
            d.text((x, y), linea, font=fuente, fill=_color_de_linea(linea))
            y += INTERLINEA
        x += anchos[indice] + separacion

    salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(salida, "PNG", optimize=True)
    return salida


def dibujar_codigo(
    ruta: Path,
    salida: Path,
    desde: int = 1,
    hasta: int | None = None,
    titulo: str | None = None,
    ancho_maximo: int = 1180,
) -> Path:
    """Dibuja las líneas [desde, hasta] del archivo y guarda el PNG."""
    lineas = ruta.read_text(encoding="utf-8").splitlines()
    hasta = hasta or len(lineas)
    trozo = lineas[desde - 1 : hasta]

    fuente = ImageFont.truetype(FUENTE, TAMANO)
    fuente_titulo = ImageFont.truetype(FUENTE_TITULO, 16)
    ancho_caracter = fuente.getlength("M")

    ancho_numero = int(ancho_caracter * (len(str(hasta)) + 2))
    columnas = max((len(linea) for linea in trozo), default=40)
    ancho = min(
        ancho_maximo,
        int(MARGEN * 2 + ancho_numero + ancho_caracter * (columnas + 2)),
    )
    alto = ALTO_BARRA + MARGEN * 2 + INTERLINEA * len(trozo)

    lienzo = Image.new("RGB", (ancho, alto), FONDO)
    d = ImageDraw.Draw(lienzo)

    # Barra de título con los tres puntos y la ruta del archivo.
    d.rectangle([0, 0, ancho, ALTO_BARRA], fill=BARRA)
    d.line([(0, ALTO_BARRA), (ancho, ALTO_BARRA)], fill=BORDE)
    for i, color in enumerate(((237, 106, 94), (245, 191, 79), (98, 197, 84))):
        d.ellipse([16 + i * 20, 15, 26 + i * 20, 25], fill=color)
    d.text((88, 11), titulo or str(ruta), font=fuente_titulo, fill=TITULO)

    y = ALTO_BARRA + MARGEN
    for desplazamiento, linea in enumerate(trozo):
        numero = str(desde + desplazamiento).rjust(len(str(hasta)))
        d.text((MARGEN, y), numero, font=fuente, fill=NUMERO)

        x = MARGEN + ancho_numero
        for pieza, color in _colorear(linea):
            d.text((x, y), pieza, font=fuente, fill=color)
            x += fuente.getlength(pieza)
        y += INTERLINEA

    salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(salida, "PNG", optimize=True)
    return salida
