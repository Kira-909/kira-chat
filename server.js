const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

// Setup WebSocket server
const wss = new WebSocket.Server({ server });

// Open SQLite database (creates file if doesn't exist)
const db = new sqlite3.Database('./chat.db', (err) => {
  if (err) {
    console.error('Failed to open DB', err);
    process.exit(1);
  }
  console.log('Connected to SQLite DB');

  // Create messages table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
});

let clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send last 100 messages to new client (oldest first)
  db.all('SELECT username, text, timestamp FROM messages ORDER BY id DESC LIMIT 100', [], (err, rows) => {
    if (err) {
      console.error('DB fetch error', err);
      ws.send(JSON.stringify({ type: 'history', data: [] }));
      return;
    }
    ws.send(JSON.stringify({ type: 'history', data: rows.reverse() }));
  });

  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg);

      if (message.type === 'message' && message.username && message.text) {
        const fullMsg = {
          username: message.username,
          text: message.text,
          timestamp: Date.now(),
        };

        // Save message to DB
        db.run(
          'INSERT INTO messages (username, text, timestamp) VALUES (?, ?, ?)',
          [fullMsg.username, fullMsg.text, fullMsg.timestamp],
          function (err) {
            if (err) {
              console.error('DB insert error', err);
              return;
            }

            // Broadcast new message to all connected clients
            const broadcast = JSON.stringify({ type: 'message', data: fullMsg });
            clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcast);
              }
            });
          }
        );
      }
    } catch (e) {
      console.error('Invalid message received', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});
