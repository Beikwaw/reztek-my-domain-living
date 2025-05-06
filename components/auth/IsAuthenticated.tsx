"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from "lucide-react"
import { isAdmin } from "@/lib/admin-utils"

interface IsAuthenticatedProps {
  children: React.ReactNode
  adminOnly?: boolean
  redirectTo?: string
}

export default function IsAuthenticated({
  children,
  adminOnly = false,
  redirectTo = "/admin/login",
}: IsAuthenticatedProps) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.push(redirectTo)
      } else if (adminOnly) {
        // Check if the user is an admin
        const adminStatus = await isAdmin(user.uid)
        if (!adminStatus) {
          router.push("/")
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, adminOnly, redirectTo])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    )
  }

  return <>{children}</>
}
