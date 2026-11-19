// backend/server.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5001;

// =======================================================
// ENVIRONMENT & DATABASE CONFIGURATION
// =======================================================

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.PG_CONNECTION_STRING;
const useSsl = process.env.PG_SSL ? process.env.PG_SSL === "true" : isProduction;

const buildSslConfig = () => {
  if (!useSsl) {
    return {};
  }

  const caCertPath = process.env.PG_CA_CERT_PATH;
  if (caCertPath) {
    const resolvedPath = path.resolve(__dirname, caCertPath);
    if (fs.existsSync(resolvedPath)) {
      return {
        ssl: {
          ca: fs.readFileSync(resolvedPath, "utf8"),
          rejectUnauthorized: true,
        },
      };
    }
    console.warn(`SSL CA certificate not found at ${resolvedPath}; falling back to default TLS settings.`);
  }

  return {
    ssl: {
      rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === "true",
    },
  };
};

const poolConfig = connectionString
  ? {
      connectionString,
      max: 10,
      idleTimeoutMillis: 10000,
      ...buildSslConfig(),
    }
  : {};

const pool = new Pool(poolConfig);

// --- Database Connection Check ---
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
    return;
  }
  console.log("Successfully connected to PostgreSQL.");
  release();
});

// =======================================================
// MIDDLEWARE AND ROUTE INTEGRATION
// =======================================================

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const authRoutes = require("./routes/auth");
const albumRoutes = require("./routes/albumRoutes");

app.use("/api/auth", authRoutes(pool));
app.use("/api/albums", albumRoutes(pool));

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
