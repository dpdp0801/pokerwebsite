import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main style={{ textAlign: "center", marginTop: "20vh" }}>
      <h1>Catalina Poker</h1>
      {session ? (
        <>
          <p>Signed in as {session.user.email} ({session.role})</p>
          <button onClick={() => signOut()}>Sign out</button>
        </>
      ) : (
        <button onClick={() => signIn("google", { callbackUrl: "/profile" })}>
          Sign in with Google
        </button>
      )}
    </main>
  );
}