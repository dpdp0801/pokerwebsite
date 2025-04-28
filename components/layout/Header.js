import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

const nav = [
  { href: "/status", label: "Status" },
  { href: "/structure", label: "Structure" },
  { href: "/policy", label: "Policy" },
];

export default function Header() {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      {/* Right – auth */}
      <div className="relative">
        {session ? (
          <div>
            <button 
              ref={buttonRef}
              className="text-sm font-medium hover:underline underline-offset-4"
              onClick={() => setShowDropdown(!showDropdown)}
              onMouseEnter={() => setShowDropdown(true)}
            >
              Hello, {session.user?.name?.split(' ')[0] || 'User'}
            </button>
            
            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-50"
                onMouseLeave={() => setShowDropdown(false)}
              >
                <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-100">
                  Account
                </Link>
                <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100">
                  Settings
                </Link>
                <Link href="/record" className="block px-4 py-2 text-sm hover:bg-gray-100">
                  Record
                </Link>
                <button 
                  onClick={() => signOut()} 
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => signIn('google')} 
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
} 