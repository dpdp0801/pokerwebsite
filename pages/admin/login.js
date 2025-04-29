import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [redirected, setRedirected] = useState(false);
  
  // If user is already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    // Only run this effect if the session status is "authenticated" and we haven't already redirected
    if (status === "authenticated" && session?.role === "ADMIN" && !redirected) {
      console.log("Admin already authenticated, redirecting to admin dashboard");
      setMessage("Already signed in. Redirecting...");
      setRedirected(true);
      
      // Use Next.js router instead of window.location for smoother transition
      router.push("/admin");
    }
  }, [session, status, router, redirected]);
  
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
        setMessage("Success! Redirecting...");
        // Use Next.js router for redirection
        router.push(result.url);
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If already logged in as admin, show loading
  if (status === "authenticated" && session?.role === "ADMIN") {
    return (
      <div style={{textAlign:"center", marginTop:"20vh"}}>
        <p>{message || "Already signed in. Redirecting..."}</p>
      </div>
    );
  }
  
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