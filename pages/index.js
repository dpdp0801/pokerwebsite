import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight uppercase">
        NLH&nbsp;9-Max&nbsp;Tournament
      </h1>
      <p className="mt-4 text-muted-foreground text-base md:text-lg tracking-wide">
        Apr&nbsp;28 · 7:00&nbsp;pm &mdash; 385&nbsp;S&nbsp;Catalina&nbsp;Ave
      </p>

      <Button asChild className="mt-10">
        <Link href="/register">Register Now</Link>
      </Button>
    </section>
  );
}