import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

export default function Register() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // This would come from an API in a real implementation
  const sessionData = {
    exists: true,
    type: 'mtt', // 'mtt' or 'cash'
    buyIn: 100,
    minBuyIn: 100, // For cash games, can be different from buyIn
    maxBuyIn: 200, // For cash games
  };

  const [buyInAmount, setBuyInAmount] = useState(sessionData.type === 'mtt' ? sessionData.buyIn : sessionData.minBuyIn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is signed in
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for the event",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // This would be an API call in a real implementation
    setTimeout(() => {
      toast({
        title: "Registration Submitted",
        description: "Your registration request has been received. Please complete payment to secure your spot.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  if (!sessionData.exists) {
    return (
      <div className="container py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              There is currently no active session to register for. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>
            {sessionData.type === 'mtt' ? 'Tournament Registration' : 'Cash Game Registration'}
          </CardTitle>
          <CardDescription>
            {sessionData.type === 'mtt' 
              ? 'Register for the upcoming tournament. Payment required to secure your seat.'
              : 'Register for the cash game. Payment required to secure your seat.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Player Information */}
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input 
                  id="name" 
                  defaultValue={session?.user?.name || ''} 
                  disabled 
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  defaultValue={session?.user?.email || ''} 
                  disabled 
                  className="mt-1"
                />
              </div>
              
              {/* Buy-In Amount (only adjustable for cash games) */}
              <div>
                <Label htmlFor="buyIn">Buy-In Amount ($)</Label>
                {sessionData.type === 'mtt' ? (
                  <Input 
                    id="buyIn" 
                    value={sessionData.buyIn} 
                    disabled 
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1">
                    <Input 
                      id="buyIn" 
                      type="number" 
                      min={sessionData.minBuyIn} 
                      max={sessionData.maxBuyIn} 
                      value={buyInAmount} 
                      onChange={(e) => setBuyInAmount(Number(e.target.value))} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Min: ${sessionData.minBuyIn} | Max: ${sessionData.maxBuyIn}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Terms and Payment Info */}
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-sm">
                  By registering, you agree to our <Link href="/policy" className="text-primary hover:underline">policies</Link>. 
                  Payment is required to secure your spot. After submission, you'll receive payment instructions.
                </p>
              </div>
            </div>
            
            <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Submit Registration'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 