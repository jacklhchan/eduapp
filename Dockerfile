FROM node:22-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV STATIC_DIR=/app/static
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /app/dist ./static
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
