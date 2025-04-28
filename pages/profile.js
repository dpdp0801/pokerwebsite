import { useSession, signOut } from "next-auth/react";

export default function Profile() {
  const { data: session, status } = useSession();
  if (status === "loading") return <p>Loading…</p>;
  if (!session) return <p>Not signed in</p>;

  return (
    <main style={{ textAlign: "center", marginTop: "20vh" }}>
      <h1>Player Profile</h1>
      <pre style={{ textAlign: "left", display: "inline-block" }}>
        {JSON.stringify(session, null, 2)}
      </pre>
      <button onClick={() => signOut()}>Sign out</button>
    </main>
  );
} 