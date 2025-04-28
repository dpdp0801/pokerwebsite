import Link from "next/link";

const nav = [
  { href: "/schedule", label: "Schedule" },
  { href: "/rules", label: "Rules" },
  { href: "/profile", label: "Profile" },
];

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-4 md:px-8 backdrop-blur">
      {/* Left – logo */}
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Catalina&nbsp;Poker
      </Link>

      {/* Center nav */}
      <nav className="hidden md:flex gap-6">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm uppercase tracking-wider hover:underline underline-offset-4"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right placeholder for future icons */}
      <div className="w-8" />
    </header>
  );
} 