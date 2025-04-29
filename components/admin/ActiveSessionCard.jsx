import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ActiveSessionCard({ 
  session, 
  onStart, 
  onPause, 
  onResume, 
  onEdit, 
  onDelete, 
  onCreateNew 
}) {
  // Format status for display
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'not_started': return 'Not Started';
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };
  
  // If no active session
  if (!session.exists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Session Management</CardTitle>
          <CardDescription>
            Manage the current active poker session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-6">No active session. Create a new poker session to get started.</p>
            <Button onClick={onCreateNew}>Create New Session</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // With active session
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Session Management</CardTitle>
        <CardDescription>
          Manage the current active poker session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-muted rounded-md p-4">
            <h3 className="font-medium text-lg mb-2">Current Session</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span> {session.type === 'mtt' || session.type === 'tournament' ? 'Tournament' : 'Cash Game'}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span> {getStatusDisplay(session.status)}
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span> {session.date}
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span> {session.time}
              </div>
              <div>
                <span className="text-muted-foreground">Buy-in:</span> ${session.buyIn}
              </div>
              <div>
                <span className="text-muted-foreground">Max Players:</span> {session.maxPlayers}
              </div>
              
              {/* For cash games, show blinds if available */}
              {session.type === 'cash' && (
                <>
                  {session.smallBlind && session.bigBlind && (
                    <div>
                      <span className="text-muted-foreground">Blinds:</span> ${session.smallBlind}/${session.bigBlind}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Min Buy-in:</span> ${session.minBuyIn}
                  </div>
                </>
              )}
              
              <div className="col-span-2">
                <span className="text-muted-foreground">Registered Players:</span> {session.registeredPlayers || 0} of {session.maxPlayers}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {session.status === 'not_started' && (
              <Button onClick={onStart}>Start Session</Button>
            )}
            
            {session.status === 'active' && session.type === 'mtt' && (
              <Button onClick={onPause}>Pause Tournament</Button>
            )}
            
            {session.status === 'paused' && session.type === 'mtt' && (
              <Button onClick={onResume}>Resume Tournament</Button>
            )}
            
            <Button onClick={() => onEdit(session)}>
              Edit Session
            </Button>
            
            <Button variant="destructive" onClick={() => onDelete(session.id)}>
              Delete Session
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 