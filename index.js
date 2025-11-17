// ======================================================
// UPLOAD UNIVERSE — MASTER FULL SCRIPT
// Node.js + Express + Socket.IO + MongoDB + Stripe + Auto Earnings
// ======================================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fetch = require("node-fetch");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ------------------------
// MongoDB Setup
// ------------------------
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// ------------------------
// Schemas
// ------------------------
const UserSchema = new mongoose.Schema({
  username: String,
  role: String,
  city: String,
  balance: Number,
  dspAccounts: Object,
  streamAccounts: Object,
  stripeAccountId: String,
  createdAt: { type: Date, default: Date.now },
});

const TrackSchema = new mongoose.Schema({
  title: String,
  artistId: String,
  dspIds: Object,
  streams: Number,
  revenue: Number,
});

const StreamSessionSchema = new mongoose.Schema({
  streamerId: String,
  platform: String,
  platformStreamId: String,
  city: String,
  viewers: Number,
  donations: Number,
  active: Boolean,
  startedAt: Date,
  endedAt: Date,
});

const User = mongoose.model("User", UserSchema);
const Track = mongoose.model("Track", TrackSchema);
const StreamSession = mongoose.model("StreamSession", StreamSessionSchema);

// ------------------------
// Frontend
// ------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------
// API Routes
// ------------------------
app.post("/api/create-avatar", async (req, res) => {
  const { username, starterCity, role } = req.body;
  if (!username || !starterCity || !role)
    return res.status(400).json({ error: "Missing fields" });
  const user = new User({ username, role, city: starterCity, balance: 1000, dspAccounts: {}, streamAccounts: {} });
  await user.save();
  res.json({ success: true, user });
});

app.post("/api/start-live-stream", async (req, res) => {
  const { userId, platform, city } = req.body;
  const session = new StreamSession({
    streamerId: userId,
    platform,
    city,
    viewers: 0,
    donations: 0,
    active: true,
    startedAt: new Date(),
  });
  await session.save();
  io.to(city).emit("live-stream-started", { streamerId: userId, platform });
  res.json({ success: true, sessionId: session._id });
});

app.post("/api/end-live-stream", async (req, res) => {
  const { sessionId } = req.body;
  const session = await StreamSession.findById(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.active = false;
  session.endedAt = new Date();
  await session.save();
  io.to(session.city).emit("live-stream-ended", { streamerId: session.streamerId });
  res.json({ success: true });
});

app.get("/api/get-earnings/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const tracks = await Track.find({ artistId: user._id });
  const total = tracks.reduce((sum, t) => sum + t.revenue, 0);
  res.json({ balance: user.balance, dspRevenue: total });
});

// ------------------------
// OAuth Placeholders
// ------------------------
app.get("/auth/dsp/:platform", (req, res) => {
  const { platform } = req.params;
  const oauthUrl = `https://example-${platform}-oauth.com/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.BASE_URL+"/auth/dsp/callback")}&response_type=code&scope=streaming`;
  res.redirect(oauthUrl);
});

app.get("/auth/dsp/callback", async (req, res) => {
  const { code, state } = req.query;
  const access_token = "FAKE_ACCESS_TOKEN_" + code;
  const user = await User.findById(state);
  if (!user) return res.status(404).send("User not found");
  user.dspAccounts = user.dspAccounts || {};
  user.dspAccounts[state] = access_token;
  await user.save();
  res.send("DSP linked! Close page.");
});

app.get("/auth/stream/:platform", (req, res) => {
  const { platform } = req.params;
  const oauthUrl = `https://example-${platform}-oauth.com/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.BASE_URL+"/auth/stream/callback")}&response_type=code&scope=streaming`;
  res.redirect(oauthUrl);
});

app.get("/auth/stream/callback", async (req, res) => {
  const { code, state } = req.query;
  const access_token = "FAKE_STREAM_TOKEN_" + code;
  const user = await User.findById(state);
  if (!user) return res.status(404).send("User not found");
  user.streamAccounts = user.streamAccounts || {};
  user.streamAccounts[state] = access_token;
  await user.save();
  res.send("Streaming linked! Close page.");
});

// ------------------------
// Socket.IO World
// ------------------------
let users = {}, vehicles = {}, cities = {
  "Neo City": { spawn: { x: 10, y: 0, z: 10 } },
  "Beat Valley": { spawn: { x: -40, y: 0, z: 20 } },
  "Upload Hills": { spawn: { x: 0, y: 0, z: -50 } },
};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("join-universe", async (data) => {
    const user = await User.findById(data.userId);
    if (!user) return;
    users[socket.id] = { ...user.toObject(), position: cities[user.city].spawn };
    socket.join(user.city);
    io.to(socket.id).emit("joined-success", { user: users[socket.id], cities });
    io.to(user.city).emit("player-joined", { id: socket.id, user: users[socket.id] });
  });

  socket.on("move", (pos) => {
    if (!users[socket.id]) return;
    users[socket.id].position = pos;
    io.to(users[socket.id].city).emit("player-moved", { id: socket.id, position: pos });
  });

  socket.on("buy-car", () => {
    if (!users[socket.id]) return;
    if (users[socket.id].balance < 500) {
      io.to(socket.id).emit("purchase-denied", { message: "Not enough money" });
      return;
    }
    users[socket.id].balance -= 500;
    vehicles[socket.id] = { owner: socket.id, type: "car", speed: 2.5 };
    io.to(socket.id).emit("purchase-success", { message: "Car purchased!", balance: users[socket.id].balance, vehicle: vehicles[socket.id] });
  });

  socket.on("chat-message", (msg) => {
    if (!users[socket.id]) return;
    io.to(users[socket.id].city).emit("chat-update", { username: users[socket.id].username, message: msg });
  });

  socket.on("disconnect", () => {
    const city = users?.[socket.id]?.city;
    delete users[socket.id];
    delete vehicles[socket.id];
    if (city) io.to(city).emit("player-left", { id: socket.id });
  });
});

// ------------------------
// Automated Earnings Poller
// ------------------------
async function updateEarnings() {
  const usersList = await User.find({});
  for (let user of usersList) {
    // DSP Earnings Placeholder
    if (user.dspAccounts) {
      for (let platform in user.dspAccounts) {
        const token = user.dspAccounts[platform];
        let streams = Math.floor(Math.random() * 100);
        let revenue = streams * 0.01;
        await Track.updateMany({ artistId: user._id }, { $inc: { streams, revenue } });
      }
    }

    // Streaming Earnings Placeholder
    if (user.streamAccounts) {
      for (let platform in user.streamAccounts) {
        const token = user.streamAccounts[platform];
        let donations = Math.floor(Math.random() * 50);
        user.balance += donations;
      }
    }

    await user.save();

    // Emit updated balance to connected players
    for (let socketId in users) {
      if (users[socketId]._id.toString() === user._id.toString()) {
        io.to(socketId).emit("balance-updated", { balance: user.balance });
      }
    }
  }
}
setInterval(updateEarnings, 60000);

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Upload Universe Master Server running on port ${PORT}`));
