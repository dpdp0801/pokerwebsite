import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/router";
import { AlertTriangle } from "lucide-react";

export default function Settings() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Form state
  const [settings, setSettings] = useState({
    name: '',
    firstName: '',
    lastName: '',
    venmoId: '',
  });
  
  // Determine if user is new based on URL parameter OR incomplete profile
  const isProfileIncomplete = !settings.firstName || !settings.lastName || !settings.venmoId;
  // Fix: Improved logic for determining if user is new
  const isNewUser = (router.query.new === 'true') || (isProfileIncomplete && router.query.new !== 'false');
  
  // Fetch user settings when session is available
  useEffect(() => {
    if (session?.user) {
      // Initialize with session data first
      setSettings(prev => ({
        ...prev,
        name: session.user.name || '',
        firstName: session.user.firstName || '',
        lastName: session.user.lastName || '',
        venmoId: session.user.venmoId || ''
      }));
      
      // Then fetch latest from API
      fetchUserSettings();
    }
  }, [session]);
  
  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      console.log("Fetching user settings from API");
      const response = await fetch('/api/user/settings');
      
      if (response.ok) {
        const data = await response.json();
        console.log("Received settings from API:", data);
        
        // Always use the API data to override session data
        setSettings({
          name: data.name || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          venmoId: data.venmoId || '',
        });
      } else {
        const error = await response.json();
        console.error("Error response from settings API:", error);
        // Fall back to session data if API fails
        setSettings({
          name: session?.user?.name || '',
          firstName: session?.user?.firstName || '',
          lastName: session?.user?.lastName || '',
          venmoId: session?.user?.venmoId || '',
        });
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
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log("Submitting settings:", settings);
      
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }
      
      const updatedSettings = await response.json();
      console.log("Settings updated successfully:", updatedSettings);
      
      // Update the form with the server response data
      setSettings({
        name: updatedSettings.name || '',
        firstName: updatedSettings.firstName || '',
        lastName: updatedSettings.lastName || '',
        venmoId: updatedSettings.venmoId || '',
      });
      
      // Update session with new name if first or last name was changed
      if (settings.firstName !== session.user.firstName || 
          settings.lastName !== session.user.lastName ||
          session.newUser) {
        const fullName = `${settings.firstName} ${settings.lastName}`.trim();
        await updateSession({
          ...session,
          user: {
            ...session.user,
            firstName: settings.firstName,
            lastName: settings.lastName,
            venmoId: settings.venmoId,
            name: fullName || session.user.name
          },
          // Clear the newUser flag
          newUser: false
        });
      }
      
      toast({
        title: "Settings Saved",
        description: "Your profile settings have been updated.",
      });
      
      // Always set new=false in URL after saving if profile is now complete
      if (settings.firstName && settings.lastName && settings.venmoId) {
        console.log("Setting new=false in URL after saving");
        router.replace('/settings?new=false', undefined, { shallow: true });
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
      
      {/* Show welcome message if new user (URL param or incomplete profile) */}
      {isNewUser && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Welcome to Catalina Poker!</h3>
                <p className="text-yellow-700 text-sm">
                  Please complete your profile below to get started. Adding your Venmo ID will help with payments and prizes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">Loading your settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      name="firstName"
                      value={settings.firstName}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      name="lastName"
                      value={settings.lastName}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 col-span-2">
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
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Venmo ID is used for payments and prizes.
                  </p>
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