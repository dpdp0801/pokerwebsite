import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // If user is already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (session && session.role === "ADMIN") {
      setMessage("Already signed in. Redirecting...");
      
      // Small delay to avoid immediate redirect which can cause issues
      const timer = setTimeout(() => {
        // If there was a callbackUrl, use it, otherwise go to admin dashboard
        const callbackUrl = router.query.callbackUrl || "/admin";
        router.push(callbackUrl);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [session, router]);
  
  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await signIn("credentials", { 
        password: pw, 
        redirect: false, // Changed to false to handle redirection manually
        callbackUrl: router.query.callbackUrl || "/admin"
      });
      
      if (result?.error) {
        setMessage("Invalid password");
      } else if (result?.url) {
        setMessage("Success! Redirecting...");
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
  if (session && session.role === "ADMIN") {
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