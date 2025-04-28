import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    await signIn("credentials",
      { password: pw, callbackUrl: "/admin" });
  };
  return (
    <form onSubmit={submit} style={{textAlign:"center",marginTop:"20vh"}}>
      <h2>Admin Login</h2>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} />
      <button type="submit">Enter</button>
    </form>
  );
}