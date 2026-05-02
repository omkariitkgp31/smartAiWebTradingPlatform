# Identity Service

Handles user authentication, registration, and JWT token management. Built with **FastAPI** + **SQLAlchemy** + **MySQL**.

- **Port**: `8081`
- **Database**: MySQL (`stockbroker_identity`)

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ❌ | Register a new user |
| `POST` | `/login` | ❌ | Login → access + refresh tokens |
| `POST` | `/refresh` | ❌ | Refresh expired access token |
| `GET` | `/me` | ✅ Bearer | Get current user profile |
| `PUT` | `/me` | ✅ Bearer | Update profile |
| `GET` | `/health` | ❌ | Health check |

## Quick Start

```bash
# 1. Ensure MySQL is running and create the database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbroker_identity;"

# 2. Install dependencies
cd identity-service
pip install -r requirements.txt

# 3. Update .env with your MySQL credentials

# 4. Run
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```

Swagger UI: http://localhost:8081/docs

## Project Structure

```
identity-service/
├── .env
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py         # FastAPI app, auto-creates tables
    ├── config.py       # Pydantic settings
    ├── database.py     # SQLAlchemy engine & session
    ├── models.py       # User model
    ├── schemas.py      # Request / Response schemas
    ├── auth.py         # JWT + bcrypt utilities
    └── routes/
        ├── __init__.py
        └── auth.py     # Auth endpoints
```
