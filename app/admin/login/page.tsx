"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const router = useRouter()

  // Add debug logging function
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  // Display debug info in development or when needed
  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (debugInfo.length > 0 && !isLocal) {
      console.log("Debug info:", debugInfo);
    }
  }, [debugInfo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo([])

    try {
      addDebugLog(`Attempting admin login with email: ${email}`);
      
      // Special case for the hardcoded admin email
      if (email.toLowerCase() === "obsadmin@mydomainliving.co.za") {
        addDebugLog("Using hardcoded admin login flow");
        
        try {
          // Sign in with Firebase Authentication first
          addDebugLog("Attempting Firebase authentication");
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          addDebugLog("Firebase authentication successful");
          
          // Create direct admin session
          addDebugLog("Creating direct admin session");
          const response = await fetch('/api/auth/direct-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase() }),
            credentials: 'include',
          });
          
          const responseText = await response.text();
          addDebugLog(`Direct login API response status: ${response.status}`);
          addDebugLog(`Direct login API response: ${responseText}`);
          
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            addDebugLog(`Error parsing response: ${e}`);
          }
          
          if (!response.ok) {
            addDebugLog(`Direct login failed: ${JSON.stringify(responseData || {})}`);
            setError("Failed to create admin session. Please try again.");
            setLoading(false);
            return;
          }
          
          addDebugLog("Direct admin login successful, redirecting to dashboard");
          // Redirect to admin dashboard
          router.push("/admin/dashboard");
          return;
        } catch (error: any) {
          addDebugLog(`Hardcoded admin login error: ${error.code || 'unknown'}: ${error.message || 'No message'}`);
          if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            setError("Invalid password for admin account.");
          } else {
            setError(error.message || "Failed to login as admin.");
          }
          setLoading(false);
          return;
        }
      }
      
      // Regular flow for other admin accounts
      addDebugLog("Using regular admin login flow");
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      addDebugLog(`Regular Firebase auth successful for user: ${user.uid}`);

      // Verify this is an admin account
      addDebugLog("Checking if user is an admin");
      const adminDoc = await getDoc(doc(db, "admins", user.uid))

      if (!adminDoc.exists()) {
        // Not an admin, sign out
        addDebugLog("User is not an admin, signing out");
        await auth.signOut()
        setError("This account is not registered as an admin. Please use the correct login portal.")
        setLoading(false)
        return
      }

      // Get the ID token
      addDebugLog("Getting ID token");
      const idToken = await user.getIdToken(true)
      
      // Create session cookie
      addDebugLog("Creating session cookie");
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      })
      
      const responseText = await response.text();
      addDebugLog(`Login API response status: ${response.status}`);
      addDebugLog(`Login API response: ${responseText}`);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        addDebugLog(`Error parsing response: ${e}`);
      }
      
      if (!response.ok) {
        addDebugLog(`Session creation failed: ${JSON.stringify(responseData || {})}`);
        setError("Failed to create admin session. Please try again.")
        setLoading(false)
        return
      }

      // Successful login - redirect to admin dashboard
      addDebugLog("Login successful, redirecting to dashboard");
      router.push("/admin/dashboard")
    } catch (error: any) {
      addDebugLog(`Login error: ${error.code || 'unknown'}: ${error.message || 'No message'}`);
      
      // Provide specific error messages based on error code
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        setError("Invalid email or password. Please check your credentials and try again.")
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.")
      } else {
        setError(error.message || "Failed to login. Please check your credentials.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-lg border border-gray-800 p-8">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="RezTek Logo" width={150} height={80} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-gray-400 mt-2">Sign in to access the admin dashboard</p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-900/20 border-red-600/50 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Debug info section - only visible in development */}
        {debugInfo.length > 0 && (
          <div className="mt-6 p-3 bg-gray-800 rounded text-xs text-gray-300 max-h-40 overflow-auto">
            <h3 className="font-bold mb-1">Debug Info:</h3>
            <ul className="space-y-1">
              {debugInfo.map((log, i) => (
                <li key={i}>{log}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link href="/" className="text-red-500 hover:text-red-400">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
