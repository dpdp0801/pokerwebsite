import { useSession } from "next-auth/react";
export default function AdminHome() {
  const { data: session } = useSession();
  return (
    <main style={{textAlign:"center",marginTop:"20vh"}}>
      <h1>Admin Panel</h1>
      <p>Welcome, {session?.user?.email}</p>
    </main>
  );
}