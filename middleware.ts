import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login form itself to load
  if (pathname === "/admin/login") return NextResponse.next();

  // Protect all other /admin routes
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    
    // Debug log (visible in server logs)
    console.log("Auth check for admin route:", { 
      path: pathname, 
      hasToken: !!token,
      role: token?.role || "none" 
    });

    if (!token) {
      console.log("No session token found, redirecting to login");
      const redirectResponse = NextResponse.redirect(new URL("/admin/login", req.url));
      // Add no-cache header to prevent caching of redirect responses
      redirectResponse.headers.set("Cache-Control", "no-store, max-age=0");
      redirectResponse.headers.set("x-middleware-cache", "no-cache");
      return redirectResponse;
    }
    
    if (token.role !== "ADMIN") {
      console.log("User is not an admin, redirecting to login");
      const redirectResponse = NextResponse.redirect(new URL("/admin/login", req.url));
      // Add no-cache header to prevent caching of redirect responses
      redirectResponse.headers.set("Cache-Control", "no-store, max-age=0");
      redirectResponse.headers.set("x-middleware-cache", "no-cache");
      return redirectResponse;
    }
    
    // User is authenticated and has admin role
    console.log("Admin access granted");
    const response = NextResponse.next();
    // Also set no-cache for successful admin page loads to ensure fresh auth checks
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};