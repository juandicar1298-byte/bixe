"""Agrupar por día o por mes en cualquiera de los dos motores.

El proyecto corre sobre MySQL en local y sobre PostgreSQL en la nube, y cada
uno da un nombre distinto a lo mismo: MySQL tiene DATE_FORMAT y PostgreSQL
TO_CHAR, con sintaxis de formato diferentes.

En vez de escribir dos versiones de cada consulta, se aprovecha algo que los
dos hacen igual: convertir una fecha a texto produce «AAAA-MM-DD HH:MM:SS».
Con eso, quedarse con los primeros 7 u 10 caracteres da el mes o el día, sin
una sola línea que dependa del motor.
"""

from sqlalchemy import String, cast, func

# Cuántos caracteres de «AAAA-MM-DD HH:MM:SS» hacen falta para cada corte.
LARGOS = {"dia": 10, "mes": 7}


def periodo(columna, agrupar: str = "dia"):
    """La fecha recortada a «AAAA-MM-DD» o a «AAAA-MM», como texto.

    Sirve igual para el SELECT y para el GROUP BY, que es lo que hace que la
    consulta sea válida en los dos motores.
    """
    return func.substr(cast(columna, String), 1, LARGOS[agrupar])
