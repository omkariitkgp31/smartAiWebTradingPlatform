# API Gateway

Central entry point for the Stock Broker microservices. Built with **Go** + **Gin**.

- **Port**: `8080`

## Routes

| Prefix | Downstream | Port |
|---|---|---|
| `/api/identity/*` | Identity Service | 8081 |
| `/api/portfolio/*` | Portfolio Service | 8082 |
| `/api/orders/*` | Order Service | 8083 |
| `/api/prices/*` | Price Update Service | 8084 |

## Quick Start

```bash
cd api-gateway
go mod tidy
go run main.go
```
