import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTicketSchema, updateTicketSchema } from "../shared/schema.js";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tickets
  app.get("/api/tickets", async (req, res) => {
    console.log("[API] Fetching all tickets...");
    try {
      const tickets = await storage.getAllTickets();
      console.log(`[API] Found ${tickets.length} tickets`);
      res.json(tickets);
    } catch (error) {
      console.error("[API] Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  // Get specific ticket
  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", async (req, res) => {
    try {
      const validatedData = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid ticket data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  // Update ticket (claim/close)
  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const validatedData = updateTicketSchema.parse(req.body);
      const ticket = await storage.updateTicket(id, validatedData);
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Delete ticket
  app.delete("/api/tickets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const success = await storage.deleteTicket(id);
      if (!success) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
