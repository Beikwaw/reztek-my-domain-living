import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Only protect /admin routes except /admin/login
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== "/admin/login"
  ) {
    // Check for session cookie
    const session = request.cookies.get("session")?.value
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    
    try {
      // First check if this is a direct admin session
      try {
        // Try to decode as a direct admin session
        const sessionData = JSON.parse(Buffer.from(session, 'base64').toString());
        
        // Check if it's a valid admin session
        if (
          sessionData.email === "obsadmin@mydomainliving.co.za" && 
          sessionData.role === "admin" &&
          // Session not expired (5 days)
          sessionData.timestamp > Date.now() - (5 * 24 * 60 * 60 * 1000)
        ) {
          console.log("Valid direct admin session found");
          return NextResponse.next();
        }
      } catch (error) {
        // Not a direct admin session, continue with normal verification
        console.log("Not a direct admin session, continuing with normal verification");
      }
      
      // Verify the session using our API route
      const response = await fetch(`${request.nextUrl.origin}/api/auth/verify-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      })
      
      if (!response.ok) {
        console.error("Session verification failed with status:", response.status);
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
      
      const data = await response.json()
      
      if (!data.isAdmin) {
        console.error("User is not an admin");
        return NextResponse.redirect(new URL("/", request.url))
      }
      
      return NextResponse.next()
    } catch (error) {
      console.error("Error in middleware:", error)
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
}
