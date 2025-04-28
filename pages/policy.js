import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Policy() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Policies</h1>
      
      <div className="space-y-8">
        {/* MTT Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament (MTT) Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Pre-Registration</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>All pre-registered players must pay in advance to secure their seat.</li>
                <li>Pre-registration fees are non-refundable.</li>
                <li>Your reserved seat will be held for 30 minutes after the tournament start time.</li>
                <li>If you haven't arrived within 30 minutes of start time, your seat will be released to the waitlist, and you'll be placed at the top of the waitlist upon arrival.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Waitlist</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>Players on the waitlist do not need to pay in advance.</li>
                <li>Waitlist seats are assigned in the order they were added to the list.</li>
                <li>Eliminated players may re-enter via the waitlist during the registration period.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Cash Game Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Game Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Pre-Registration</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>All pre-registered players must pay in advance to secure their seat.</li>
                <li>Pre-registration fees are non-refundable.</li>
                <li>Your reserved seat will be held for 30 minutes after the cash game session starts.</li>
                <li>If you haven't arrived within 30 minutes of start time, your seat will be released to the waitlist, and you'll be placed at the top of the waitlist upon arrival.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Waitlist</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2 mt-2">
                <li>Players on the waitlist do not need to pay in advance.</li>
                <li>Waitlist seats are assigned in the order they were added to the list.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payment Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Payment Methods</h3>
              <p className="text-muted-foreground mt-2">
                All payments must be made via Venmo. You will receive a unique code for your payment that must be included in the payment notes.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Refunds</h3>
              <p className="text-muted-foreground mt-2">
                All pre-registration payments are non-refundable as they secure your spot in the game.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 