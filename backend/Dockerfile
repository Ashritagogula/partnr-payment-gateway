FROM node:18-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install

COPY backend/src ./src
COPY dashboard ./dashboard

EXPOSE 8000

CMD ["node", "src/server.js"]
