# PayDaily POS System - Logic & Architecture Overview

This document provides a comprehensive breakdown of how the PayDaily POS system operates, from the automated startup scripts to the underlying database and frontend logic.

---

## 🏗️ System Architecture

The application follows a **Client-Server architecture** designed for high performance and local reliability.

- **Frontend**: A modern, responsive SPA built with HTML5, Vanilla CSS, and JavaScript.
- **Backend**: A Node.js environment running an Express server.
- **Database**: A local SQLite database (`pos_database.sqlite`) for persistent storage.

---

## 🚀 Deployment & Automation

The system is designed to be "One-Click" for the end-user using Windows Batch scripts.

### 1. `Start_POS.bat`
This script automates the entire boot sequence:
- **Process Management**: It starts the background `node.exe` process targeting `server.js`.
- **Health Check**: It includes a `timeout /t 2` to ensure the server is fully initialized before the browser opens.
- **Auto-Launch**: It automatically opens the default web browser to `http://localhost:3000`.

### 2. `Stop_POS.bat`
This script handles the safe shutdown:
- **Force Termination**: It uses `taskkill /F /IM node.exe /T` to find and stop any running Node.js instances associated with the POS.

---

## 🖥️ Backend Logic (`server.js`)

The backend acts as the bridge between the user interface and the permanent storage.

- **Static File Serving**: The server is configured to serve all root files (`index.html`, `script.js`, `style.css`, and images) automatically.
- **Database Initialization**: 
  - On startup, it connects to `pos_database.sqlite`.
  - It automatically creates the `transactions` table if it doesn't exist, ensuring the app is "ready-to-use" immediately after extraction.
- **API Endpoints**:
  - `GET /api/sales`: Retrieves the entire history of transactions, ordered from newest to oldest.
  - `POST /api/sales`: Receives transaction data (order ID, total, cashier name, date, and item list) and inserts it into the SQLite table.

---

## 🎨 Frontend Logic (`script.js`)

The frontend contains the "Brain" of the POS, handling UI transitions, calculations, and data sync.

### 1. View Routing (`showView`)
The app is a **Single Page Application (SPA)**. Instead of loading new pages, it uses the `showView()` function to toggle the display property of various containers (`home`, `login`, `admin`, `pos`, `settings`).

### 2. Authentication & Authorization
- **Roles**: Supports `manager` and `staff`.
- **Session Management**: Uses `sessionStorage` to keep the user logged in during the current browser session.
- **Interface Switching**: 
  - **Managers** are sent to the **Admin Dashboard**.
  - **Staff** are sent directly to the **POS View** for faster service.

### 3. POS Operations (Point of Sale)
- **Product Management**: The `products` array contains the master list of items (price, category, icons).
- **Cart Logic**: 
  - `addToCart()`: Validates stock levels before adding. If an item is added, it increments the quantity.
  - `updateCartUI()`: Recalculates subtotals, VAT (12%), and totals in real-time.
- **Transaction Completion**: 
  - Once "Pay" is clicked, `completeSale()` generates a unique Order ID.
  - Data is sent to the Backend via a `fetch('POST')` request.
  - Upon success, the **Inventory** is updated (stock subtraction), and the **Admin Dashboard** is refreshed.

### 4. Admin & Analytics
- **Live KPIs**: The dashboard calculates "Sales Today" and "Transaction Count" dynamically by filtering the `allTransactions` array.
- **Data Visualization**: Uses **Chart.js** to render:
  - **Sales Chart**: Line graph showing revenue trends.
  - **Category Chart**: Doughnut chart showing which product categories are most popular.
  - **Reports**: Detailed bar charts for monthly performance.
- **Inventory Control**:
  - Monitors stock levels.
  - Highlights items in "Low Stock" or "Out of Stock" with color-coded status pills.
  - Triggers the **Notification System** for managers.

### 5. Clearance Sale (Promotional Feature)
The Clearance system intelligently identifies slow-moving items and allows managers to apply targeted discounts to drive opportunistic sales.
- **Automated Identification (`forceClearanceScan`)**: 
  - Iterates through the master `products` array and scans `allTransactions` to calculate 14-day sales velocity (`getProductSales`).
  - **Eligibility triggers**: Items with **0-2 sales in 14 days** OR **30+ days in inventory**.
- **Managerial Discount Control (`updateClearanceDiscount`)**: 
  - Allows managers to select predefined discount tiers (10%, 20%, 30%, 50%) for eligible items. 
  - The system updates the active `price` while preserving the `originalPrice` in the local array, setting a `clearance: true` flag.
- **Traffic-Based Activation (`checkWeeklyVolume`)**: 
  - The "Clearance" category pill only appears in the Staff POS if the overall store's weekly sales volume (evaluated via `reportsDataSets.week`) exceeds a set threshold (e.g., ₱5,000). This ensures discounts are only pushed when there is high foot traffic.
- **Core Code Logic**:
  ```javascript
  // 1. Evaluate product sales to find slow movers
  function getProductSales(name, days) {
      // filters allTransactions within the 'days' threshold
      // returns the total quantity sold
  }
  
  // 2. Scanning loop for eligibility (inside forceClearanceScan)
  if (recentSales <= 2 || mockAgeDays >= 30) {
      // Flag as Clearance Eligible
      // Auto-tier discounts:
      if (mockAgeDays >= 90) suggestedDiscount = 50;
      else if (mockAgeDays >= 60) suggestedDiscount = 20;
      else suggestedDiscount = 10;
  }
  
  // 3. Traffic gate logic for UI appearance (inside updateClearanceUI)
  if (clearanceActive && thisWeekTotal > 5000 && activeCount > 0) {
      // Display the distinct Clearance category pill in the POS
      document.querySelector('.clearance-pill').style.display = 'inline-block';
  }
  ```

### 6. Data Persistence Workflow
1. **Startup**: `fetchTransactions()` is called immediately. It pulls all data from the database and populates the `allTransactions` array.
2. **Sales**: Every time a sale is made, it is sent to the server. Even if the browser is closed, the data remains safe in the SQLite file.
3. **Synchronization**: The frontend state and the backend database are always in sync thanks to these API calls.

---

## 📊 Database Schema

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key (Auto-increment) |
| `orderId` | TEXT | Unique ID generated by the frontend (e.g., #PO-12345) |
| `cartTotal` | REAL | The final amount including tax |
| `cashierName` | TEXT | The name of the staff who processed the sale |
| `date` | TEXT | ISO timestamp of the transaction |
| `items` | TEXT | A comma-separated list of items sold for receipt history |

---

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Server**: Express.js
- **Database**: SQLite3
- **Styling**: Vanilla CSS (Custom Variable System)
- **Charts**: Chart.js 4.4.1
- **Icons**: FontAwesome 6.4.0
