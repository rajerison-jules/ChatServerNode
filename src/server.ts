import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import routes from "./routes";
import os from "os";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use("/api", routes(io));

io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté");

  socket.on("join room", (conversationId) => {
    socket.join(`conversation-${conversationId}`);
  });

  socket.on("leave room", (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
  });

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté");
  });
});

const PORT = process.env.PORT || 3000;

function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
  return "0.0.0.0";
}

const ipAddress = getIPAddress();

server.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://${ipAddress}:${PORT}`);
});
