# Portfolio Service

Manages user portfolios and stock holdings. Built with **FastAPI** + **SQLAlchemy** + **MySQL**.

- **Port**: `8082`
- **Database**: MySQL (`stockbroker_portfolio`)
- **Auth**: JWT (shared secret with Identity Service)

## Architecture Flow

```
API Gateway ──"Get Portfolio Details"──▶ Portfolio Service ──"Portfolio Response"──▶ API Gateway
Queue Processor ──"Update Portfolio"──▶ Portfolio Service
```

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ Bearer | Get full portfolio (all holdings) |
| `GET` | `/holdings/{symbol}` | ✅ Bearer | Get holding for a specific stock |
| `POST` | `/update` | ❌ (internal) | Update Portfolio (from Queue Processor) |
| `GET` | `/transactions` | ✅ Bearer | Transaction history (filter: stock, type) |
| `GET` | `/health` | ❌ | Health check |

## Quick Start

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbroker_portfolio;"
cd portfolio-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload
```

Swagger UI: http://localhost:8082/docs

## Project Structure

```
portfolio-service/
├── .env
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py             # FastAPI app
    ├── config.py           # Settings
    ├── database.py         # SQLAlchemy
    ├── models.py           # Holding + Transaction models
    ├── schemas.py          # Pydantic schemas
    ├── auth.py             # JWT validation
    └── routes/
        ├── __init__.py
        └── portfolio.py    # All endpoints
```
