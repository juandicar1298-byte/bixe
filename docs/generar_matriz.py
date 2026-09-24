"""Genera la matriz de validación técnica, en PDF.

Produce dos archivos:

  Matriz_Validacion_Actualizada_3406211.pdf   en blanco, para que la rellene
                                              el instructor
  Matriz_Validacion_Diligenciada_3406211.pdf  la autoevaluación del aprendiz,
                                              con la evidencia de cada criterio

Parte de la matriz original del instructor y aplica los cambios que dictó en
clase: se elimina el punto 10 (Frontend – React), se renumera lo que venía
detrás y se añaden los criterios nuevos del bloque «Otros».

En la versión diligenciada, la casilla «Cumple» y las observaciones las pone el
aprendiz como autoevaluación con evidencia. El resultado general y las firmas
quedan en blanco: eso lo decide el instructor.

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

CARPETA = Path(__file__).resolve().parent

VERDE_SENA = colors.HexColor("#39A900")
GRIS_TITULO = colors.HexColor("#F0F0F0")
GRIS_BORDE = colors.HexColor("#999999")
AZUL_NOTA = colors.HexColor("#EAF2FB")

FICHA = "3406211"
PROGRAMA = "Tecnólogo en Análisis y Desarrollo de Software (código 228118)"
APRENDIZ = "JUAN DIEGO CARTAGENA TUBERQUIA"
INSTRUCTOR = "César Augusto Moreno Mena"
PROYECTO = "Catálogo de Motos – BIXE"

REPOSITORIO = "https://github.com/juandicar1298-byte/bixe"
WEB = "https://bixe.vercel.app"
API = "https://bixe-api.onrender.com"

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

# Cada criterio es (texto, estado, evidencia).
#
#   estado "si"       -> el aprendiz lo marca como cumplido y aporta evidencia
#   estado "pendiente"-> no se puede autoevaluar; lo decide el instructor
#
# Respecto a la matriz original: se eliminó el punto 10 (Frontend – React), la
# antigua «Comparativa técnica y sustentación» pasó del 11 al 10, y del 11 al
# 16 son los criterios nuevos.
SECCIONES = [
    (
        "1. Diseño y fundamentos REST",
        [
            (
                "Los endpoints del dominio están definidos con criterio REST "
                "(recurso – verbo HTTP – ruta – código de respuesta).",
                "si",
                "11 routers en app/routers/. Ejemplo: GET /api/productos 200, "
                "POST 201, PATCH 200, DELETE 204 y 404 si no existe. "
                f"Visible en {API}/docs",
            ),
            (
                "Implementa parámetros de ruta y de consulta con validación "
                "(Query, Path, Annotated / type hints).",
                "si",
                "Annotated[int, Path(ge=1)] en dependencias.py; Query(ge=0), "
                "Literal y min_length en productos.py. Seis pruebas lo "
                "comprueban en test_catalogo_crud.py.",
            ),
            (
                "El CRUD completo (crear, listar, consultar, actualizar, "
                "eliminar) está implementado sobre los recursos principales "
                "del dominio.",
                "si",
                "Productos, servicios, usuarios, pedidos, ventas y PQR. "
                "Prueba: test_ciclo_de_vida_completo_de_un_producto.",
            ),
        ],
    ),
    (
        "2. Modelado y validación de datos (Pydantic)",
        [
            (
                "Usa esquemas Pydantic v2 separados para entrada y salida "
                "(Create / Update / Response).",
                "si",
                "12 archivos en app/schemas/. Ejemplo: ProductoCrear, "
                "ProductoActualizar y ProductoRespuesta son clases distintas.",
            ),
            (
                "Incluye validaciones propias del dominio (field_validator / "
                "model_validator, restricciones de Field).",
                "si",
                "field_validator: contraseña segura, limpieza de espacios. "
                "model_validator: tarjeta no vencida, contraseñas que "
                "coinciden, carrito sin artículos repetidos.",
            ),
        ],
    ),
    (
        "3. Persistencia de datos (SQLAlchemy)",
        [
            (
                "Define al menos dos entidades relacionadas mediante modelos "
                "SQLAlchemy 2.0.",
                "si",
                "18 tablas en app/models/bixe.py con Mapped y mapped_column "
                "(sintaxis 2.0) y 18 claves foráneas.",
            ),
            (
                "El CRUD es persistente contra una base de datos real "
                "(SQLite / PostgreSQL), no en memoria.",
                "si",
                "MySQL/MariaDB en local y PostgreSQL (Neon) en producción, con "
                f"el mismo código. Comprobable en {API}/api/productos",
            ),
        ],
    ),
    (
        "4. Autenticación y autorización",
        [
            (
                "Implementa inicio de sesión con JWT (flujo OAuth2 password u "
                "equivalente).",
                "si",
                "POST /api/auth/login devuelve el JWT; /api/auth/token atiende "
                "el botón «Authorize» de Swagger. 26 pruebas en "
                "test_autenticacion.py.",
            ),
            (
                "Protege endpoints sensibles según autenticación y/o rol del "
                "usuario.",
                "si",
                "ExigirPermiso y ExigirRol en dependencias.py, resueltos "
                "contra la tabla roles_permisos y no con ids en el código. Se "
                "distingue 401 de 403.",
            ),
        ],
    ),
    (
        "5. Manejo de errores y middlewares",
        [
            (
                "Maneja errores de forma estandarizada (HTTPException, códigos "
                "404/422, mensajes claros).",
                "si",
                "Jerarquía de excepciones en app/errores.py y manejadores en "
                "main.py. Todo error sale igual: {codigo, mensaje, ruta, "
                "detalles}.",
            ),
            (
                "Configura CORS para permitir el consumo de la API desde el "
                "frontend en React.",
                "si",
                "CORSMiddleware con lista explícita de orígenes, sin comodín. "
                "Comprobado: un origen ajeno no recibe la cabecera "
                "Access-Control-Allow-Origin.",
            ),
        ],
    ),
    (
        "6. Asincronía y tareas en segundo plano",
        [
            (
                "Incluye al menos un endpoint o flujo implementado con "
                "async/await.",
                "si",
                "Toda la API es asíncrona sobre SQLAlchemy async (aiomysql en "
                "local, asyncpg en Neon). El chatbot espera a Groq sin "
                "bloquear el resto de peticiones.",
            ),
            (
                "Usa BackgroundTasks (u otro mecanismo equivalente) para al "
                "menos una tarea no bloqueante.",
                "si",
                "BackgroundTasks en POST /api/auth/recuperar: el correo sale "
                "después de haber respondido, así el usuario no espera los 2–5 "
                "segundos que tarda Gmail.",
            ),
        ],
    ),
    (
        "7. Integración de Inteligencia Artificial",
        [
            (
                "El proyecto expone al menos un endpoint que integra un modelo "
                "propio o un servicio de IA externo.",
                "si",
                "POST /api/chat, con Groq (openai/gpt-oss-120b). Estado en "
                f"{API}/api/chat/estado. Si no hay clave, responde con el "
                "catálogo en lugar de fallar.",
            ),
            (
                "Las credenciales o llaves de API se gestionan por variables de "
                "entorno, nunca en el código.",
                "si",
                "IA_API_KEY por variable de entorno. El .env está en "
                ".gitignore; se versiona .env.example, con los nombres y sin "
                "ningún valor.",
            ),
        ],
    ),
    (
        "8. Documentación y preparación para despliegue",
        [
            (
                "La documentación automática (/docs, /redoc) está "
                "personalizada con tags, descripciones y ejemplos.",
                "si",
                "12 etiquetas con descripción y ejemplos en cada esquema. "
                f"{API}/docs, /redoc y /openapi.json responden 200.",
            ),
            (
                "Incluye README con instrucciones de instalación y ejecución, "
                "y requirements.txt / .env.example.",
                "si",
                "README.md con puesta en marcha y despliegue; "
                "requirements.txt, requirements-dev.txt y .env.example tanto en "
                "el backend como en el frontend.",
            ),
        ],
    ),
    (
        "9. Pruebas (Testing)",
        [
            (
                "Incluye pruebas con Pytest / TestClient que cubren al menos "
                "el CRUD y la autenticación.",
                "si",
                "96 pruebas con Pytest sobre SQLite en memoria (no requiere "
                "MySQL ni Neon). Se ejecutan solas en GitHub Actions en cada "
                "subida.",
            ),
        ],
    ),
    (
        "10. Comparativa técnica y sustentación",
        [
            (
                "Incluye un análisis o sección comparativa entre FastAPI y "
                "Django REST Framework aplicado al proyecto.",
                "si",
                "docs/10-comparativa-fastapi-django.md. Incluye los tres "
                "puntos en los que Django habría sido mejor: panel de "
                "administración, migraciones y autenticación.",
            ),
            (
                "El aprendiz sustenta con claridad el funcionamiento del "
                "proyecto y las decisiones técnicas tomadas.",
                "pendiente",
                "Se evalúa durante la sustentación.",
            ),
        ],
    ),
    (
        "11. Manual técnico",
        [
            (
                "Entrega un manual técnico del proyecto: arquitectura, "
                "requisitos, instalación, configuración y operación.",
                "pendiente",
                "Pendiente de entrega por parte del aprendiz.",
            ),
        ],
    ),
    (
        "12. Integración y despliegue continuo (CI/CD)",
        [
            (
                "Existe un flujo de integración continua en GitHub que revisa "
                "el estilo y ejecuta las pruebas automáticamente en cada "
                "cambio.",
                "si",
                ".github/workflows/ci.yml: ruff y 96 pruebas en el backend, "
                "eslint y compilación en el frontend. Última ejecución en "
                f"verde: {REPOSITORIO}/actions",
            ),
            (
                "El despliegue a la nube es automático y está condicionado a "
                "que la integración continua termine correctamente.",
                "si",
                ".github/workflows/despliegue.yml se dispara solo si CI "
                f"termina en success, y comprueba que {API}/salud vuelva a "
                "responder 200.",
            ),
        ],
    ),
    (
        "13. Pasarela de pago",
        [
            (
                "El proyecto implementa un flujo de pago completo con "
                "validación del medio de pago y emisión del comprobante.",
                "si",
                "Tarjeta, PSE y Nequi en un solo endpoint (unión discriminada). "
                "Valida con el algoritmo de Luhn y emite factura consecutiva "
                "con IVA discriminado y PDF descargable.",
            ),
            (
                "Los datos sensibles del medio de pago no se almacenan (no se "
                "guarda el número completo ni el código de seguridad).",
                "si",
                "Solo se guardan la marca y los cuatro últimos dígitos. La "
                "tabla pagos no tiene columna para el número ni para el CVV; "
                "hay una prueba que lo verifica.",
            ),
        ],
    ),
    (
        "14. Base de datos (normalización)",
        [
            (
                "El modelo de datos está normalizado hasta la tercera forma "
                "normal (1FN, 2FN y 3FN), y las desnormalizaciones están "
                "justificadas.",
                "si",
                "docs/14-normalizacion-base-de-datos.md. Las tres "
                "desnormalizaciones son deliberadas: las líneas de pedido y de "
                "venta congelan nombre y precio porque una factura emitida no "
                "puede cambiar de importe.",
            ),
            (
                "Las relaciones declaran integridad referencial y "
                "restricciones de unicidad coherentes con el dominio.",
                "si",
                "18 claves foráneas con CASCADE, SET NULL o restricción según "
                "el caso. UNIQUE en correo, documento, consecutivos de factura "
                "y de venta, radicado de PQR y referencia de pago.",
            ),
        ],
    ),
    (
        "15. Respuesta a conceptos y principios",
        [
            (
                "Explica con ejemplos del propio proyecto qué son clase, "
                "objeto, herencia y polimorfismo.",
                "si",
                "docs/15-conceptos-y-principios.md, secciones 1 a 5. Herencia: "
                "la jerarquía de app/errores.py. Polimorfismo: los tres medios "
                "de pago en un solo endpoint.",
            ),
            (
                "Explica en qué proceso las clases se convierten en objetos "
                "(instanciación: __new__ y el constructor __init__).",
                "si",
                "docs/15-conceptos-y-principios.md, sección 3. Incluye la "
                "segunda vía: cómo SQLAlchemy convierte cada fila de la tabla "
                "en un objeto del modelo.",
            ),
            (
                "Explica la utilidad de cada uno de los componentes del "
                "proyecto (capas del backend y carpetas del frontend).",
                "si",
                "docs/15-conceptos-y-principios.md, sección 7: el recorrido de "
                "una petición por las capas y para qué sirve cada carpeta.",
            ),
        ],
    ),
    (
        "16. Seguridad: prevención de inyección SQL",
        [
            (
                "FORMA 1 — Frontend: el inicio de sesión está escalonado en "
                "dos formularios, de modo que la contraseña no forma parte de "
                "ninguna consulta.",
                "si",
                "frontend/src/components/Login.jsx en dos pasos. Comprobado "
                "que el paso 1 no hace ninguna petición al servidor: si "
                "preguntara si el correo existe, se podrían enumerar cuentas.",
            ),
            (
                "FORMA 2 — Backend: las consultas son preparadas (prepared "
                "statement): el valor viaja como parámetro y no dentro de la "
                "instrucción SQL.",
                "si",
                "Cero consultas escritas a mano en toda la aplicación. 24 "
                "pruebas en test_inyeccion_sql.py, incluida una que compila la "
                "consulta contra MySQL, PostgreSQL y SQLite.",
            ),
        ],
    ),
]


def _estilos():
    base = getSampleStyleSheet()
    return {
        "encabezado": ParagraphStyle(
            "encabezado", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, leading=13, alignment=TA_CENTER,
        ),
        "subencabezado": ParagraphStyle(
            "subencabezado", parent=base["Normal"], fontSize=7.5, leading=10,
            alignment=TA_CENTER,
        ),
        "etiqueta": ParagraphStyle(
            "etiqueta", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8, leading=10,
        ),
        "normal": ParagraphStyle(
            "normal", parent=base["Normal"], fontSize=8, leading=10.5
        ),
        "evidencia": ParagraphStyle(
            "evidencia", parent=base["Normal"], fontSize=6.6, leading=8.2,
            textColor=colors.HexColor("#333333"),
        ),
        "marca": ParagraphStyle(
            "marca", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, leading=11, alignment=TA_CENTER,
            textColor=VERDE_SENA,
        ),
        "seccion": ParagraphStyle(
            "seccion", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8.5, leading=11,
        ),
        "nota": ParagraphStyle(
            "nota", parent=base["Normal"], fontSize=7.4, leading=9.6
        ),
    }


def construir(diligenciada: bool) -> tuple[Path, int, int]:
    e = _estilos()

    nombre = (
        "Matriz_Validacion_Diligenciada_3406211.pdf"
        if diligenciada
        else "Matriz_Validacion_Actualizada_3406211.pdf"
    )
    salida = CARPETA / nombre

    documento = SimpleDocTemplate(
        str(salida),
        pagesize=letter,
        leftMargin=1.4 * cm,
        rightMargin=1.4 * cm,
        topMargin=1.3 * cm,
        bottomMargin=1.3 * cm,
        title="Matriz de validación técnica – BIXE",
        author=APRENDIZ,
    )

    partes = []

    # ------------------------------ Encabezado ------------------------------
    partes.append(Paragraph("SERVICIO NACIONAL DE APRENDIZAJE – SENA", e["encabezado"]))
    partes.append(
        Paragraph(
            "Centro de Servicios y Gestión Empresarial · Coordinación de "
            "Teleinformática, SENA Regional Antioquia",
            e["subencabezado"],
        )
    )
    partes.append(Spacer(1, 4))
    partes.append(
        Paragraph(
            "MATRIZ DE VALIDACIÓN TÉCNICA – PROYECTO INTEGRADOR REACT + FASTAPI",
            e["encabezado"],
        )
    )
    partes.append(Spacer(1, 9))

    ancho_total = 18.6 * cm

    # ------------------------------ Datos ------------------------------
    datos = [
        [Paragraph("Ficha:", e["etiqueta"]), Paragraph(FICHA, e["normal"]),
         Paragraph("Programa:", e["etiqueta"]), Paragraph(PROGRAMA, e["normal"])],
        [Paragraph("Aprendiz:", e["etiqueta"]), Paragraph(APRENDIZ, e["normal"]),
         Paragraph("Instructor:", e["etiqueta"]), Paragraph(INSTRUCTOR, e["normal"])],
        [Paragraph("Proyecto:", e["etiqueta"]), Paragraph(PROYECTO, e["normal"]),
         Paragraph("Fecha de validación:", e["etiqueta"]),
         Paragraph("_______________________", e["normal"])],
    ]
    tabla = Table(datos, colWidths=[2.2 * cm, 6.3 * cm, 3.2 * cm, 6.9 * cm])
    tabla.setStyle(
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
    partes.append(tabla)
    partes.append(Spacer(1, 8))

    # ------------------------ Aviso de autoevaluación ------------------------
    if diligenciada:
        aviso = Table(
            [[Paragraph(
                "<b>Autoevaluación del aprendiz.</b> Las casillas «Cumple» y la "
                "columna de evidencia las diligencia el aprendiz, indicando "
                "dónde se comprueba cada criterio. El resultado general y las "
                "firmas quedan en blanco: los diligencia el instructor. "
                f"Repositorio: {REPOSITORIO} · Web: {WEB} · API: {API}",
                e["nota"],
            )]],
            colWidths=[ancho_total],
        )
        aviso.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), AZUL_NOTA),
                    ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORDE),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        partes.append(aviso)
        partes.append(Spacer(1, 8))

    # --------------------------- Competencias ---------------------------
    filas = [
        [Paragraph("Competencia (Norma SofíaPlus)", e["etiqueta"]),
         Paragraph("Resultado de Aprendizaje (RAP)", e["etiqueta"])]
    ]
    filas += [
        [Paragraph(c, e["normal"]), Paragraph(r, e["normal"])]
        for c, r in COMPETENCIAS
    ]
    tabla = Table(filas, colWidths=[ancho_total / 2] * 2, repeatRows=1)
    tabla.setStyle(
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
    partes.append(tabla)
    partes.append(Spacer(1, 10))

    # ---------------------------- Criterios ----------------------------
    if diligenciada:
        anchos = [7.9 * cm, 1.3 * cm, 1.5 * cm, 7.9 * cm]
        titulo_ultima = "Observaciones / evidencia"
    else:
        anchos = [10.8 * cm, 1.7 * cm, 1.9 * cm, 4.2 * cm]
        titulo_ultima = "Observaciones"

    filas = [[
        Paragraph("Criterio verificable", e["etiqueta"]),
        Paragraph("Cumple", e["etiqueta"]),
        Paragraph("No cumple", e["etiqueta"]),
        Paragraph(titulo_ultima, e["etiqueta"]),
    ]]

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
    cumplidos = 0
    for titulo, criterios in SECCIONES:
        indice = len(filas)
        filas.append([Paragraph(titulo, e["seccion"]), "", "", ""])
        estilo.append(("SPAN", (0, indice), (-1, indice)))
        estilo.append(("BACKGROUND", (0, indice), (-1, indice), GRIS_TITULO))

        for texto, estado, evidencia in criterios:
            total += 1
            if diligenciada:
                marca = Paragraph("X", e["marca"]) if estado == "si" else ""
                if estado == "si":
                    cumplidos += 1
                filas.append([
                    Paragraph(texto, e["normal"]),
                    marca,
                    "",
                    Paragraph(evidencia, e["evidencia"]),
                ])
                if estado == "pendiente":
                    estilo.append(
                        ("BACKGROUND", (1, len(filas) - 1), (2, len(filas) - 1),
                         colors.HexColor("#FFF8E1"))
                    )
            else:
                filas.append([Paragraph(texto, e["normal"]), "", "", ""])

    tabla = Table(filas, colWidths=anchos, repeatRows=1)
    tabla.setStyle(TableStyle(estilo))
    partes.append(tabla)
    partes.append(Spacer(1, 9))

    # ------------------------------ Totales ------------------------------
    marcados = str(cumplidos) if diligenciada else "______"
    resumen = [
        [Paragraph("Total de criterios evaluados", e["etiqueta"]),
         Paragraph(str(total), e["normal"]),
         Paragraph(
             "Criterios que cumple" + (" (autoevaluación)" if diligenciada else ""),
             e["etiqueta"]),
         Paragraph(marcados, e["normal"])],
        [Paragraph("Resultado general", e["etiqueta"]),
         Paragraph(
             "[  ] Aprueba      [  ] No aprueba      [  ] Aprueba con observaciones",
             e["normal"]), "", ""],
    ]
    tabla = Table(resumen, colWidths=[5.0 * cm, 3.5 * cm, 5.4 * cm, 4.7 * cm])
    tabla.setStyle(
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
    partes.append(tabla)
    partes.append(Spacer(1, 8))

    if diligenciada:
        partes.append(
            Paragraph(
                f"Dos criterios quedan sin marcar: el manual técnico, pendiente "
                f"de entrega, y la sustentación oral, que se evalúa en vivo. "
                f"Los otros {cumplidos} tienen su evidencia indicada arriba.",
                e["nota"],
            )
        )
        partes.append(Spacer(1, 6))

    partes.append(Paragraph("Observaciones generales:", e["etiqueta"]))
    for _ in range(3):
        partes.append(Spacer(1, 3))
        partes.append(Paragraph("_" * 120, e["normal"]))

    partes.append(Spacer(1, 24))

    firmas = Table(
        [
            [Paragraph("_" * 34, e["normal"]), "", Paragraph("_" * 34, e["normal"])],
            [Paragraph(INSTRUCTOR, e["normal"]), "", Paragraph(APRENDIZ, e["normal"])],
            [Paragraph("Instructor técnico", e["normal"]), "",
             Paragraph("Aprendiz", e["normal"])],
        ],
        colWidths=[7.8 * cm, 3 * cm, 7.8 * cm],
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
    return salida, total, cumplidos


if __name__ == "__main__":
    for diligenciada in (False, True):
        salida, total, cumplidos = construir(diligenciada)
        etiqueta = "diligenciada" if diligenciada else "en blanco"
        detalle = f", {cumplidos} marcados" if diligenciada else ""
        print(f"  {etiqueta:14} {salida.name}  ({total} criterios{detalle})")
