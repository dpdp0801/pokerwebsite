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
    // If we have a session, check if user needs to complete their profile
    if (session) {
      console.log('Checking if user needs profile completion', {
        newUser: session.newUser,
        firstName: session.user?.firstName,
        lastName: session.user?.lastName,
        venmoId: session.user?.venmoId,
        pathname: router.pathname
      });
      
      // Definite case: session explicitly marked as new
      if (session.newUser === true) {
        console.log('New user flag detected, redirecting to settings');
        if (router.pathname !== '/settings') {
          router.push('/settings?new=true');
        }
        return;
      }
      
      // Fallback: check profile data
      // We'll be more strict here - if ANY of these are missing, redirect
      const missingProfileData = 
        !session.user?.venmoId || 
        !session.user?.firstName || 
        !session.user?.lastName;
        
      if (missingProfileData && router.pathname !== '/settings') {
        console.log('Missing profile data detected, redirecting to settings', {
          venmoId: !!session.user?.venmoId,
          firstName: !!session.user?.firstName,
          lastName: !!session.user?.lastName
        });
        router.push('/settings?new=true');
      }
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

  // Handle manual navigation to fix the client-side navigation issue
  const handleNavigation = (e, href) => {
    e.preventDefault();
    // Use window.location for a full page reload
    window.location.href = href;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center px-4 md:px-8 backdrop-blur">
      <div className="w-full flex items-center justify-between">
        {/* Left – logo */}
        <div className="flex-1">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Catalina&nbsp;Poker
          </a>
        </div>

        {/* Center nav - now with flex-1 and justify-center */}
        <nav className="hidden md:flex flex-1 justify-center">
          <div className="flex gap-6">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm uppercase tracking-wider hover:underline underline-offset-4"
              >
                {item.label}
              </a>
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
                      <a href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-100">
                        Admin Dashboard
                      </a>
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
                      <a href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100">
                        Settings
                      </a>
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