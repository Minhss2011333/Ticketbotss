import { useState } from "react";
import { useCreateTicket } from "@/hooks/useTickets";
import { useToast } from "@/hooks/use-toast";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketModal({ isOpen, onClose }: TicketModalProps) {
  const [formData, setFormData] = useState({
    deal: "",
    amount: "",
    otherUserId: "",
    creatorName: "",
  });
  
  const createTicket = useCreateTicket();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deal || !formData.amount || !formData.otherUserId || !formData.creatorName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTicket.mutateAsync({
        ...formData,
        creatorId: `user_${Date.now()}`, // Mock user ID
      });
      
      toast({
        title: "Success",
        description: "Ticket created successfully!",
      });
      
      setFormData({ deal: "", amount: "", otherUserId: "", creatorName: "" });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="discord-tertiary rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <i className="fas fa-ticket-alt mr-2 tradeblox-yellow-text"></i>
            Create Ticket
          </h2>
          <button 
            className="discord-text hover:text-white"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium discord-text mb-2">Your Username</label>
            <input 
              type="text" 
              className="w-full discord-secondary border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none" 
              placeholder="Your Discord username"
              value={formData.creatorName}
              onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium discord-text mb-2">Deal Description</label>
            <textarea 
              className="w-full discord-secondary border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none" 
              rows={3} 
              placeholder="Describe what you're trading..."
              value={formData.deal}
              onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium discord-text mb-2">Trade Amount/Value</label>
            <input 
              type="text" 
              className="w-full discord-secondary border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none" 
              placeholder="e.g., 5,000 Robux, $50, etc."
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium discord-text mb-2">Other User's Discord ID</label>
            <input 
              type="text" 
              className="w-full discord-secondary border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:border-yellow-500 focus:outline-none" 
              placeholder="123456789012345678"
              value={formData.otherUserId}
              onChange={(e) => setFormData({ ...formData, otherUserId: e.target.value })}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button 
              type="button" 
              className="flex-1 discord-secondary hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
              onClick={onClose}
              disabled={createTicket.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 tradeblox-yellow hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50"
              disabled={createTicket.isPending}
            >
              {createTicket.isPending ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
