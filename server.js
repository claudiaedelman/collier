const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "assets", "data", "club-subscribers.json");
const CONTACT_DB_PATH = path.join(__dirname, "assets", "data", "contact-messages.json");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "collier-admin";
const SESSION_COOKIE_NAME = "collier_admin_session";
const adminSessions = new Set();

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, chunk) => {
    const [name, ...rest] = chunk.trim().split("=");
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  return Boolean(token && adminSessions.has(token));
}

function requireAdmin(req, res, next) {
  if (isAdminAuthenticated(req)) {
    return next();
  }
  return res.redirect("/admin-login.html");
}

function setAdminCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`
  );
}

function clearAdminCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

app.use(express.json());

app.get(["/admin.html", "/collier/admin.html"], requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get(["/assets/js/admin.js", "/collier/assets/js/admin.js"], requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, "assets", "js", "admin.js"));
});

app.get(["/assets/css/admin.css", "/collier/assets/css/admin.css"], requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, "assets", "css", "admin.css"));
});

app.get("/api/admin/session", (req, res) => {
  res.json({ ok: true, authenticated: isAdminAuthenticated(req) });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  adminSessions.add(token);
  setAdminCookie(res, token);
  return res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    adminSessions.delete(token);
  }
  clearAdminCookie(res);
  return res.json({ ok: true });
});

app.use(express.static(__dirname));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/join-club", async (req, res) => {
  const { name, email, phone, birthDate, lang, source } = req.body || {};

  if (!name || !email || !phone || !birthDate) {
    return res.status(400).json({ error: "name, email, phone and birthDate are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "invalid email" });
  }

  const normalizedPhone = String(phone).trim();
  const normalizedBirthDate = String(birthDate).trim();
  const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!normalizedPhone) {
    return res.status(400).json({ error: "invalid phone" });
  }
  if (!birthDateRegex.test(normalizedBirthDate)) {
    return res.status(400).json({ error: "invalid birthDate" });
  }

  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

    let existing = [];
    try {
      const raw = await fs.readFile(DB_PATH, "utf8");
      existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    } catch (_) {
      existing = [];
    }

    const alreadyExists = existing.some((item) => item.email === normalizedEmail);
    if (alreadyExists) {
      return res.status(409).json({ error: "email already subscribed" });
    }

    const newEntry = {
      id: `sub_${Date.now()}`,
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      birthDate: normalizedBirthDate,
      lang: String(lang || "he"),
      source: String(source || "homepage"),
      createdAt: new Date().toISOString()
    };

    existing.push(newEntry);
    await fs.writeFile(DB_PATH, JSON.stringify(existing, null, 2), "utf8");

    return res.status(201).json({ ok: true, subscriber: newEntry });
  } catch (error) {
    return res.status(500).json({ error: "could not save subscriber" });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, phone, email, message, lang, source } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "invalid email" });
  }

  const trimmedName = String(name).trim();
  const trimmedMessage = String(message).trim();
  if (!trimmedName || !trimmedMessage) {
    return res.status(400).json({ error: "name and message cannot be empty" });
  }

  const cleanedPhone = String(phone || "").trim();

  try {
    await fs.mkdir(path.dirname(CONTACT_DB_PATH), { recursive: true });

    let existing = [];
    try {
      const raw = await fs.readFile(CONTACT_DB_PATH, "utf8");
      existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    } catch (_) {
      existing = [];
    }

    const newEntry = {
      id: `msg_${Date.now()}`,
      name: trimmedName,
      phone: cleanedPhone,
      email: normalizedEmail,
      message: trimmedMessage,
      lang: String(lang || "he"),
      source: String(source || "contact-page"),
      createdAt: new Date().toISOString()
    };

    existing.push(newEntry);
    await fs.writeFile(CONTACT_DB_PATH, JSON.stringify(existing, null, 2), "utf8");

    return res.status(201).json({ ok: true, contactMessage: newEntry });
  } catch (_) {
    return res.status(500).json({ error: "could not save contact message" });
  }
});

app.listen(PORT, () => {
  console.log(`Collier server running on http://localhost:${PORT}`);
});
