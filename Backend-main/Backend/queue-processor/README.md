# Queue Processor

Central event hub for the Stock Broker system. Receives Buy/Sell events and fans out to 5 downstream services. Built with **FastAPI** + **SQLAlchemy** + **MySQL** + **httpx**.

- **Port**: `8085`
- **Database**: MySQL (`stockbroker_queue`) — event store

## Architecture Flow

```
Buy Node  ──▶ Queue Processor ──▶ Order Matcher
Sell Node ──▶ Queue Processor ──▶ Market (topic)
                              ──▶ Notification / Alert
                              ──▶ Portfolio Service ("Update Portfolio")
                              ──▶ Price Update Service ("Price Change data capture")
```

## Fan-out Targets

| Target | URL | Payload |
|---|---|---|
| Order Matcher | `:8086/match` | Full order data |
| Market (topic) | `:8089/publish` | Full order data |
| Notification / Alert | `:8090/notify` | User notification |
| Portfolio Service | `:8082/update` | Update Portfolio |
| Price Update Service | `:8084/cdc` | Price Change CDC |

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/buy` | Receive buy event, fan-out to all 5 targets |
| `POST` | `/sell` | Receive sell event, fan-out to all 5 targets |
| `GET` | `/events` | View processed events log (filter: type, status) |
| `GET` | `/health` | Health check |

## Quick Start

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS stockbroker_queue;"
cd queue-processor
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload
```

Swagger UI: http://localhost:8085/docs
