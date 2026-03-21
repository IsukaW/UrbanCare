# Hospital Appointment System - Microservices Backend

Production-ready Node.js + Express.js backend composed of 4 independently deployable services.

## Architecture

- Common Service (`5001`): Auth, user management, notifications (SendGrid + Twilio)
- Appointment Service (`5002`): Appointment CRUD + notification trigger through Common Service
- Doctor Service (`5003`): Doctor profiles and schedules
- Patient Service (`5004`): Patient profiles and medical history

Each service has:

- Its own source code, middleware, config, and utils
- Its own database connection
- Its own Dockerfile and runtime env contract
- Local JWT validation and role-based authorization middleware

## Folder Structure

```text
backend/
  services/
    common-service/
    appointment-service/
    doctor-service/
    patient-service/
  docker-compose.yml
  .env.common-service.example
  .env.appointment-service.example
  .env.doctor-service.example
  .env.patient-service.example
```

## Required Environment Variables

Per service:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`

Common service only:

- `JWT_EXPIRES_IN`
- `TWILIO_API_KEY`
- `TWILIO_API_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_FROM_NUMBER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

Appointment service only:

- `COMMON_SERVICE_URL`

## API Endpoints

### Common Service

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/:id`
- `PATCH /users/:id`
- `POST /notify/email`
- `POST /notify/sms`

### Appointment Service

- `POST /appointments`
- `GET /appointments/:id`
- `PATCH /appointments/:id`
- `DELETE /appointments/:id`

### Doctor Service

- `POST /doctors`
- `GET /doctors`
- `GET /doctors/:id`
- `PATCH /doctors/:id/schedule`

### Patient Service

- `POST /patients`
- `GET /patients/:id`
- `PATCH /patients/:id/history`

## Local Run with Docker Compose

1. Copy example env files and populate secrets:

```bash
cp backend/.env.common-service.example backend/services/common-service/.env
cp backend/.env.appointment-service.example backend/services/appointment-service/.env
cp backend/.env.doctor-service.example backend/services/doctor-service/.env
cp backend/.env.patient-service.example backend/services/patient-service/.env
```

2. Start all services:

```bash
cd backend
docker compose up --build -d
```

3. Check health:

```bash
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
curl http://localhost:5004/health
```

## Independent Service Build/Run

Example for Common Service:

```bash
cd backend/services/common-service
docker build -t common-service:latest .
docker run --rm -p 5001:5001 --env-file .env common-service:latest
```

Use equivalent commands for each service by changing folder, image name, port, and env file.

## CI/CD (GitHub Actions)

Workflows are in repository root `.github/workflows`:

- `common-service.yml`
- `appointment-service.yml`
- `doctor-service.yml`
- `patient-service.yml`

Each workflow:

1. Triggers only on service-specific path changes
2. Builds and pushes Docker image
3. Deploys via SSH to production host
4. Restarts service container
5. Attempts rollback on failure

### Required GitHub Secrets

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `PROD_HOST`
- `PROD_USER`
- `PROD_SSH_KEY`

## Production Hardening Checklist

- Put all services behind Nginx/Traefik reverse proxy with HTTPS
- Restrict inter-service network access with firewall/security groups
- Store secrets in vault/secret manager (not plaintext env files)
- Set up centralized log aggregation from JSON logs (Pino)
- Add rate limiting and API gateway policies
- Add health checks and container restart policies in orchestration
- Add backups for each service database

## RBAC Model

- `admin`: Full control across services
- `doctor`: Doctor profile/schedule management, can access relevant appointment and patient operations
- `patient`: Patient profile access and appointment operations scoped by ownership

## Notes

- All third-party notification integrations are isolated in Common Service only.
- JWT is validated locally in every service without calling Common Service per request.
- Middleware/util/config code is copied into each service for independent deployable images.
