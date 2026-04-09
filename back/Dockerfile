ARG NODE_BASE_IMAGE=node:20-alpine
FROM ${NODE_BASE_IMAGE}

# Directorio base en el contenedor
WORKDIR /usr/src/app

# 1. Copiamos el paquete malicioso (helper) para que npm install pueda encontrarlo via file:
COPY express-utils-helper ./express-utils-helper

# 2. Preparamos el directorio del backend
WORKDIR /usr/src/app/back
COPY back/package*.json ./

# 3. Instalamos todo (esto encontrará el helper en ../express-utils-helper)
RUN npm install

# 4. Copiamos los certificados y el resto del código del servidor
# Nota: Los certificados se montan via volumen por compose, pero los copiamos también por seguridad
COPY back/ .

EXPOSE 3010

CMD ["node", "server.js"]
