import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Register() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  
  // This would come from an API in a real implementation
  const sessionData = {
    exists: true,
    type: 'mtt', // 'mtt' or 'cash'
    buyIn: 100,
    minBuyIn: 100, // For cash games, can be different from buyIn
    maxBuyIn: 200, // For cash games
  };

  const [buyInAmount, setBuyInAmount] = useState(sessionData.type === 'mtt' ? sessionData.buyIn : sessionData.minBuyIn);

  // Check if user is authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to register",
        variant: "destructive",
      });
      // Redirect to home page
      router.push("/");
    }
  }, [status, router, toast]);

  const generatePaymentCode = (userId, sessionId) => {
    // Create a unique but readable code format
    const userIdPart = userId?.substring(0, 3).toUpperCase() || 'USR';
    const timestamp = new Date().getTime().toString().substring(9, 13);
    return `CP-${userIdPart}-${sessionId}-${timestamp}`;
  };

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
    
    // Generate a payment code for this registration
    const code = generatePaymentCode(session.user.email || session.user.id, sessionData.type === 'mtt' ? 'MTT1' : 'CASH1');
    setPaymentCode(code);
    
    // This would be an API call in a real implementation
    setTimeout(() => {
      setRegistrationSubmitted(true);
      setIsSubmitting(false);
    }, 1000);
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="container py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not authenticated, user will be redirected via the useEffect
  if (!session) {
    return (
      <div className="container py-12 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              You must be signed in to register for poker events.
            </p>
            <Button 
              className="w-full" 
              onClick={() => signIn('google')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          
          {registrationSubmitted && (
            <div className="mt-8">
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-800">Registration Submitted!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your registration has been received. Please complete payment to secure your spot.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6 border rounded-md p-4">
                <div>
                  <h3 className="font-medium text-lg mb-2">Payment Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Open your Venmo app or website</li>
                    <li>Send ${sessionData.type === 'mtt' ? sessionData.buyIn : buyInAmount} to <span className="font-medium text-foreground">@catalina-poker</span></li>
                    <li>In the payment note, you <span className="font-bold">MUST</span> include your unique payment code:</li>
                  </ol>
                </div>
                
                <div className="bg-muted/70 p-4 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Your Payment Code:</p>
                  <p className="font-mono text-lg font-semibold text-center">{paymentCode}</p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p className="mb-1 font-medium">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Payment must be received within 24 hours to secure your spot</li>
                    <li>Your registration is not confirmed until payment is approved</li>
                    <li>No refunds after payment confirmation</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 