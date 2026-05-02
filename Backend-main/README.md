# Go JWT Auth Backend (Production-Ready)

This project provides a production-grade authentication backend in Go using:
- Gin (HTTP framework)
- PostgreSQL/MySQL with GORM
- JWT access + refresh tokens
- Email OTP verification over SMTP
- Rate limiting + brute-force protections

## Features

- Email/password registration with bcrypt hashing
- OTP generation, hashing (SHA-256 + pepper), expiry, and SMTP delivery
- OTP verification flow with attempt limits and invalidation
- Verified-user-only login with JWT access token and refresh token
- JWT middleware for protected routes
- Global IP rate limiting and endpoint brute-force controls
- Background cleanup job for expired OTPs
- Structured logging + recovery middleware
- Dockerfile + docker-compose support

## Project Structure

```text
.
├── cmd
│   └── server
│       └── main.go
├── config
│   └── config.go
├── internal
│   ├── handlers
│   ├── jobs
│   ├── middleware
│   ├── models
│   ├── repository
│   ├── router
│   ├── services
│   └── utils
├── docs
│   └── sample_requests.md
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── .env.example
```

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill required values:
   - `JWT_SECRET` (32+ chars)
   - `OTP_HASH_PEPPER`
   - SMTP credentials (`SMTP_*`)
3. For local SMTP-less testing, keep `SMTP_MOCK=true` (OTP logs in server output).

## Run Locally

1. Start PostgreSQL (or MySQL) and update `.env`.
2. Install dependencies:

```bash
go mod tidy
```

3. Run server:

```bash
go run ./cmd/server
```

Server starts at `http://localhost:8080`.

## Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

## API Endpoints

- `POST /register`
- `POST /verify-otp`
- `POST /login`
- `POST /resend-otp`
- `POST /refresh` (bonus refresh flow)
- `GET /me` (protected)
- `GET /health`

Request examples are in [`docs/sample_requests.md`](docs/sample_requests.md).

## Database Schema Notes

- `users` table:
  - `id` (UUID-like string primary key)
  - `email` (unique index)
  - `password_hash`
  - `is_verified`
  - timestamps
- `otps` table:
  - `id`
  - `email` (indexed)
  - `otp_hash` (hashed, not plaintext)
  - `expires_at` (indexed)
  - `attempts`
  - `created_at`
- Composite index on `otps(email, expires_at)` for lookup + cleanup efficiency.

## Security Controls

- bcrypt password hashing
- OTP hashing with SHA-256 + pepper
- OTP expiry (5-10 minutes configurable)
- OTP request cooldown and per-hour limits
- OTP verification attempt limits
- Login attempt limiting per email+IP window
- JWT secret from environment variables
- JWT claim validation (`iss`, token type, expiry)
- Prepared statements + connection pool config

## Production Notes

- Run behind HTTPS termination (Nginx/ALB/Ingress).
- For multi-instance deployments, move in-memory brute-force limiters to Redis.
- Use external log aggregation and secret manager for env values.
