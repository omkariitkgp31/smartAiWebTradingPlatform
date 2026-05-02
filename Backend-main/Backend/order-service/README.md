# Order Service

Handles buy and sell order requests. Built with **FastAPI** + **SQLAlchemy** + **MySQL**.

- **Port**: `8083`
- **Database**: MySQL (`stockbroker_orders`)
- **Auth**: JWT (shared secret with Identity Service)

## Architecture Flow

```
API Gateway  ──"Buy / Sell Request"──▶  Order Service
Order Service ──"Buy Request"──▶ Buy Node ──▶ Queue Processor
Order Service ──"Sell Request"──▶ Sell Node ──▶ Queue Processor
API Gateway  ◀──"Order Placed Response"── Order Service
```

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/buy` | ✅ Bearer | Place a buy order |
| `POST` | `/sell` | ✅ Bearer | Place a sell order |
| `GET` | `/` | ✅ Bearer | List user's orders (filters: type, status) |
| `GET` | `/{order_id}` | ✅ Bearer | Get order details |
| `DELETE` | `/{order_id}` | ✅ Bearer | Cancel a pending/placed order |
| `GET` | `/health` | ❌ | Health check |

## Quick Start

```bash
# 1. Create the database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbroker_orders;"

# 2. Update .env with your MySQL credentials

# 3. Install & run
cd order-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8083 --reload
```

Swagger UI: http://localhost:8083/docs

## Project Structure

```
order-service/
├── .env
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py               # FastAPI app, auto-creates tables
    ├── config.py              # Pydantic settings
    ├── database.py            # SQLAlchemy engine & session
    ├── models.py              # Order model (BUY/SELL, status lifecycle)
    ├── schemas.py             # Request / Response schemas
    ├── auth.py                # JWT validation (shared secret)
    ├── queue_dispatcher.py    # Sends events to Queue Processor
    └── routes/
        ├── __init__.py
        └── orders.py          # Buy, Sell, List, Get, Cancel
```
