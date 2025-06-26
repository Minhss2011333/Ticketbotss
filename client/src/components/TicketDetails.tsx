import { Ticket } from "@shared/schema";
import { useClaimTicket, useCloseTicket } from "@/hooks/useTickets";
import { useToast } from "@/hooks/use-toast";

interface TicketDetailsProps {
  ticket: Ticket | null;
}

export default function TicketDetails({ ticket }: TicketDetailsProps) {
  const claimTicket = useClaimTicket();
  const closeTicket = useCloseTicket();
  const { toast } = useToast();

  const handleClaim = async () => {
    if (!ticket) return;
    
    try {
      await claimTicket.mutateAsync({
        id: ticket.id,
        updates: {
          status: "claimed",
          claimedBy: "middleman_user_123",
          claimedByName: "MiddlemanUser",
        },
      });
      
      toast({
        title: "Success",
        description: "Ticket claimed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim ticket",
        variant: "destructive",
      });
    }
  };

  const handleClose = async () => {
    if (!ticket) return;
    
    if (!confirm("Are you sure you want to close this ticket?")) return;
    
    try {
      await closeTicket.mutateAsync({
        id: ticket.id,
        updates: { status: "closed" },
      });
      
      toast({
        title: "Success",
        description: "Ticket closed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close ticket",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 discord-secondary border-l border-gray-700">
      <div className="p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <i className="fas fa-ticket-alt mr-2 tradeblox-yellow-text"></i>
          {ticket ? `Ticket #${ticket.ticketNumber}` : "No Ticket Selected"}
        </h3>
        
        {ticket ? (
          <>
            {/* Ticket Info Card */}
            <div className="discord-tertiary rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-white">Ticket #{ticket.ticketNumber}</span>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  ticket.status === 'pending' ? 'tradeblox-yellow text-black' :
                  ticket.status === 'claimed' ? 'bg-green-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {ticket.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="discord-text">Creator:</span>
                  <p className="text-white mt-1">{ticket.creatorName}</p>
                </div>
                <div>
                  <span className="discord-text">Deal:</span>
                  <p className="text-white mt-1">{ticket.deal}</p>
                </div>
                <div>
                  <span className="discord-text">Amount:</span>
                  <p className="text-white mt-1">{ticket.amount}</p>
                </div>
                <div>
                  <span className="discord-text">Other User:</span>
                  <p className="text-white mt-1">{ticket.otherUserId}</p>
                </div>
                <div>
                  <span className="discord-text">Created:</span>
                  <p className="text-white mt-1">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                {ticket.claimedBy && (
                  <div>
                    <span className="discord-text">Claimed by:</span>
                    <p className="text-white mt-1">{ticket.claimedByName}</p>
                  </div>
                )}
              </div>
              
              {/* Middleman Actions */}
              <div className="mt-4 space-y-2">
                {ticket.status === 'pending' && (
                  <button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                    onClick={handleClaim}
                    disabled={claimTicket.isPending}
                  >
                    <i className="fas fa-hand-paper"></i>
                    <span>{claimTicket.isPending ? "Claiming..." : "Claim Ticket"}</span>
                  </button>
                )}
                
                {ticket.status !== 'closed' && (
                  <button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                    onClick={handleClose}
                    disabled={closeTicket.isPending}
                  >
                    <i className="fas fa-times"></i>
                    <span>{closeTicket.isPending ? "Closing..." : "Close Ticket"}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="discord-tertiary rounded-lg p-4 text-center">
            <i className="fas fa-ticket-alt text-4xl discord-text mb-3"></i>
            <p className="discord-text">Select a ticket to view details</p>
          </div>
        )}
        
        {/* Role Permissions Info */}
        <div className="discord-darkest rounded-lg p-3 border border-gray-600">
          <div className="flex items-center mb-2">
            <i className="fas fa-eye-slash discord-text mr-2"></i>
            <span className="text-xs font-semibold discord-text uppercase">Permission Required</span>
          </div>
          <p className="text-xs discord-text">
            Only users with the Middleman role can view and interact with tickets.
          </p>
          <div className="mt-2 text-xs discord-text font-mono">
            Role ID: 1365778314572333188
          </div>
        </div>
      </div>
    </div>
  );
}
