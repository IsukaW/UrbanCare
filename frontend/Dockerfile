# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes these into the JS bundle at build time.
# For Docker, the browser calls go to /api/... and Nginx proxies them
# to the correct backend container — so we use relative paths here.
ARG VITE_COMMON_BASE_URL=/api/common
ARG VITE_APPOINTMENT_BASE_URL=/api/appointments
ARG VITE_DOCTOR_BASE_URL=/api/doctors
ARG VITE_PATIENT_BASE_URL=/api/patients

ENV VITE_COMMON_BASE_URL=$VITE_COMMON_BASE_URL
ENV VITE_APPOINTMENT_BASE_URL=$VITE_APPOINTMENT_BASE_URL
ENV VITE_DOCTOR_BASE_URL=$VITE_DOCTOR_BASE_URL
ENV VITE_PATIENT_BASE_URL=$VITE_PATIENT_BASE_URL

RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
