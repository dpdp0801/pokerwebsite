import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // If user is already logged in as admin, redirect to admin dashboard
  useEffect(() => {
    if (session && session.role === "ADMIN") {
      // If there was a callbackUrl, use it, otherwise go to admin dashboard
      const callbackUrl = router.query.callbackUrl || "/admin";
      router.replace(callbackUrl);
    }
  }, [session, router]);
  
  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn("credentials", { 
        password: pw, 
        redirect: true,
        callbackUrl: router.query.callbackUrl || "/admin"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // If already logged in as admin, show loading
  if (session && session.role === "ADMIN") {
    return (
      <div style={{textAlign:"center", marginTop:"20vh"}}>
        <p>Already signed in. Redirecting...</p>
      </div>
    );
  }
  
  return (
    <form onSubmit={submit} style={{textAlign:"center",marginTop:"20vh"}}>
      <h2>Admin Login</h2>
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