# 🧪 How to Test the Stock Broker Backend

This guide walks you through every step required to run and test the complete 11-microservice backend locally on your Windows machine.

---

## Step 1: Install Required Software from the Browser

Before you can run the code, you must install two tools:

1. **Go (Golang)**: The programming language the backend is written in.
   * Go to: https://go.dev/dl/
   * Download the **Windows installer** (e.g., `go1.22.x.windows-amd64.msi`).
   * Run the installer and click "Next" through the defaults.

2. **MySQL Server**: The database system.
   * Go to: https://dev.mysql.com/downloads/installer/
   * Download the "MySQL Installer for Windows" (the smaller web installer is fine).
   * Run the installer. Choose the **"Server Only"** or **"Developer Default"** setup.
   * **⚠️ CRUCIAL STEP:** During setup, you will be asked to set a Root Password. Set it to exactly `password` (all lowercase) to match the codebase defaults, OR remember what you set it to.

---

## Step 2: Create the 10 Databases

The Go code will automatically create tables, but **it cannot create databases**.
You must create them manually.

1. Open your terminal or "MySQL Command Line Client".
2. Log in (if using command line):
   ```bash
   mysql -u root -p
   ```
   *(Enter the password you created in Step 1)*
3. Copy and paste the following 10 commands exactly:
   ```sql
   CREATE DATABASE stockbroker_identity;
   CREATE DATABASE stockbroker_portfolio;
   CREATE DATABASE stockbroker_orders;
   CREATE DATABASE stockbroker_prices;
   CREATE DATABASE stockbroker_queue;
   CREATE DATABASE stockbroker_matcher;
   CREATE DATABASE stockbroker_trades;
   CREATE DATABASE stockbroker_market;
   CREATE DATABASE stockbroker_history;
   CREATE DATABASE stockbroker_notifications;
   ```
4. Type `exit` and hit Enter to leave MySQL.

---

## Step 3: Verify the `.env` Files

Every service folder has a `.env` file (e.g., `Backend/identity-service/.env`).
Open one of them and look at this line:
```env
DATABASE_URL=root:password@tcp(localhost:3306)/stockbroker_identity?charset=utf8mb4&parseTime=True&loc=Local
```
* If your MySQL root password from Step 1 is `password`, **you are good to go!**
* If you set a different password (like `1234`), you must change `root:password` to `root:1234` in **all 10 `.env` files**.

---

## Step 4: Install Dependencies

Now you need to tell Go to download all the open-source libraries (Gin, GORM, etc.) for each service.

1. Open a PowerShell terminal.
2. Navigate to your Backend folder:
   ```bash
   cd d:\GC_OpenSoft\Backend
   ```
3. Run these commands one by one to install dependencies for all 11 services:
   ```bash
   cd api-gateway; go mod tidy; cd ..
   cd identity-service; go mod tidy; cd ..
   cd portfolio-service; go mod tidy; cd ..
   cd order-service; go mod tidy; cd ..
   cd price-update-service; go mod tidy; cd ..
   cd queue-processor; go mod tidy; cd ..
   cd order-matcher; go mod tidy; cd ..
   cd trade-executor; go mod tidy; cd ..
   cd market-service; go mod tidy; cd ..
   cd trade-history; go mod tidy; cd ..
   cd notification-service; go mod tidy; cd ..
   ```

---

## Step 5: Start the Services!

You must run *every* service simultaneously. This means you need **11 separate terminals**.

1. **Terminal 1 (API Gateway)**
   ```bash
   cd d:\GC_OpenSoft\Backend\api-gateway
   go run main.go
   ```
2. **Terminal 2 (Identity Service)**
   ```bash
   cd d:\GC_OpenSoft\Backend\identity-service
   go run main.go
   ```
3. **Repeat for terminals 3 through 11** for the remaining 9 folders.
   *(You will see output like `🚀 Identity Service running on :8081` in each window).*

---

## Step 6: Test the System!

With all 11 services running, open one final fresh terminal. Copy and paste these test commands (`curl` is built into Windows).

### 1. Check if the API Gateway is alive
```bash
curl http://localhost:8080/health
```
*(Should return `{"status":"healthy","service":"api-gateway"}`)*

### 2. Register a new user
```bash
curl -X POST http://localhost:8080/api/identity/register -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"username\":\"trader1\",\"password\":\"password123\",\"full_name\":\"Test User\"}"
```

### 3. Log in to get an Auth Token
```bash
curl -X POST http://localhost:8080/api/identity/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"password123\"}"
```
*(Look closely at the output and copy the long string labelled `"access_token"`. You need this for the next step!)*

### 4. Place a Buy Order
*Replace `YOUR_LONG_TOKEN_HERE` with the exact token you copied above.*
```bash
curl -X POST http://localhost:8080/api/orders/buy -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_LONG_TOKEN_HERE" -d "{\"stock_symbol\":\"AAPL\",\"quantity\":10,\"price\":150.50}"
```

### 5. Check your Portfolio
*Look to see if the AAPL stock was added to your portfolio.*
```bash
curl -X GET http://localhost:8080/api/portfolio/portfolio -H "Authorization: Bearer YOUR_LONG_TOKEN_HERE"
```

### What just happened?
When you placed the buy order:
1. The **API Gateway** sent it to the **Order Service**.
2. The Order Service sent it to the **Queue Processor**.
3. The Queue Processor instantly fanned it out to the **Order Matcher**, **Portfolio Service**, and **Notification Service**.
4. You can check the terminals running those services to see the logs!
