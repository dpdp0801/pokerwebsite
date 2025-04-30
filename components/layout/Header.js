import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

const nav = [
  { href: "/status", label: "Status" },
  { href: "/info", label: "Info" },
];

export default function Header() {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const router = useRouter();
  
  // Check if user is admin
  const isAdmin = session?.role === "ADMIN";
  
  // Handle new user redirect
  useEffect(() => {
    // If the user is logged in, has just signed in, and is marked as new
    if (session?.newUser && router.pathname !== '/settings') {
      // Redirect to settings page with new user flag
      router.push('/settings?new=true');
    }
  }, [session, router]);
  
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
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center px-4 md:px-8 backdrop-blur">
      <div className="w-full flex items-center justify-between">
        {/* Left – logo */}
        <div className="flex-1">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Catalina&nbsp;Poker
          </Link>
        </div>

        {/* Center nav - now with flex-1 and justify-center */}
        <nav className="hidden md:flex flex-1 justify-center">
          <div className="flex gap-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm uppercase tracking-wider hover:underline underline-offset-4"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Right – auth */}
        <div className="flex-1 flex justify-end">
          {session ? (
            <div>
              <button 
                ref={buttonRef}
                className="text-sm font-medium hover:underline underline-offset-4"
                onClick={() => setShowDropdown(!showDropdown)}
                onMouseEnter={() => setShowDropdown(true)}
              >
                Hello, {session.user?.firstName || session.user?.name?.split(' ')[0] || 'User'}
              </button>
              
              {showDropdown && (
                <div 
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-50"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  {isAdmin ? (
                    // Admin-specific dropdown items
                    <div>
                      <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-100">
                        Admin Dashboard
                      </Link>
                      <button 
                        onClick={() => signOut()} 
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    // Regular user dropdown items
                    <div>
                      <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100">
                        Settings
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
      </div>
    </header>
  );
} 