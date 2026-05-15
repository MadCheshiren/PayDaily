const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Serve frontend files from public/
app.use(express.static(publicDir));
// Serve node_modules under /vendor so index.html can reference them
app.use('/vendor', express.static(path.join(rootDir, 'node_modules')));

// Explicitly send index.html when visitors hit the root domain
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'data', 'pos_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create transactions table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT,
            cartTotal REAL,
            cashierName TEXT,
            date TEXT,
            items TEXT
        )`);
    }
});

// POST route to save a sale securely to the database
app.post('/api/sales', (req, res) => {
    const { orderId, cartTotal, cashierName, date, items } = req.body;
    const query = `INSERT INTO transactions (orderId, cartTotal, cashierName, date, items) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [orderId, cartTotal, cashierName, date, items], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save transaction' });
        res.status(201).json({ success: true });
    });
});

// GET route to fetch all sales from the database on page load
app.get('/api/sales', (req, res) => {
    db.all("SELECT * FROM transactions ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve transactions' });
        res.json({ success: true, data: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
