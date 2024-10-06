import express from "express";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const router = express.Router();
const prisma = new PrismaClient();

export default function (io: Server) {
  // Créer un utilisateur
  router.post("/users", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const user = await prisma.user.create({
        data: { username, email, passwordHash: password }, // Dans un vrai système, vous devriez hasher le mot de passe
      });
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Créer une conversation
  router.post("/conversations", async (req, res) => {
    try {
      const { userIds } = req.body;
      const conversation = await prisma.conversation.create({
        data: {
          users: {
            connect: userIds.map((id) => ({ id: Number(id) })),
          },
        },
        include: {
          users: true,
        },
      });
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Envoyer un message
  router.post("/messages", async (req, res) => {
    try {
      const { content, senderId, conversationId } = req.body;
      const message = await prisma.message.create({
        data: {
          content,
          sender: { connect: { id: senderId } },
          conversation: { connect: { id: conversationId } },
        },
        include: {
          sender: true,
        },
      });

      io.to(`conversation-${conversationId}`).emit("new message", message);

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Récupérer les conversations d'un utilisateur
  router.get("/conversations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const conversations = await prisma.conversation.findMany({
        where: {
          users: {
            some: {
              id: userId,
            },
          },
        },
        include: {
          users: true,
          messages: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
      res.json(conversations);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Récupérer les messages d'une conversation
  router.get("/messages/:conversationId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await prisma.message.findMany({
        where: {
          conversationId: conversationId,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: true,
        },
      });
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
