import Link from "next/link";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Home() {
  const { data: session } = useSession();
  const [showDialog, setShowDialog] = useState(false);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  // This would come from an API in a real implementation
  const [sessionExists, setSessionExists] = useState(false);

  const handleRegisterClick = () => {
    // First check if user is authenticated
    if (!session) {
      setShowSignInDialog(true);
      return;
    }
    
    // Then check if poker session exists
    if (!sessionExists) {
      setShowDialog(true);
    } else {
      // If user is authenticated and session exists, proceed to registration page
      window.location.href = "/register";
    }
  };

  return (
    <>
      <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 -mt-16">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight uppercase">
          NLH&nbsp;9-Max&nbsp;Tournament
        </h1>
        <p className="mt-4 text-muted-foreground text-base md:text-lg tracking-wide">
          Apr&nbsp;28 · 7:00&nbsp;pm &mdash; 385&nbsp;S&nbsp;Catalina&nbsp;Ave
        </p>

        <Button onClick={handleRegisterClick} className="mt-10">
          Register Now
        </Button>
      </section>

      {/* Dialog for when no session exists */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Active Session</DialogTitle>
            <DialogDescription>
              There is currently no active poker session available for registration. Please check back later or contact the administrator for more information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for when user is not signed in */}
      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You must be signed in to register for poker events. Would you like to sign in now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSignInDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => signIn('google')}>
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}