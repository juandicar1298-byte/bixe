# Imagen del backend, pensada para Railway (o cualquier sitio que corra
# contenedores). En local no hace falta: ahi se usa el entorno virtual.

FROM python:3.12-slim

# Sin .pyc y con la salida sin bufer, para que los logs de la plataforma se
# vean en el momento y no a bloques cuando se llena el bufer.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Las dependencias van en una capa aparte: mientras requirements.txt no
# cambie, reconstruir la imagen no vuelve a bajarlas.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Las imagenes subidas desde el panel. En Railway conviene montar aqui un
# volumen: sin el, cada despliegue se lleva por delante las que hubiera.
RUN mkdir -p uploads

# El puerto lo fija la plataforma en la variable PORT; 8000 es solo el valor
# por defecto para poder probar la imagen en local.
ENV PORT=8000
EXPOSE 8000

# Sin --reload: eso es para desarrollo. Un solo proceso basta para este
# proyecto y evita sorpresas con la reserva de conexiones a la base.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
