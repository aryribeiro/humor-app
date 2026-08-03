import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { SessionManager } from "./sessionManager";
import { BedrockVoiceClient } from "./bedrockClient";
import { handleSocketConnection } from "./wsHandler";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const sessionManager = new SessionManager();
const bedrockClient = new BedrockVoiceClient();

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://humor2026.vercel.app",
];

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    activeSessions: sessionManager.getActiveCount(),
    activeVoiceSessions: bedrockClient.getActiveSessions().length,
  });
});

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  httpCompression: false,
});

io.on("connection", (socket) => {
  handleSocketConnection(socket, sessionManager, bedrockClient);
});

server.listen(PORT, () => {
  console.log(`[Server] Humor App! backend running on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] Socket.IO ready for connections`);
});

function gracefulShutdown(signal: string): void {
  console.log(`\n[Server] ${signal} received, shutting down...`);

  io.close();

  const activeSessions = bedrockClient.getActiveSessions();
  Promise.all(
    activeSessions.map((id) =>
      bedrockClient.endSession(id).catch(() => bedrockClient.forceCloseSession(id))
    )
  ).finally(() => {
    server.close(() => {
      console.log("[Server] HTTP server closed");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
