import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  
  // Extract first and last initials from the name string
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  return initials;
};

export default function PlayerList({ 
  players, 
  title, 
  emptyMessage, 
  colorClass, 
  actions = [],
  isAdmin,
  removePlayer,
  isITM = false,
  isCashGame = false,
  getOrdinalSuffix = (n) => n // Default suffix function if not provided
}) {
  if (!players || players.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        <p className="text-lg text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      <div className="border rounded-md overflow-hidden">
        <ul className="divide-y">
          {players.map((registration, idx) => (
            <li key={registration.id} className="p-3 flex items-center justify-between">
              {/* Left side - Player info */}
              <div className="flex items-center space-x-3">
                {/* Place number for ITM players */}
                {isITM && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-1">
                    {registration.place}
                  </div>
                )}
                
                <Avatar className="h-8 w-8">
                  <AvatarImage src={registration.user.image} alt={registration.user.name} />
                  <AvatarFallback className={colorClass}>
                    {registration.user.firstName || registration.user.lastName ? 
                      `${registration.user.firstName?.[0] || ''}${registration.user.lastName?.[0] || ''}`.toUpperCase() :
                      getInitials(registration.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-medium">
                    {(registration.user.firstName || registration.user.lastName) ? 
                      `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim() : 
                      registration.user.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isAdmin && registration.user.venmoId && (
                      <p className="text-base text-muted-foreground">Venmo: {registration.user.venmoId}</p>
                    )}
                    
                    {/* Tournament buy-ins display */}
                    {!isCashGame && registration.rebuys > 0 && (
                      <span className="text-base px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                        {registration.rebuys} {registration.rebuys === 1 ? 'buy-in' : 'buy-ins'}
                      </span>
                    )}
                    
                    {/* Cash game buy-ins display */}
                    {isCashGame && registration.buyInTotal > 0 && (
                      <span className="text-base px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">
                        Buy-in: ${registration.buyInTotal}
                      </span>
                    )}
                    
                    {/* Cash game cash-out display */}
                    {isCashGame && registration.cashOut !== null && (
                      <span className="text-base px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        Cash-out: ${registration.cashOut}
                      </span>
                    )}
                    
                    {/* Cash game profit/loss display */}
                    {isCashGame && registration.netProfit !== null && (
                      <span className={`text-base px-1.5 py-0.5 rounded-full ${
                        registration.netProfit >= 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {registration.netProfit >= 0 
                          ? `+$${registration.netProfit}` 
                          : `-$${Math.abs(registration.netProfit)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right side - Action buttons and prize indicator */}
              <div className="flex items-center space-x-1">
                {/* Prize amount for ITM players */}
                {isITM && registration.prize && (
                  <div className="mr-2 text-lg font-medium text-green-600">
                    ${registration.prize}
                  </div>
                )}
                
                {isAdmin && (
                  <div className="flex space-x-1">
                    {actions.map((action, index) => (
                      <Button 
                        key={index}
                        type="button"
                        size="sm"
                        variant={action.variant || "outline"}
                        onClick={() => action.onClick(registration)}
                        title={action.title}
                        disabled={action.disabled}
                        className="text-base"
                      >
                        {action.icon && <action.icon className="h-4 w-4 mr-1" />}
                        {action.label}
                      </Button>
                    ))}
                    {removePlayer && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => removePlayer(registration.id)}
                        title="Remove player"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 