# UrbanCare

A full-stack, microservices-based hospital appointment & telemedicine platform built with React, Node.js/Express, MongoDB, and Docker.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Services](#services)
  - [Common Service (Port 5001)](#common-service-port-5001)
  - [Appointment Service (Port 5002)](#appointment-service-port-5002)
  - [Doctor Service (Port 5003)](#doctor-service-port-5003)
  - [Patient Service (Port 5004)](#patient-service-port-5004)
- [Frontend (Port 80/443)](#frontend-port-80443)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running with Docker (Recommended)](#running-with-docker-recommended)
  - [Running Locally (Development)](#running-locally-development)
- [User Roles](#user-roles)
- [Key Features](#key-features)
- [Deployment](#deployment)
  - [Docker Images](#docker-images)
  - [Self-Signed TLS Certificate](#self-signed-tls-certificate)
  - [Deploying to a Remote Server / VM](#deploying-to-a-remote-server--vm)
  - [Deploying Individual Services](#deploying-individual-services)
  - [Health Checks](#health-checks)
  - [Scaling Considerations](#scaling-considerations)
- [License](#license)

---

## Overview

UrbanCare is a distributed healthcare management system that allows patients to find doctors, book appointments, pay online, and consult via video call. Admins manage user approvals and appointment workflows. Doctors manage their profiles, schedules, and consultations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│               Nginx reverse proxy — HTTPS :443               │
└────────┬──────────┬──────────────┬────────────┬─────────────┘
         │          │              │            │
   /api/common  /api/appointments /api/doctors /api/patients
         │          │              │            │
    ┌────▼────┐ ┌───▼────┐  ┌─────▼────┐ ┌────▼──────┐
    │ Common  │ │Appoint-│  │  Doctor  │ │  Patient  │
    │ Service │ │ment    │  │  Service │ │  Service  │
    │  :5001  │ │Service │  │  :5003   │ │  :5004    │
    └────┬────┘ │  :5002 │  └─────┬────┘ └────┬──────┘
         │      └───┬────┘        │            │
    ┌────▼────┐ ┌───▼──────┐ ┌───▼──────┐ ┌───▼──────┐
    │MongoDB  │ │ MongoDB  │ │ MongoDB  │ │ MongoDB  │
    │ common  │ │appoint.  │ │  doctor  │ │ patient  │
    └─────────┘ └──────────┘ └──────────┘ └──────────┘
```

Each service:
- Has its own MongoDB database (fully isolated data)
- Validates JWTs locally without calling Common Service at runtime
- Is independently deployable via its own `Dockerfile`
- Communicates with other services over internal Docker network by hostname

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Ant Design 5, Tailwind CSS 3, Zustand, React Router v6 |
| Backend | Node.js ≥18, Express 4, Mongoose 8, JWT (jsonwebtoken) |
| Database | MongoDB 7 (one instance per service) |
| Payments | Stripe (Payment Intents API) |
| Video Calls | Agora RTC SDK |
| AI | Google Gemini (`@google/generative-ai`) — symptom checker |
| Email | SendGrid + Nodemailer |
| Containerisation | Docker, Docker Compose v3.9 |
| Web Server | Nginx (TLS 1.2/1.3, HTTP→HTTPS redirect) |
| Logging | Pino + pino-http |
| Validation | Joi |
| Security | Helmet, bcryptjs, rate limiting (OTP routes) |

---

## Project Structure

```
UrbanCare/
├── README.md
├── backend/
│   ├── docker-compose.yml          # Orchestrates all services + databases
│   └── services/
│       ├── common-service/         # Auth, users, notifications, payments, video tokens
│       ├── appointment-service/    # Appointment lifecycle management
│       ├── doctor-service/         # Doctor profiles & schedule management
│       └── patient-service/        # Patient profiles, medical records, symptom checker
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                  # Reverse proxy + TLS termination
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/             # Shared components (VideoCall, Layout)
        ├── constants/              # Role & appointment enums
        ├── pages/
        │   ├── admin/              # Admin dashboard, doctors, users, appointments
        │   ├── auth/               # Login, Register, Forgot/Reset Password, OTP
        │   ├── doctor/             # Doctor dashboard, appointments, schedule, profile
        │   └── patient/            # Book appointment, medical records, consultation
        ├── router/                 # AppRouter, ProtectedRoute, RoleRoute
        ├── services/               # Axios API client modules per service
        ├── store/                  # Zustand auth store
        └── utils/                  # Token helpers, HTTP clients, schema utilities
```

---

## Services

### Common Service (Port 5001)

Central service for authentication, user management, notifications, payments, and video tokens.

**Responsibilities:**
- JWT-based registration and login
- OTP-based forgot/reset password flow with rate limiting (5 req / 15 min / IP)
- User CRUD and admin approval/rejection workflow
- SendGrid email notifications
- Stripe Payment Intent creation & confirmation
- Agora RTC token generation for video consultations
- Document (file) upload/download storage

**Key routes:**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and receive JWT |
| POST | `/auth/forgot-password` | Public (rate limited) | Send OTP to email |
| POST | `/auth/verify-code` | Public (rate limited) | Verify OTP code |
| POST | `/auth/reset-password` | Public | Reset password with verified OTP |
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Authenticated | Get user by ID |
| PATCH | `/users/:id` | Authenticated | Update user |
| POST | `/users/:id/approve` | Admin | Approve pending user |
| POST | `/users/:id/reject` | Admin | Reject pending user |
| POST | `/payments/intent` | All roles | Create Stripe Payment Intent |
| POST | `/payments/intent/:id/confirm` | All roles | Confirm payment |
| GET | `/payments/intent/:id` | All roles | Get payment intent status |
| POST | `/video/token` | Doctor, Patient, Admin | Generate Agora RTC token |

---

### Appointment Service (Port 5002)

Handles the full appointment lifecycle including booking, cancellation, reschedule, and payment confirmation.

**Key routes:**

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/search` | All roles | Search available doctors by specialty/date |
| POST | `/` | All roles | Book a new appointment |
| GET | `/` | All roles | List appointments (with filters) |
| GET | `/:id` | All roles | Get appointment details |
| GET | `/:id/status` | All roles | Get appointment status |
| PUT | `/:id` | All roles | Update appointment (date/slot/time) |
| POST | `/:id/request-cancellation` | Admin, Patient | Patient requests cancellation |
| PUT | `/:id/approve-cancellation` | Admin | Approve or reject cancellation |
| POST | `/:id/offer-reschedule` | Admin | Offer a reschedule to the patient |
| PUT | `/:id/confirm-reschedule` | Admin, Patient | Confirm reschedule |
| POST | `/:id/confirm-payment` | Admin, Patient | Confirm Stripe payment for appointment |
| POST | `/payments/webhook` | Internal | Payment webhook from Common Service |

---

### Doctor Service (Port 5003)

Manages doctor profiles, schedules, and slot reservation/release.

**Key routes:**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor | Create doctor profile |
| GET | `/` | All roles | List all doctors |
| GET | `/user/:userId` | All roles | Resolve doctor profile by auth user ID |
| GET | `/:id` | All roles | Get doctor by ID |
| PATCH | `/:id` | Doctor | Update doctor profile |
| DELETE | `/:id` | Admin | Delete doctor |
| PATCH | `/:id/schedule` | Admin, Doctor | Update weekly schedule |
| GET | `/:id/schedule` | All roles | Get doctor schedule |
| GET | `/:id/slots/available` | All roles | List available slots |
| GET | `/:id/slots/reserved` | All roles | List reserved slots |
| POST | `/:id/slots/:slotId/reserve` | All roles | Reserve a slot |
| POST | `/:id/slots/:slotId/release` | All roles | Release a slot |
| POST | `/:id/photo` | Doctor | Upload profile photo |

---

### Patient Service (Port 5004)

Manages patient profiles, medical history, uploaded documents, and AI-powered symptom checking.

**Key routes:**

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/patients` | Admin, Patient | Create patient profile |
| GET | `/patients/:id` | All roles | Get patient profile |
| PATCH | `/patients/:id` | Admin, Patient | Update patient profile |
| PATCH | `/patients/:id/history` | Admin, Doctor | Update patient medical history |
| POST | `/patients/:id/documents` | All roles | Upload medical document |
| GET | `/patients/:id/documents` | All roles | List documents |
| GET | `/patients/:id/documents/:docId` | All roles | View document inline |
| GET | `/patients/:id/documents/:docId/download` | All roles | Download document |
| DELETE | `/patients/:id/documents/:docId` | All roles | Delete document |
| POST | `/symptoms/analyse` | Patient, Admin | AI symptom analysis (Gemini) |

---

## Frontend (Port 80/443)

Single-page React application served by Nginx with HTTPS. Nginx acts as a reverse proxy, stripping API path prefixes and forwarding to each backend service.

**Proxy routing (Nginx in production / Vite dev server):**

| Frontend path prefix | Proxied to |
|---|---|
| `/api/common/` | `common-service:5001` |
| `/api/appointments/` | `appointment-service:5002` |
| `/api/doctors/` | `doctor-service:5003` |
| `/api/patients/` | `patient-service:5004` |

**Page structure by role:**

| Role | Pages |
|---|---|
| Public | Login, Register, Forgot/Reset Password, Verify OTP |
| Admin | Dashboard, Doctors, Users, Appointments, Profile |
| Doctor | Dashboard, Appointments, Schedule, Profile |
| Patient | Book Appointment, Appointments, Medical Records, Consultation Panel |

**State management:** Zustand (`authStore`) for authentication state and JWT token.

**Dev server:** runs on `https://localhost:3000` (self-signed TLS via `@vitejs/plugin-basic-ssl`).

---

## API Reference

All authenticated endpoints require the `Authorization: Bearer <token>` header.

Tokens are issued by `POST /auth/login` on the Common Service and validated locally by every other service using the shared JWT secret.

---

## Environment Variables

Each service reads from its own `.env` file. Create these before running locally.

### `backend/services/common-service/.env`

```env
PORT=5001
MONGODB_URI=mongodb://mongodb-common:27017/common
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# SendGrid
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Agora
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

### `backend/services/appointment-service/.env`

```env
PORT=5002
MONGODB_URI=mongodb://mongodb-appointment:27017/appointment
JWT_SECRET=your_jwt_secret
```

### `backend/services/doctor-service/.env`

```env
PORT=5003
MONGODB_URI=mongodb://mongodb-doctor:27017/doctor
JWT_SECRET=your_jwt_secret
```

### `backend/services/patient-service/.env`

```env
PORT=5004
MONGODB_URI=mongodb://mongodb-patient:27017/patient
JWT_SECRET=your_jwt_secret

# Google Gemini (symptom checker)
GEMINI_API_KEY=your_gemini_api_key
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24
- [Node.js](https://nodejs.org/) ≥ 18 (for local development only)
- [npm](https://www.npmjs.com/) ≥ 9 (for local development only)

### Running with Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/UrbanCare.git
   cd UrbanCare
   ```

2. **Create `.env` files** for each service (see [Environment Variables](#environment-variables)).

3. **Build and start all services**

   ```bash
   cd backend
   docker compose up --build
   ```

   This starts:
   - `frontend` — React app at `https://localhost` (port 443)
   - `common-service` — `http://localhost:5001`
   - `appointment-service` — `http://localhost:5002`
   - `doctor-service` — `http://localhost:5003`
   - `patient-service` — `http://localhost:5004`
   - Four MongoDB instances with named volumes for persistence

4. **Custom server IP** (for LAN / cloud deployment):

   ```bash
   SERVER_IP=192.168.1.100 docker compose up --build
   ```

5. **Stop services**

   ```bash
   docker compose down
   ```

   To also remove persisted data volumes:

   ```bash
   docker compose down -v
   ```

---

### Running Locally (Development)

Run each service independently for hot-reload development.

1. **Start MongoDB** (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas)):

   Update each service's `.env` `MONGODB_URI` to point to your local MongoDB.

2. **Start each backend service** (in separate terminals):

   ```bash
   # Common Service
   cd backend/services/common-service && npm install && npm run dev

   # Appointment Service
   cd backend/services/appointment-service && npm install && npm run dev

   # Doctor Service
   cd backend/services/doctor-service && npm install && npm run dev

   # Patient Service
   cd backend/services/patient-service && npm install && npm run dev
   ```

3. **Start the frontend**:

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Open [https://localhost:3000](https://localhost:3000). Accept the self-signed certificate warning.

---

## User Roles

| Role | Description |
|---|---|
| `admin` | Full access — manage users, approve registrations, oversee appointments |
| `doctor` | Manage own profile & schedule; view and handle assigned appointments; conduct video consultations |
| `patient` | Search doctors, book appointments, pay online, view medical records, use symptom checker, join video calls |

New user accounts require **admin approval** before they can log in.

---

## Key Features

- **Authentication** — JWT-based auth with OTP email verification for password reset; rate-limited OTP endpoints
- **Role-based access control** — enforced at every API endpoint via middleware
- **Appointment lifecycle** — booking → payment → confirmation → cancellation request → admin approval → reschedule workflow
- **Online payments** — Stripe Payment Intents with webhook support
- **Video consultations** — Agora RTC token generation and in-browser video call UI
- **Doctor scheduling** — weekly schedule management with slot reservation/release
- **Medical records** — file upload, inline view, and download for patient documents
- **AI symptom checker** — powered by Google Gemini
- **Admin dashboard** — user approval workflow, doctor and appointment management
- **PDF export** — jsPDF + jsPDF-AutoTable for downloadable reports
- **Security** — Helmet headers, CORS, Joi input validation, bcrypt password hashing, per-route rate limiting
- **Structured logging** — Pino with request/response serialisation across all services
- **Containerised** — full Docker Compose stack with isolated MongoDB volumes and Nginx TLS termination

---

## Deployment

### Docker Images

Every service has its own `Dockerfile` that produces a lean production image:

| Service | Base image | Build strategy | Exposed port |
|---|---|---|---|
| `frontend` | `node:20-alpine` → `nginx:alpine` | Multi-stage (Vite build + Nginx serve) | 80, 443 |
| `common-service` | `node:18-alpine` | Single-stage, `--omit=dev` | 5001 |
| `appointment-service` | `node:18-alpine` | Single-stage, `--omit=dev` | 5002 |
| `doctor-service` | `node:18-alpine` | Single-stage, `--omit=dev` | 5003 |
| `patient-service` | `node:18-alpine` | Single-stage, `--omit=dev` | 5004 |

The frontend image uses a **multi-stage build**:
1. **Stage 1 (`builder`)** — installs dependencies with `npm ci` and runs `vite build`. API base URLs are baked in as build-time `ARG`s (`/api/common`, `/api/appointments`, `/api/doctors`, `/api/patients`) so the browser always uses relative paths routed through Nginx.
2. **Stage 2** — copies the compiled `dist/` into `nginx:alpine` and installs `openssl` for TLS certificate generation.

---

### Self-Signed TLS Certificate

The frontend container's entrypoint script (`docker-entrypoint.sh`) auto-generates a **self-signed RSA-2048 TLS certificate** at startup using OpenSSL:

```sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out    /etc/nginx/ssl/cert.pem \
  -subj   "/CN=urbancare" \
  -addext "subjectAltName=IP:${SERVER_IP}"
```

The `SERVER_IP` environment variable controls the certificate's Subject Alternative Name (SAN), which is required for browsers to trust the cert when accessing via IP address.

- **Local:** `SERVER_IP` defaults to `localhost`
- **Remote server / VM:** set `SERVER_IP` to the machine's LAN or public IP

Nginx is configured to:
- Listen on port **80**, redirect all traffic to HTTPS
- Listen on port **443 SSL** (TLS 1.2 / 1.3)
- Serve the React SPA with an `index.html` fallback for React Router
- Reverse-proxy `/api/common/`, `/api/appointments/`, `/api/doctors/`, `/api/patients/` to the corresponding backend containers

> **Production note:** Replace the self-signed certificate with a certificate from a trusted CA (e.g. Let's Encrypt / Certbot) and mount it into the container at `/etc/nginx/ssl/cert.pem` and `/etc/nginx/ssl/key.pem`.

---

### Deploying to a Remote Server / VM

The recommended approach for a single-server deployment (e.g. AWS EC2, DigitalOcean Droplet, Azure VM):

1. **Install Docker & Docker Compose** on the server:

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **Clone the repository** on the server:

   ```bash
   git clone https://github.com/IsukaW/UrbanCare.git
   cd UrbanCare
   ```

3. **Create `.env` files** for each service under `backend/services/<service-name>/.env` (see [Environment Variables](#environment-variables)).

4. **Set `SERVER_IP`** to the server's public or LAN IP so the TLS certificate SAN matches:

   ```bash
   export SERVER_IP=<your-server-ip>
   ```

5. **Build and start** in detached mode:

   ```bash
   cd backend
   SERVER_IP=$SERVER_IP docker compose up --build -d
   ```

6. **Open firewall ports** 80 and 443 (and optionally 5001–5004 if you need direct backend access).

7. **Check running services:**

   ```bash
   docker compose ps
   ```

8. **View logs** for a specific service:

   ```bash
   docker compose logs -f common-service
   ```

9. **Update and redeploy** after code changes:

   ```bash
   git pull
   docker compose up --build -d
   ```

---

### Deploying Individual Services

Each service can be built and run in isolation:

```bash
# Build a single service image
docker build -t urbancare/common-service ./backend/services/common-service

# Run it
docker run -d \
  --name common-service \
  -p 5001:5001 \
  --env-file ./backend/services/common-service/.env \
  urbancare/common-service
```

For the frontend, pass the `SERVER_IP` build arg:

```bash
docker build \
  --build-arg SERVER_IP=<your-server-ip> \
  -t urbancare/frontend ./frontend

docker run -d \
  --name frontend \
  -p 80:80 -p 443:443 \
  -e SERVER_IP=<your-server-ip> \
  urbancare/frontend
```

---

### Health Checks

Each backend service exposes a `/health` endpoint that returns `200 OK`:

```bash
curl http://localhost:5001/health
# {"status":"ok","service":"common-service"}

curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
```

Use these endpoints with Docker health checks, load balancers (e.g. AWS ALB), or uptime monitors.

---

### Scaling Considerations

| Concern | Recommendation |
|---|---|
| Multiple replicas | Use Docker Swarm or Kubernetes; each service is stateless — JWTs validated locally, no shared server-side session |
| MongoDB in production | Use MongoDB Atlas (managed) or a replica set instead of single-container MongoDB |
| TLS in production | Use Let's Encrypt + Certbot, or terminate TLS at a cloud load balancer and pass `X-Forwarded-Proto` headers |
| Secrets management | Use Docker secrets, AWS Secrets Manager, or HashiCorp Vault instead of plain `.env` files |
| Image registry | Push images to Docker Hub, AWS ECR, or GitHub Container Registry for CI/CD pipelines |
| CI/CD | Add a GitHub Actions workflow to build, test, push images, and trigger deployment on merge to `main` |

---

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.


