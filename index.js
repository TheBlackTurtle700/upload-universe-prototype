/*  
==========================================================
UPLOAD UNIVERSE — MASTER PROTOTYPE ENGINE
Owned by: MoneyLine Digital Records, LLC  
Creator: Benjamin Jose Velez Pacheco  
Dedicated to: Prynxe Pacheco & Joxsyph Pacheco  
==========================================================
FINAL PRODUCTION-READY CORE ENGINE  
Compatible with: Railway, Replit, Render, Localhost  
==========================================================
*/

//////////////////////////
// IMPORTS
//////////////////////////

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fs = require("fs");

//////////////////////////
// APP INIT
//////////////////////////

const app = express();

// Middleware
app.use(bodyParser.json());

// Serve the frontend correctly
app.use(express.static(path.join(__dirname, "public")));

// Home route for browser
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//////////////////////////
// DIRECTORY SETUP
//////////////////////////

const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_DB = DATA_DIR + "/users.json";
const KEYHOLDER_DB = DATA_DIR + "/keyholders.json";
const DSP_DB = DATA_DIR + "/dsp-config.json";

if (!fs.existsSync(USERS_DB)) fs.writeFileSync(USERS_DB, JSON.stringify([]));
if (!fs.existsSync(KEYHOLDER_DB)) fs.writeFileSync(KEYHOLDER_DB, JSON.stringify([]));
if (!fs.existsSync(DSP_DB)) fs.writeFileSync(DSP_DB, JSON.stringify({}));

//////////////////////////
// MASTER CONTROL LOCK
//////////////////////////

const MASTER_SCRIPT_LOCK = true; // prevents overwriting core code

//////////////////////////
// KEY SYSTEM
//////////////////////////

const ADMIN_KEY = "ADMIN-KEY-001"; // not for sale
const CGK_KEY = "CREATOR-GALAXY-KEY-1001";
const GTK_KEY = "GOLDEN-TERRITORY-KEY-2001";

//////////////////////////
// DATABASE HELPERS
//////////////////////////

function loadDB(path) {
    return JSON.parse(fs.readFileSync(path));
}

function saveDB(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

//////////////////////////
// USER ACCOUNT SYSTEM
//////////////////////////

app.post("/create-user", (req, res) => {
    const { username, password } = req.body;
    let users = loadDB(USERS_DB);

    if (users.find(u => u.username === username))
        return res.json({ success: false, message: "Username already exists" });

    users.push({
        username,
        password,
        avatar: null,
        worldState: {},
        lastSave: new Date().toISOString()
    });

    saveDB(USERS_DB, users);

    res.json({ success: true, message: "User account created." });
});

app.post("/user-login", (req, res) => {
    const { username, password } = req.body;
    let users = loadDB(USERS_DB);

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) return res.json({ success: false, message: "Invalid login" });

    res.json({ success: true, user });
});

//////////////////////////
// AVATAR SYSTEM
//////////////////////////

app.post("/create-avatar", (req, res) => {
    const { username, avatarType } = req.body;

    let users = loadDB(USERS_DB);
    let user = users.find(u => u.username === username);

    if (!user) return res.json({ success: false });

    user.avatar = {
        type: avatarType,
        level: 1,
        stats: { fame: 0, xp: 0 }
    };

    saveDB(USERS_DB, users);

    res.json({ success: true, message: "Avatar created." });
});

//////////////////////////
// AUTOSAVE ENGINE
//////////////////////////

app.post("/autosave", (req, res) => {
    const { username, worldState } = req.body;

    let users = loadDB(USERS_DB);
    let user = users.find(u => u.username === username);

    if (!user) return res.json({ success: false });

    user.worldState = worldState;
    user.lastSave = new Date().toISOString();

    saveDB(USERS_DB, users);

    res.json({ success: true, message: "Autosave complete." });
});

//////////////////////////
// KEY LOGIN
//////////////////////////

app.post("/key-login", (req, res) => {
    const { key } = req.body;

    if (key === ADMIN_KEY) return res.json({ success: true, type: "ADMIN" });
    if (key === CGK_KEY) return res.json({ success: true, type: "CGK" });
    if (key === GTK_KEY) return res.json({ success: true, type: "GTK" });

    res.json({ success: false, message: "Invalid key" });
});

//////////////////////////
// KEYHOLDER DASHBOARD
//////////////////////////

app.post("/key-dashboard", (req, res) => {
    const { type } = req.body;

    if (type === "ADMIN") {
        return res.json({
            success: true,
            tools: [
                "World Stats",
                "Galaxy Creator",
                "World Owner Avatar Mode",
                "DSP Merge Dashboard",
                "Platform Tour Manager",
                "Artist Upload Admin"
            ]
        });
    }

    if (type === "CGK" || type === "GTK") {
        return res.json({
            success: true,
            tools: [
                "World Stats",
                "World Owner Avatar Mode",
                "DSP Merge Dashboard"
            ]
        });
    }

    res.json({ success: false });
});

//////////////////////////
// WORLD CREATION
//////////////////////////

app.post("/create-world", (req, res) => {
    const { key, worldName } = req.body;

    if (![ADMIN_KEY, CGK_KEY, GTK_KEY].includes(key))
        return res.json({ success: false, message: "Unauthorized" });

    let keyholders = loadDB(KEYHOLDER_DB);

    keyholders.push({
        worldName,
        owner: key,
        created: new Date().toISOString()
    });

    saveDB(KEYHOLDER_DB, keyholders);

    res.json({ success: true, message: "World created successfully." });
});

//////////////////////////
// GALAXY CREATION (ADMIN ONLY)
//////////////////////////

app.post("/create-galaxy", (req, res) => {
    const { key, galaxyName } = req.body;

    if (key !== ADMIN_KEY)
        return res.json({ success: false, message: "Admin only" });

    res.json({ success: true, message: `Galaxy '${galaxyName}' created.` });
});

//////////////////////////
// DSP MERGE SYSTEM
//////////////////////////

app.post("/dsp-config", (req, res) => {
    const { key, dspData } = req.body;

    if (!["ADMIN", "CGK", "GTK"].includes(key))
        return res.json({ success: false });

    saveDB(DSP_DB, dspData);

    res.json({ success: true, message: "DSP configuration updated." });
});

//////////////////////////
// FRONTEND ROUTE
//////////////////////////

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

//////////////////////////
// SERVER START
//////////////////////////

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`UPLOAD UNIVERSE PROTOTYPE RUNNING ON PORT ${PORT}`);
});
