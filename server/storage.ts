import { users, tickets, type User, type InsertUser, type Ticket, type InsertTicket, type UpdateTicket } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ticket operations
  getAllTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<UpdateTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tickets: Map<number, Ticket>;
  private currentUserId: number;
  private currentTicketId: number;
  private ticketCounter: number;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.currentUserId = 1;
    this.currentTicketId = 1;
    this.ticketCounter = 40000;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketByNumber(ticketNumber: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values()).find(
      (ticket) => ticket.ticketNumber === ticketNumber
    );
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.currentTicketId++;
    const ticketNumber = String(this.ticketCounter++);
    const ticket: Ticket = {
      id,
      ticketNumber,
      creatorId: insertTicket.creatorId,
      creatorName: insertTicket.creatorName,
      deal: insertTicket.deal,
      amount: insertTicket.amount,
      otherUserId: insertTicket.otherUserId,
      category: insertTicket.category ?? "middleman",
      status: "pending",
      claimedBy: null,
      claimedByName: null,
      createdAt: new Date(),
      claimedAt: null,
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<UpdateTicket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      claimedAt: updates.status === "claimed" && !ticket.claimedAt ? new Date() : ticket.claimedAt,
    };
    
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteTicket(id: number): Promise<boolean> {
    return this.tickets.delete(id);
  }
}

export const storage = new MemStorage();
