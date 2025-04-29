import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // If user is already logged in as admin, redirect to admin dashboard immediately
  useEffect(() => {
    if (status === "authenticated" && session?.role === "ADMIN") {
      // Navigate immediately to admin page
      router.replace("/admin");
      
      // Fallback: Use window.location as a last resort if router doesn't work
      const timeout = setTimeout(() => {
        window.location.href = "/admin";
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [session, status, router]);
  
  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", { 
        password: pw, 
        redirect: false,
        callbackUrl: "/admin"
      });
      
      if (result?.error) {
        setMessage("Invalid password");
      } else if (result?.url) {
        // Direct navigation after successful login
        window.location.href = result.url;
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If loaded but not yet authenticated, show the login form
  if (status === "unauthenticated" || (status === "authenticated" && session?.role !== "ADMIN")) {
    return (
      <form onSubmit={submit} style={{textAlign:"center",marginTop:"20vh"}}>
        <h2>Admin Login</h2>
        {message && <p style={{color: message.includes("Success") ? "green" : "red"}}>{message}</p>}
        <input 
          type="password" 
          value={pw} 
          onChange={e=>setPw(e.target.value)} 
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Enter"}
        </button>
      </form>
    );
  }
  
  // Show a minimal loading screen while the redirection happens
  return (
    <div style={{textAlign:"center", marginTop:"20vh"}}>
      <p>Redirecting to admin dashboard...</p>
    </div>
  );
}