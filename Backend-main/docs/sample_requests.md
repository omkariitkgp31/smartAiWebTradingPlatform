# Sample cURL Requests

Base URL:

```bash
BASE_URL=http://localhost:8080
```

## 1) Register

```bash
curl -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Passw0rd123"
  }'
```

## 2) Verify OTP

```bash
curl -X POST "$BASE_URL/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "otp": "123456"
  }'
```

## 3) Login

```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Passw0rd123"
  }'
```

## 4) Resend OTP

```bash
curl -X POST "$BASE_URL/resend-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com"
  }'
```

## 5) Refresh Token

```bash
curl -X POST "$BASE_URL/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

## 6) Protected Route `/me`

```bash
curl -X GET "$BASE_URL/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
