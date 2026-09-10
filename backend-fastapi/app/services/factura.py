"""Generación del PDF de la factura, con reportlab.

Los precios del catálogo ya incluyen IVA, así que la factura no suma nada al
total: descompone cuánto de lo que pagó el cliente corresponde al impuesto.
"""

from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Datos del emisor. En un proyecto real vendrían de la configuración.
EMISOR = {
    "nombre": "BIXE S.A.S.",
    "nit": "NIT 901.234.567-8",
    "direccion": "Carrera 43A #1-50, El Poblado",
    "ciudad": "Medellín, Colombia",
    "contacto": "contacto@bixe.com · +57 300 123 4567",
}

TINTA = colors.HexColor("#0d0f13")
TINTA_SUAVE = colors.HexColor("#4b525c")
TINTA_TENUE = colors.HexColor("#858d99")
LINEA = colors.HexColor("#e7e9ee")
MARCA = colors.HexColor("#0b7cc4")


def calcular_impuesto(total, porcentaje_iva=Decimal("19")) -> tuple[Decimal, Decimal]:
    """Separa la base gravable y el IVA contenido en un total con impuesto."""
    total = Decimal(str(total))
    factor = Decimal("1") + porcentaje_iva / Decimal("100")

    base = (total / factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    iva = total - base  # así base + iva siempre cuadra exactamente con el total
    return base, iva


def _pesos(valor) -> str:
    entero = int(Decimal(str(valor)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return f"$ {entero:,.0f}".replace(",", ".")


def _estilos():
    hojas = getSampleStyleSheet()
    return {
        "titulo": ParagraphStyle(
            "titulo", parent=hojas["Title"], fontSize=26, leading=28,
            textColor=TINTA, alignment=0, spaceAfter=0,
        ),
        "rotulo": ParagraphStyle(
            "rotulo", parent=hojas["Normal"], fontSize=7.5, leading=10,
            textColor=TINTA_TENUE, fontName="Helvetica-Bold",
        ),
        "normal": ParagraphStyle(
            "cuerpo", parent=hojas["Normal"], fontSize=9, leading=13,
            textColor=TINTA_SUAVE,
        ),
        "fuerte": ParagraphStyle(
            "fuerte", parent=hojas["Normal"], fontSize=9.5, leading=13,
            textColor=TINTA, fontName="Helvetica-Bold",
        ),
        "pie": ParagraphStyle(
            "pie", parent=hojas["Normal"], fontSize=7.5, leading=11,
            textColor=TINTA_TENUE,
        ),
    }


def generar_pdf(factura, pedido, cliente, items, pago) -> bytes:
    """Arma el PDF y lo devuelve en memoria, sin escribir en disco."""
    buffer = BytesIO()
    documento = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Factura {factura.numero}",
        author=EMISOR["nombre"],
    )

    e = _estilos()
    elementos = []

    # --- Encabezado: emisor a la izquierda, número de factura a la derecha ---
    encabezado = Table(
        [[
            Paragraph(
                f'<font size="20"><b>BIXE</b></font><font size="20" color="#0b7cc4"><b>.</b></font><br/>'
                f'<font size="8" color="#858d99">{EMISOR["nit"]}<br/>'
                f'{EMISOR["direccion"]}<br/>{EMISOR["ciudad"]}<br/>{EMISOR["contacto"]}</font>',
                e["normal"],
            ),
            Paragraph(
                f'<para alignment="right"><font size="8" color="#858d99"><b>FACTURA DE VENTA</b></font><br/>'
                f'<font size="16" color="#0d0f13"><b>{factura.numero}</b></font><br/>'
                f'<font size="8" color="#858d99">Emitida el '
                f'{factura.fecha_emision.strftime("%d/%m/%Y a las %H:%M")}</font></para>',
                e["normal"],
            ),
        ]],
        colWidths=[95 * mm, 75 * mm],
    )
    encabezado.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elementos += [encabezado, Spacer(1, 10 * mm)]

    # --- Cliente y pedido ---
    datos = Table(
        [[
            Paragraph(
                '<font size="7.5" color="#858d99"><b>FACTURAR A</b></font><br/>'
                f'<font size="10" color="#0d0f13"><b>{cliente.nombre} {cliente.apellido}</b></font><br/>'
                f'<font size="8.5" color="#4b525c">{cliente.tipo_documento} {cliente.numero_documento}<br/>'
                f'{cliente.direccion}<br/>{cliente.email}<br/>{cliente.telefono}</font>',
                e["normal"],
            ),
            Paragraph(
                '<para alignment="right"><font size="7.5" color="#858d99"><b>PEDIDO</b></font><br/>'
                f'<font size="10" color="#0d0f13"><b>#{pedido.id}</b></font><br/>'
                f'<font size="8.5" color="#4b525c">Fecha: {pedido.fecha_creacion.strftime("%d/%m/%Y")}<br/>'
                f'Medio de pago: {pago.marca.title()} ····{pago.ultimos_cuatro}<br/>'
                f'Referencia: {pago.referencia}</font></para>',
                e["normal"],
            ),
        ]],
        colWidths=[95 * mm, 75 * mm],
    )
    datos.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elementos += [datos, Spacer(1, 9 * mm)]

    # --- Detalle ---
    filas = [["DESCRIPCIÓN", "TIPO", "CANT.", "VR. UNITARIO", "TOTAL"]]
    for item in items:
        importe = Decimal(str(item.precio_unitario)) * item.cantidad
        filas.append([
            Paragraph(item.nombre, e["normal"]),
            item.tipo.title(),
            str(item.cantidad),
            _pesos(item.precio_unitario),
            _pesos(importe),
        ])

    detalle = Table(filas, colWidths=[76 * mm, 20 * mm, 15 * mm, 29 * mm, 30 * mm], repeatRows=1)
    detalle.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), TINTA_TENUE),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, TINTA),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (1, 1), (-1, -1), TINTA_SUAVE),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, -2), 0.4, LINEA),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
    ]))
    elementos += [detalle, Spacer(1, 6 * mm)]

    # --- Totales ---
    totales = Table(
        [
            ["Base gravable", _pesos(factura.base_gravable)],
            [f"IVA ({int(factura.porcentaje_iva)}%)", _pesos(factura.valor_iva)],
            ["TOTAL PAGADO", _pesos(factura.total)],
        ],
        colWidths=[40 * mm, 30 * mm],
        hAlign="RIGHT",
    )
    totales.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, 1), 8.5),
        ("TEXTCOLOR", (0, 0), (0, 1), TINTA_TENUE),
        ("TEXTCOLOR", (1, 0), (1, 1), TINTA_SUAVE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEABOVE", (0, 2), (-1, 2), 0.8, TINTA),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("TEXTCOLOR", (0, 2), (-1, 2), TINTA),
        ("TOPPADDING", (0, 2), (-1, 2), 7),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
    ]))
    elementos += [totales, Spacer(1, 12 * mm)]

    # --- Pie ---
    elementos.append(Paragraph(
        f'<font color="#0b7cc4"><b>Pago aprobado.</b></font> '
        f'Los precios incluyen IVA del {int(factura.porcentaje_iva)}%. '
        f'Documento generado electrónicamente por {EMISOR["nombre"]}; no requiere firma. '
        f'Este documento corresponde a un proyecto académico y no tiene validez fiscal.',
        e["pie"],
    ))

    documento.build(elementos)
    return buffer.getvalue()
