# Dockerfile for full-stack Packstack application

# Stage 1: Build React frontend
FROM node:16-alpine AS frontend-build
WORKDIR /app/frontend
COPY src ../frontend
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Flask backend with frontend static files
FROM python:3.9-slim
WORKDIR /app

# Install backend dependencies
COPY server/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy backend code
COPY server/ ./server

# Copy built frontend into Flask static folder
COPY --from=frontend-build /app/frontend/dist ./server/static

# Define working directory and expose port
WORKDIR /app/server
EXPOSE 8080

# Run the Flask app with Gunicorn
CMD ["gunicorn", "--bind=0.0.0.0:8080", "app:app"]
