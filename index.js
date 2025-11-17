// ======================================================
// UPLOAD UNIVERSE — MASTER PROTOTYPE SERVER
// Node.js + Express + Socket.IO
// ======================================================

// ------------------------
// 1. IMPORTS
// ------------------------
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser"); // FIXED
const crypto = require("crypto");
const fs = require("fs");

// ------------------------
// 2. APP + SERVER INIT
// ------------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.json());

// Serve frontend (public folder)
app.use(express.static(path.join(__dirname, "public")));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------
// 3. AVATAR CREATION API
// ------------------------
app.post("/api/create-avatar", (req, res) => {
  const { name, starterCity } = req.body;

  if (!name || !starterCity) {
    return res.status(400).json({ error: "Name and starter city are required" });
  }

  const id = crypto.randomBytes(8).toString("hex");

  const avatar = {
    id,
    name,
    starterCity,
    createdAt: new Date().toISOString(),
  };

  // Save avatar list
  const filePath = path.join(__dirname, "avatars.json");
  let list = [];

  if (fs.existsSync(filePath)) {
    list = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  list.push(avatar);
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));

  res.json({ success: true, avatar });
});

// ------------------------
// 4. WORLD MODELS (TEMP DATA)
// ------------------------
let users = {}; // Active players
let cities = {}; // City map & navigation
let vehicles = {}; // Cars, bus, train
let musicArtists = {}; // AI label artists
let economy = {}; // Player balances

// ------------------------
// 5. DEFAULT WORLD SETUP
// ------------------------
cities = {
  "Neo City": {
    id: 1,
    spawn: { x: 10, y: 0, z: 10 },
    transport: ["bus", "train"],
    stores: ["car-dealer", "studio", "clothing"],
  },

  "Beat Valley": {
    id: 2,
    spawn: { x: -40, y: 0, z: 20 },
    transport: ["bus"],
    stores: ["studio"],
  },

  "Upload Hills": {
    id: 3,
    spawn: { x: 0, y: 0, z: -50 },
    premiumOnly: true,
    stores: ["car-dealer", "penthouse"],
  },
};

// ------------------------
// 6. SOCKET.IO — REALTIME ENGINE
// ------------------------
io.on("connection", (socket) => {
  console.log("New player connected:", socket.id);

  // PLAYER JOINS WORLD
  socket.on("join-universe", (data) => {
    users[socket.id] = {
      username: data.username,
      city: data.city,
      position: cities[data.city].spawn,
      avatar: data.avatar,
      balance: 1000,
    };

    socket.join(data.city);

    io.to(socket.id).emit("joined-success", {
      user: users[socket.id],
      cities,
    });

    io.to(data.city).emit("player-joined", {
      id: socket.id,
      user: users[socket.id],
    });
  });

  // PLAYER MOVEMENT
  socket.on("move", (newPos) => {
    if (!users[socket.id]) return;

    users[socket.id].position = newPos;

    io.to(users[socket.id].city).emit("player-moved", {
      id: socket.id,
      position: newPos,
    });
  });

  // BUY A CAR
  socket.on("buy-car", () => {
    if (!users[socket.id]) return;

    if (users[socket.id].balance < 500) {
      io.to(socket.id).emit("purchase-denied", {
        message: "Not enough money",
      });
      return;
    }

    users[socket.id].balance -= 500;

    vehicles[socket.id] = {
      owner: socket.id,
      type: "car",
      speed: 2.5,
    };

    io.to(socket.id).emit("purchase-success", {
      message: "Car purchased!",
      balance: users[socket.id].balance,
      vehicle: vehicles[socket.id],
    });
  });

  // CHAT SYSTEM
  socket.on("chat-message", (msg) => {
    if (!users[socket.id]) return;

    io.to(users[socket.id].city).emit("chat-update", {
      username: users[socket.id].username,
      message: msg,
    });
  });

  // PLAYER DISCONNECTS
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    const city = users?.[socket.id]?.city;

    delete users[socket.id];
    delete vehicles[socket.id];

    if (city) {
      io.to(city).emit("player-left", { id: socket.id });
    }
  });
});

// ------------------------
// 7. START SERVER
// ------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`UPLOAD UNIVERSE prototype running on port ${PORT}`);
});
