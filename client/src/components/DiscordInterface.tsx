import { useState } from "react";
import Sidebar from "./Sidebar";
import TicketEmbed from "./TicketEmbed";
import TicketDetails from "./TicketDetails";
import TicketModal from "./TicketModal";
import { useTickets } from "@/hooks/useTickets";
import { Ticket } from "@shared/schema";

export default function DiscordInterface() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { tickets, isLoading } = useTickets();

  const activeTicket = selectedTicket || tickets?.[0] || null;

  return (
    <div className="flex h-screen">
      <Sidebar 
        tickets={tickets || []} 
        selectedTicket={activeTicket}
        onSelectTicket={setSelectedTicket}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col discord-secondary">
        {/* Channel Header */}
        <div className="h-16 discord-secondary border-b border-gray-700 px-6 flex items-center">
          <i className="fas fa-hashtag discord-text mr-2"></i>
          <span className="text-white font-semibold">ticket-system</span>
          <div className="ml-auto flex items-center space-x-4">
            <i className="fas fa-bell discord-text hover:text-white cursor-pointer"></i>
            <i className="fas fa-users discord-text hover:text-white cursor-pointer"></i>
            <i className="fas fa-search discord-text hover:text-white cursor-pointer"></i>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto discord-scrollbar p-4 space-y-6">
          <TicketEmbed onRequestMiddleman={() => setIsModalOpen(true)} />
          
          {tickets && tickets.length > 0 && (
            <>
              <div className="border-t border-gray-600 my-6"></div>
              {tickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="flex items-start space-x-3">
                  <div className="w-10 h-10 tradeblox-orange rounded-full flex-shrink-0 flex items-center justify-center">
                    <i className="fas fa-robot text-white"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-white">Tradeblox Bot</span>
                      <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white font-medium">BOT</span>
                      <span className="text-xs discord-text">
                        {new Date(ticket.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="discord-tertiary border-l-4 border-green-400 rounded-r p-4 max-w-lg">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <i className="fas fa-check-circle mr-2 text-green-400"></i>
                        Ticket #{ticket.ticketNumber} Created
                      </h3>
                      
                      <div className="discord-secondary rounded p-3 mb-4">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="discord-text">Creator:</span>
                            <span className="text-white">{ticket.creatorName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="discord-text">Status:</span>
                            <span className={`font-semibold flex items-center ${
                              ticket.status === 'pending' ? 'tradeblox-yellow-text' :
                              ticket.status === 'claimed' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {ticket.status === 'pending' && (
                                <div className="w-2 h-2 tradeblox-yellow rounded-full mr-1 loading-pulse"></div>
                              )}
                              {ticket.status === 'pending' ? 'Waiting for Middleman' :
                               ticket.status === 'claimed' ? `Claimed by ${ticket.claimedByName}` :
                               'Closed'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {ticket.status === 'pending' && (
                        <div className="flex items-center justify-center space-x-2 discord-text">
                          <i className="fas fa-spinner loading-spin tradeblox-yellow-text"></i>
                          <span>Please wait patiently for a middleman...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <TicketDetails ticket={activeTicket} />
      
      <TicketModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
