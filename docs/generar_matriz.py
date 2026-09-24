"""Genera la matriz de validación técnica actualizada, en PDF.

Parte de la matriz original del instructor y aplica los cambios que dictó en
clase: se elimina el punto 10 (Frontend – React), se renumera lo que venía
detrás y se añaden los criterios nuevos del bloque «Otros».

Uso, desde la raíz del proyecto:
    backend-fastapi/.venv/Scripts/python.exe docs/generar_matriz.py
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SALIDA = Path(__file__).resolve().parent / "Matriz_Validacion_Actualizada_3406211.pdf"

VERDE_SENA = colors.HexColor("#39A900")
GRIS_TITULO = colors.HexColor("#F0F0F0")
GRIS_BORDE = colors.HexColor("#999999")

FICHA = "3406211"
PROGRAMA = "Tecnólogo en Análisis y Desarrollo de Software (código 228118)"
APRENDIZ = "JUAN DIEGO CARTAGENA TUBERQUIA"
INSTRUCTOR = "César Augusto Moreno Mena"
PROYECTO = "Catálogo de Motos – BIXE"

COMPETENCIAS = [
    (
        "38367 - Estructurar propuesta técnica de servicio de TI según "
        "requisitos técnicos y normativa",
        "593060 - 01 Definir especificaciones técnicas del software de acuerdo "
        "con las características del software a construir.",
    ),
    (
        "38356 - Implementar la solución de software de acuerdo con los "
        "requisitos de operación y modelos de referencia",
        "593109 - 03 Documentar el proceso de implantación de software "
        "siguiendo estándares de calidad.",
    ),
    (
        "38356 - Implementar la solución de software de acuerdo con los "
        "requisitos de operación y modelos de referencia",
        "593112 - 04 Implantar el software de acuerdo con los niveles de "
        "servicio establecidos con el cliente.",
    ),
]

# Cada bloque es (título de la sección, [criterios verificables]).
#
# Respecto a la matriz original: se eliminó el punto 10 (Frontend – React), la
# antigua «Comparativa técnica y sustentación» pasó del 11 al 10, y del 11 al
# 16 son los criterios nuevos.
SECCIONES = [
    (
        "1. Diseño y fundamentos REST",
        [
            "Los endpoints del dominio están definidos con criterio REST "
            "(recurso – verbo HTTP – ruta – código de respuesta).",
            "Implementa parámetros de ruta y de consulta con validación "
            "(Query, Path, Annotated / type hints).",
            "El CRUD completo (crear, listar, consultar, actualizar, eliminar) "
            "está implementado sobre los recursos principales del dominio.",
        ],
    ),
    (
        "2. Modelado y validación de datos (Pydantic)",
        [
            "Usa esquemas Pydantic v2 separados para entrada y salida "
            "(Create / Update / Response).",
            "Incluye validaciones propias del dominio (field_validator / "
            "model_validator, restricciones de Field).",
        ],
    ),
    (
        "3. Persistencia de datos (SQLAlchemy)",
        [
            "Define al menos dos entidades relacionadas mediante modelos "
            "SQLAlchemy 2.0.",
            "El CRUD es persistente contra una base de datos real "
            "(SQLite / PostgreSQL), no en memoria.",
        ],
    ),
    (
        "4. Autenticación y autorización",
        [
            "Implementa inicio de sesión con JWT (flujo OAuth2 password u "
            "equivalente).",
            "Protege endpoints sensibles según autenticación y/o rol del usuario.",
        ],
    ),
    (
        "5. Manejo de errores y middlewares",
        [
            "Maneja errores de forma estandarizada (HTTPException, códigos "
            "404/422, mensajes claros).",
            "Configura CORS para permitir el consumo de la API desde el "
            "frontend en React.",
        ],
    ),
    (
        "6. Asincronía y tareas en segundo plano",
        [
            "Incluye al menos un endpoint o flujo implementado con async/await.",
            "Usa BackgroundTasks (u otro mecanismo equivalente) para al menos "
            "una tarea no bloqueante.",
        ],
    ),
    (
        "7. Integración de Inteligencia Artificial",
        [
            "El proyecto expone al menos un endpoint que integra un modelo "
            "propio o un servicio de IA externo.",
            "Las credenciales o llaves de API se gestionan por variables de "
            "entorno, nunca en el código.",
        ],
    ),
    (
        "8. Documentación y preparación para despliegue",
        [
            "La documentación automática (/docs, /redoc) está personalizada "
            "con tags, descripciones y ejemplos.",
            "Incluye README con instrucciones de instalación y ejecución, y "
            "requirements.txt / .env.example.",
        ],
    ),
    (
        "9. Pruebas (Testing)",
        [
            "Incluye pruebas con Pytest / TestClient que cubren al menos el "
            "CRUD y la autenticación.",
        ],
    ),
    (
        "10. Comparativa técnica y sustentación",
        [
            "Incluye un análisis o sección comparativa entre FastAPI y Django "
            "REST Framework aplicado al proyecto.",
            "El aprendiz sustenta con claridad el funcionamiento del proyecto "
            "y las decisiones técnicas tomadas.",
        ],
    ),
    (
        "11. Manual técnico",
        [
            "Entrega un manual técnico del proyecto: arquitectura, requisitos, "
            "instalación, configuración y operación.",
        ],
    ),
    (
        "12. Integración y despliegue continuo (CI/CD)",
        [
            "Existe un flujo de integración continua en GitHub que revisa el "
            "estilo y ejecuta las pruebas automáticamente en cada cambio.",
            "El despliegue a la nube es automático y está condicionado a que "
            "la integración continua termine correctamente.",
        ],
    ),
    (
        "13. Pasarela de pago",
        [
            "El proyecto implementa un flujo de pago completo con validación "
            "del medio de pago y emisión del comprobante.",
            "Los datos sensibles del medio de pago no se almacenan "
            "(no se guarda el número completo ni el código de seguridad).",
        ],
    ),
    (
        "14. Base de datos (normalización)",
        [
            "El modelo de datos está normalizado hasta la tercera forma normal "
            "(1FN, 2FN y 3FN), y las desnormalizaciones están justificadas.",
            "Las relaciones declaran integridad referencial y restricciones de "
            "unicidad coherentes con el dominio.",
        ],
    ),
    (
        "15. Respuesta a conceptos y principios",
        [
            "Explica con ejemplos del propio proyecto qué son clase, objeto, "
            "herencia y polimorfismo.",
            "Explica en qué proceso las clases se convierten en objetos "
            "(instanciación: __new__ y el constructor __init__).",
            "Explica la utilidad de cada uno de los componentes del proyecto "
            "(capas del backend y carpetas del frontend).",
        ],
    ),
    (
        "16. Seguridad: prevención de inyección SQL",
        [
            "FORMA 1 — Frontend: el inicio de sesión está escalonado en dos "
            "formularios, de modo que la contraseña no forma parte de ninguna "
            "consulta.",
            "FORMA 2 — Backend: las consultas son preparadas (prepared "
            "statement): el valor viaja como parámetro y no dentro de la "
            "instrucción SQL.",
        ],
    ),
]


def construir():
    estilos = getSampleStyleSheet()

    encabezado = ParagraphStyle(
        "encabezado",
        parent=estilos["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
    )
    subencabezado = ParagraphStyle(
        "subencabezado",
        parent=estilos["Normal"],
        fontSize=7.5,
        leading=10,
        alignment=TA_CENTER,
    )
    etiqueta = ParagraphStyle(
        "etiqueta", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=8,
        leading=10,
    )
    normal = ParagraphStyle(
        "normal", parent=estilos["Normal"], fontSize=8, leading=10.5
    )
    seccion = ParagraphStyle(
        "seccion", parent=estilos["Normal"], fontName="Helvetica-Bold", fontSize=8.5,
        leading=11,
    )

    documento = SimpleDocTemplate(
        str(SALIDA),
        pagesize=letter,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title="Matriz de validación técnica actualizada – BIXE",
        author=APRENDIZ,
    )

    partes = []

    # ------------------------------ Encabezado ------------------------------
    partes.append(Paragraph("SERVICIO NACIONAL DE APRENDIZAJE – SENA", encabezado))
    partes.append(
        Paragraph(
            "Centro de Servicios y Gestión Empresarial · Coordinación de "
            "Teleinformática, SENA Regional Antioquia",
            subencabezado,
        )
    )
    partes.append(Spacer(1, 4))
    partes.append(
        Paragraph(
            "MATRIZ DE VALIDACIÓN TÉCNICA – PROYECTO INTEGRADOR REACT + FASTAPI",
            encabezado,
        )
    )
    partes.append(Spacer(1, 10))

    # ------------------------------ Datos ------------------------------
    datos = [
        [Paragraph("Ficha:", etiqueta), Paragraph(FICHA, normal),
         Paragraph("Programa:", etiqueta), Paragraph(PROGRAMA, normal)],
        [Paragraph("Aprendiz:", etiqueta), Paragraph(APRENDIZ, normal),
         Paragraph("Instructor:", etiqueta), Paragraph(INSTRUCTOR, normal)],
        [Paragraph("Proyecto:", etiqueta), Paragraph(PROYECTO, normal),
         Paragraph("Fecha de validación:", etiqueta),
         Paragraph("_______________________", normal)],
    ]
    tabla_datos = Table(datos, colWidths=[2.3 * cm, 6.2 * cm, 3.2 * cm, 6.3 * cm])
    tabla_datos.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (0, -1), GRIS_TITULO),
                ("BACKGROUND", (2, 0), (2, -1), GRIS_TITULO),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    partes.append(tabla_datos)
    partes.append(Spacer(1, 10))

    # --------------------------- Competencias ---------------------------
    filas = [
        [Paragraph("Competencia (Norma SofíaPlus)", etiqueta),
         Paragraph("Resultado de Aprendizaje (RAP)", etiqueta)]
    ]
    filas += [
        [Paragraph(competencia, normal), Paragraph(rap, normal)]
        for competencia, rap in COMPETENCIAS
    ]
    tabla_competencias = Table(filas, colWidths=[9 * cm, 9 * cm], repeatRows=1)
    tabla_competencias.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
                ("BACKGROUND", (0, 0), (-1, 0), GRIS_TITULO),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    partes.append(tabla_competencias)
    partes.append(Spacer(1, 12))

    # ---------------------------- Criterios ----------------------------
    anchos = [10.6 * cm, 1.7 * cm, 1.9 * cm, 3.8 * cm]
    cabecera = [
        Paragraph("Criterio verificable", etiqueta),
        Paragraph("Cumple", etiqueta),
        Paragraph("No cumple", etiqueta),
        Paragraph("Observaciones", etiqueta),
    ]

    filas = [cabecera]
    estilo = [
        ("GRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("BACKGROUND", (0, 0), (-1, 0), GRIS_TITULO),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (2, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]

    total = 0
    for titulo, criterios in SECCIONES:
        indice = len(filas)
        filas.append([Paragraph(titulo, seccion), "", "", ""])
        estilo.append(("SPAN", (0, indice), (-1, indice)))
        estilo.append(("BACKGROUND", (0, indice), (-1, indice), GRIS_TITULO))

        for criterio in criterios:
            filas.append([Paragraph(criterio, normal), "", "", ""])
            total += 1

    tabla_criterios = Table(filas, colWidths=anchos, repeatRows=1)
    tabla_criterios.setStyle(TableStyle(estilo))
    partes.append(tabla_criterios)
    partes.append(Spacer(1, 10))

    # ------------------------------ Totales ------------------------------
    resumen = [
        [Paragraph("Total de criterios evaluados", etiqueta), Paragraph(str(total), normal),
         Paragraph("Criterios que cumple", etiqueta), Paragraph("______", normal)],
        [Paragraph("Resultado general", etiqueta),
         Paragraph("[  ] Aprueba      [  ] No aprueba      [  ] Aprueba con observaciones",
                   normal), "", ""],
    ]
    tabla_resumen = Table(resumen, colWidths=[5.4 * cm, 4.2 * cm, 4.2 * cm, 4.2 * cm])
    tabla_resumen.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
                ("SPAN", (1, 1), (-1, 1)),
                ("BACKGROUND", (0, 0), (0, -1), GRIS_TITULO),
                ("BACKGROUND", (2, 0), (2, 0), GRIS_TITULO),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    partes.append(tabla_resumen)
    partes.append(Spacer(1, 8))

    partes.append(Paragraph("Observaciones generales:", etiqueta))
    for _ in range(3):
        partes.append(Spacer(1, 3))
        partes.append(Paragraph("_" * 118, normal))

    partes.append(Spacer(1, 26))

    firmas = Table(
        [
            [Paragraph("_" * 34, normal), "", Paragraph("_" * 34, normal)],
            [Paragraph(INSTRUCTOR, normal), "", Paragraph(APRENDIZ, normal)],
            [Paragraph("Instructor técnico", normal), "", Paragraph("Aprendiz", normal)],
        ],
        colWidths=[7.5 * cm, 3 * cm, 7.5 * cm],
    )
    firmas.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    partes.append(KeepTogether(firmas))

    documento.build(partes)
    return total


if __name__ == "__main__":
    total = construir()
    print(f"Matriz generada: {SALIDA}")
    print(f"Criterios evaluados: {total}")
