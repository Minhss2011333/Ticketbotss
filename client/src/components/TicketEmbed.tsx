interface TicketEmbedProps {
  onRequestMiddleman: () => void;
}

export default function TicketEmbed({ onRequestMiddleman }: TicketEmbedProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 tradeblox-orange rounded-full flex-shrink-0 flex items-center justify-center">
        <i className="fas fa-robot text-white"></i>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="font-semibold text-white">Tradeblox Bot</span>
          <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white font-medium">BOT</span>
          <span className="text-xs discord-text">Today at 2:30 PM</span>
        </div>
        
        {/* Discord Embed */}
        <div className="discord-tertiary border-l-4 border-orange-500 rounded-r p-4 max-w-md">
          {/* Embed Header with Tradeblox branding */}
          <div className="flex items-center mb-3">
            <img 
              src="https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60" 
              alt="Tradeblox logo" 
              className="w-8 h-8 rounded mr-3" 
            />
            <h3 className="text-xl font-bold text-white">Tradeblox Tickets</h3>
          </div>
          
          <p className="discord-text mb-4 leading-relaxed">
            Press below to request a middleman for your trade. Our trusted middlemen will help ensure your trades are safe and secure.
          </p>
          
          {/* Request Button */}
          <button 
            className="w-full tradeblox-yellow hover:bg-yellow-400 text-black font-semibold py-3 px-4 rounded transition-colors duration-200 flex items-center justify-center space-x-2"
            onClick={onRequestMiddleman}
          >
            <i className="fas fa-ticket-alt"></i>
            <span>Request a Middleman</span>
          </button>
          
          {/* Embed Footer */}
          <div className="mt-4 pt-3 border-t border-gray-600">
            <div className="flex items-center justify-between text-xs discord-text">
              <span>Powered by Tradeblox</span>
              <span className="flex items-center">
                <i className="fas fa-shield-alt mr-1 text-green-400"></i>
                Secure Trading
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
