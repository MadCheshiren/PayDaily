# PayDaily

**PayDaily** is a web-based Point-of-Sale (POS) and Financial Management Information System built for retail stores. It provides a complete digital solution to track sales, monitor inventory, and view real-time financial performance.

> **Pay + Daily** — "Pay" represents the financial and payment side of the system, while "Daily" reflects the goal of real-time, everyday visibility into the business.

---

## Features

### Core Features

- **Fast Checkout** — Process any sale in under 30 seconds with one-tap product selection, instant price calculation, and receipt printing
- **Stock Tracking** — Automatic inventory updates after every sale; know what's on your shelves without manual counting
- **Daily Reports** — Real-time sales reports generated automatically; see best sellers and revenue trends at a glance
- **Role-Based Access** — Separate views and permissions for Staff (POS only) and Manager (full dashboard access)
- **Works Offline** — No internet? No problem. Everything saves locally using browser storage

### Additional Features

- **Clearance Sale Management** — Identify slow-moving items and apply discounts to push inventory
- **Transaction History** — Complete log of all sales with searchable records
- **Export to CSV** — Download transaction and sales reports for external analysis
- **Dark Mode** — Toggle between light and dark themes for comfortable viewing

---

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Styling**: Custom CSS with CSS variables for theming
- **Icons**: FontAwesome + Custom SVG illustrations
- **Charts**: Chart.js for analytics and reports
- **Fonts**: Plus Jakarta Sans
- **Backend**: Node.js with Express
- **Database**: SQLite3 (persistent storage)

### Included Files
- `node.exe` — Portable Node.js runtime (no installation required)
- `Start_POS.bat` — One-click server startup script
- `Stop_POS.bat` — Server shutdown script
- `server.js` — Express server with SQLite database
- `pos_database.sqlite` — Local SQLite database for transactions

---

## Getting Started

### Prerequisites

- Windows OS (for batch file support)
- Modern web browser (Chrome/Edge/Firefox/Safari)
- **No Node.js installation required** — `node.exe` is included

### Quick Start (Recommended)

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/MadCheshiren/PayDaily.git
   cd PayDaily
   ```

2. **Start the server**
   
   Simply double-click **`Start_POS.bat`** or run it from command prompt:
   ```bash
   Start_POS.bat
   ```
   
   This will:
   - Start the local Node.js server (using included `node.exe`)
   - Wait 2 seconds for server boot
   - Open `http://localhost:3000` in your default browser

3. **Stop the server**
   
   Double-click **`Stop_POS.bat`** or run:
   ```bash
   Stop_POS.bat
   ```
   
   This force-stops the Node.js server process.

### Alternative: Frontend-Only Mode

If you only need the POS without database persistence, simply open `index.html` directly in your browser. The app works completely offline with browser local storage, but transaction history won't persist between sessions.

---

## Usage

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Manager | `manager` | `manager123` |
| Staff | `staff` | `staff123` |

### Manager Dashboard
- View real-time sales metrics and KPIs
- Manage inventory and stock levels
- Review transaction history
- Generate sales reports
- Manage clearance sales and discounts
- Add/remove staff members

### Staff POS
- Quick product search and category filtering
- Add items to cart with one click
- Automatic total calculation
- Cash input with quick denomination buttons
- Printable receipts
- Process refunds

---

## Project Structure

```
PayDaily/
├── index.html              # Main application (all views)
├── style.css               # Global styles and themes
├── script.js               # Application logic and state management
├── server.js               # Express backend server
├── node.exe                # Portable Node.js runtime (no install needed)
├── Start_POS.bat           # One-click server startup
├── Stop_POS.bat            # Server shutdown script
├── pos_database.sqlite     # SQLite database for transactions
├── package.json            # Dependencies
├── .gitignore              # Git ignore rules
├── PayDailyLogo.png        # App logo
└── PayTeodilStore.png      # Store branding (optional)
```

---

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Works on desktop and tablet devices

---

## Authors

- **Fraginal**
- **Navarro**
- **Palmero**

BSIT-3 | Web Systems & MIS

---

## License

ISC License

---

## Acknowledgments

Built as a capstone project for Web Systems & MIS course. Designed for sari-sari stores and small retail businesses across the Philippines.
