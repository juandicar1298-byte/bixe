# Frontend: se compila con Node y se sirve ya compilado con Nginx, que es lo
# que hay que desplegar. "npm run dev" es solo para desarrollo.

FROM node:20-alpine AS construccion
WORKDIR /app

COPY package*.json ./
RUN npm ci

# VITE_API_URL se incrusta en el bundle al compilar, asi que tiene que estar
# disponible aqui y no al arrancar el contenedor.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=construccion /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
