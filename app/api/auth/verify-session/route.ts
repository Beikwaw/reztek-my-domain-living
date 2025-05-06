import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log("Session verification API called");
    const { session } = await request.json()
    
    if (!session || typeof session !== 'string') {
      console.error("Invalid session format received");
      return NextResponse.json({ isAdmin: false, error: "Invalid session format" }, { status: 400 });
    }
    
    // First check if this is a direct admin session (base64 encoded JSON)
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
        console.log("Valid direct admin session found in verify-session API");
        return NextResponse.json({ isAdmin: true, email: sessionData.email });
      } else {
        console.log("Invalid direct admin session data");
        return NextResponse.json({ isAdmin: false, error: "Invalid admin session" }, { status: 401 });
      }
    } catch (jsonError) {
      // Not a direct admin session, try Firebase verification
      console.log("Not a direct admin session, trying Firebase verification");
      
      try {
        // Try to verify as a Firebase ID token
        const decodedToken = await adminAuth.verifyIdToken(session);
        console.log("Firebase ID token verified successfully");
        
        // Check if the user is an admin
        if (decodedToken.email === "obsadmin@mydomainliving.co.za") {
          return NextResponse.json({ isAdmin: true, email: decodedToken.email });
        } else {
          console.error("Not an admin email:", decodedToken.email);
          return NextResponse.json({ isAdmin: false, error: "Not authorized as admin" }, { status: 403 });
        }
      } catch (firebaseError) {
        console.error("Firebase verification failed:", firebaseError);
        return NextResponse.json({ isAdmin: false, error: "Session expired or invalid" }, { status: 401 });
      }
    }
  } catch (error) {
    console.error("Error in verify-session API:", error);
    return NextResponse.json({ isAdmin: false, error: "Server error" }, { status: 500 });
  }
}