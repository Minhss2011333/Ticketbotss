import { Ticket } from "@shared/schema";

interface SidebarProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  onSelectTicket: (ticket: Ticket) => void;
}

export default function Sidebar({ tickets, selectedTicket, onSelectTicket }: SidebarProps) {
  return (
    <div className="w-64 discord-secondary border-r border-gray-700 flex flex-col">
      {/* Server Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-semibold flex items-center">
          <div className="w-8 h-8 tradeblox-orange rounded-lg mr-3 flex items-center justify-center">
            <i className="fas fa-cube text-white text-sm"></i>
          </div>
          Tradeblox Server
        </h2>
      </div>
      
      {/* Channel List */}
      <div className="flex-1 p-2">
        <div className="mb-4">
          <div className="discord-text text-xs font-semibold uppercase mb-2 px-2">Text Channels</div>
          <div className="space-y-1">
            <div className="px-2 py-1 discord-text hover:bg-gray-600 rounded cursor-pointer">
              <i className="fas fa-hashtag text-xs mr-2"></i>general
            </div>
            <div className="px-2 py-1 discord-text hover:bg-gray-600 rounded cursor-pointer">
              <i className="fas fa-hashtag text-xs mr-2"></i>announcements
            </div>
            <div className="px-2 py-1 text-white discord-tertiary rounded">
              <i className="fas fa-hashtag text-xs mr-2"></i>ticket-system
            </div>
          </div>
        </div>
        
        {/* Ticket Channels */}
        <div className="mb-4">
          <div className="discord-text text-xs font-semibold uppercase mb-2 px-2 flex items-center">
            <i className="fas fa-eye-slash mr-1"></i>
            Private Tickets
          </div>
          <div className="space-y-1">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`px-2 py-1 hover:bg-gray-600 rounded cursor-pointer text-sm transition-colors ${
                  selectedTicket?.id === ticket.id ? 'discord-tertiary text-white' : 'discord-text'
                }`}
                onClick={() => onSelectTicket(ticket)}
              >
                <i className="fas fa-ticket-alt text-xs mr-2 tradeblox-yellow-text"></i>
                ticket-{ticket.ticketNumber}
                <div className="text-xs discord-text mt-1">
                  {ticket.status === 'pending' && '⏳ Pending'}
                  {ticket.status === 'claimed' && '✅ Claimed'}
                  {ticket.status === 'closed' && '❌ Closed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
