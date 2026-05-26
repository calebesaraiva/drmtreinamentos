FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY backend ./backend
COPY src/data ./src/data
COPY public ./public

EXPOSE 3001

CMD ["node", "backend/server.js"]
