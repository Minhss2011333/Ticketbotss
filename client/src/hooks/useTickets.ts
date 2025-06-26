import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Ticket, InsertTicket, UpdateTicket } from "@shared/schema";

export function useTickets() {
  return useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });
}

export function useTicket(id: number) {
  return useQuery<Ticket>({
    queryKey: ["/api/tickets", id],
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertTicket) => {
      const response = await apiRequest("POST", "/api/tickets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });
}

export function useClaimTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<UpdateTicket> }) => {
      const response = await apiRequest("PATCH", `/api/tickets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<UpdateTicket> }) => {
      const response = await apiRequest("PATCH", `/api/tickets/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });
}
