# Price Update Service

Provides company data and real-time price updates via Debezium CDC. Built with **FastAPI** + **SQLAlchemy** + **MySQL**.

- **Port**: `8084`
- **Database**: MySQL (`stockbroker_prices`) + Debezium
- **Auth**: JWT (shared secret)

## Architecture Flow

```
API Gateway ──"Get Company Data"──▶ Price Update Service ──"Aggregated / Change Data"──▶ API Gateway
Queue Processor ──"Price Change data capture"──▶ Price Update Service
Price Update Service ◀──▶ Debezium (CDC)
```

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/companies` | ❌ | List companies (filter: sector, search) |
| `GET` | `/companies/{symbol}` | ❌ | Aggregated / Change Data for a stock |
| `POST` | `/companies` | ✅ Bearer | Add a new company |
| `PUT` | `/price` | ❌ | Update stock price |
| `POST` | `/cdc` | ❌ (internal) | Price Change data capture (from Queue Processor) |
| `GET` | `/history/{symbol}` | ❌ | Price change history |
| `GET` | `/health` | ❌ | Health check |

## Quick Start

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbroker_prices;"
cd price-update-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8084 --reload
```

Swagger UI: http://localhost:8084/docs
