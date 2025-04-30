import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/hooks/use-toast";

export default function Settings() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state (mock data, would come from API in real implementation)
  const [settings, setSettings] = useState({
    venmoId: "@john-doe",
    emailNotifications: true
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSwitchChange = (name, checked) => {
    setSettings({
      ...settings,
      [name]: checked
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This would be an API call in a real implementation
    setTimeout(() => {
      toast({
        title: "Settings Saved",
        description: "Your profile settings have been updated.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
            <p className="text-muted-foreground">Please sign in to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your contact information and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={session.user.name || ''}
                    disabled 
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Name is managed by your Google account.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={session.user.email || ''}
                    disabled 
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email is managed by your Google account.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="venmoId">Venmo ID</Label>
                  <Input 
                    id="venmoId" 
                    name="venmoId"
                    value={settings.venmoId} 
                    onChange={handleChange}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Venmo ID is used for payments.
                  </p>
                </div>
              </div>
              
              {/* Notification Preferences */}
              <div>
                <h3 className="text-lg font-medium mb-3">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications" className="cursor-pointer">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about upcoming games and results.
                      </p>
                    </div>
                    <Switch 
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => handleSwitchChange('emailNotifications', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <Button type="submit" className="w-full mt-8" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 