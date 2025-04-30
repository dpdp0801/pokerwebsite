import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/hooks/use-toast";

export default function Settings() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [settings, setSettings] = useState({
    name: '',
    venmoId: '',
    emailNotifications: true
  });
  
  // Fetch user settings when session is available
  useEffect(() => {
    if (session?.user) {
      // Initialize with session data first
      setSettings(prev => ({
        ...prev,
        name: session.user.name || '',
        venmoId: session.user.venmoId || ''
      }));
      
      // Then fetch latest from API
      fetchUserSettings();
    }
  }, [session]);
  
  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/settings');
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          name: data.name || session?.user?.name || '',
          venmoId: data.venmoId || '',
          emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true
        }));
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast({
        title: "Error",
        description: "Could not load your settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        // Update session with new name if it was changed
        if (settings.name !== session.user.name) {
          await updateSession({
            ...session,
            user: {
              ...session.user,
              name: settings.name
            }
          });
        }
        
        toast({
          title: "Settings Saved",
          description: "Your profile settings have been updated.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Could not save your settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
          {loading ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">Loading your settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name"
                      value={settings.name}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your name as it will appear to other players.
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
                      placeholder="@your-venmo-id"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 