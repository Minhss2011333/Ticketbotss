import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  creatorId: text("creator_id").notNull(),
  creatorName: text("creator_name").notNull(),
  deal: text("deal").notNull(),
  amount: text("amount").notNull(),
  otherUserId: text("other_user_id").notNull(),
  category: text("category").notNull().default("middleman"), // middleman, trading, other
  status: text("status").notNull().default("pending"), // pending, claimed, closed
  claimedBy: text("claimed_by"),
  claimedByName: text("claimed_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTicketSchema = createInsertSchema(tickets).pick({
  creatorId: true,
  creatorName: true,
  deal: true,
  amount: true,
  otherUserId: true,
}).extend({
  category: z.string().optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(["pending", "claimed", "closed"]).optional(),
  claimedBy: z.string().nullable().optional(),
  claimedByName: z.string().nullable().optional(),
  otherUserId: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type UpdateTicket = z.infer<typeof updateTicketSchema>;
