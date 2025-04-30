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
  removePlayer 
}) {
  if (!players || players.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <div className="border rounded-md overflow-hidden">
        <ul className="divide-y">
          {players.map((registration) => (
            <li key={registration.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={registration.user.image} alt={registration.user.name} />
                  <AvatarFallback className={colorClass}>
                    {registration.user.firstName || registration.user.lastName ? 
                      `${registration.user.firstName?.[0] || ''}${registration.user.lastName?.[0] || ''}`.toUpperCase() :
                      getInitials(registration.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {(registration.user.firstName || registration.user.lastName) ? 
                      `${registration.user.firstName || ''} ${registration.user.lastName || ''}`.trim() : 
                      registration.user.name}
                  </p>
                  {isAdmin && registration.user.venmoId && (
                    <p className="text-xs text-muted-foreground">Venmo: {registration.user.venmoId}</p>
                  )}
                  {registration.rebuys > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                      {registration.rebuys} {registration.rebuys === 1 ? 'buy-in' : 'buy-ins'}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="flex space-x-1">
                  {actions.map((action, index) => (
                    <Button 
                      key={index}
                      size="sm"
                      variant={action.variant || "outline"}
                      onClick={() => action.onClick(registration)}
                      title={action.title}
                      disabled={action.disabled}
                    >
                      {action.icon && <action.icon className="h-4 w-4 mr-1" />}
                      {action.label}
                    </Button>
                  ))}
                  {removePlayer && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removePlayer(registration.id)}
                      title="Remove player"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 