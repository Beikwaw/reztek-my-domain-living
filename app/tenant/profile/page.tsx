"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import TenantHeader from "@/components/tenant/tenant-header"
import Image from "next/image"

export default function TenantProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantData, setTenantData] = useState<any>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [originalContactNumber, setOriginalContactNumber] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get tenant data
          const tenantDoc = await getDoc(doc(db, "tenants", user.uid))
          
          if (tenantDoc.exists()) {
            const data = tenantDoc.data()
            setTenantData(data)
            setContactNumber(data.contactNumber || "")
            setOriginalContactNumber(data.contactNumber || "")
          } else {
            // Not a tenant, redirect to login
            await auth.signOut()
            router.push("/tenant/login")
          }
        } catch (error) {
          console.error("Error fetching tenant data:", error)
          setError("Failed to load your profile data. Please try again later.")
        } finally {
          setLoading(false)
        }
      } else {
        // Not logged in, redirect to login
        router.push("/tenant/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactNumber(e.target.value)
  }

  const handleUpdateContactNumber = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    // Check if the contact number has changed
    if (contactNumber === originalContactNumber) {
      setError("No changes were made to your contact number.")
      return
    }
    
    setSaving(true)

    if (!auth.currentUser) {
      setError("You must be logged in to update your contact number")
      setSaving(false)
      return
    }

    try {
      const tenantRef = doc(db, "tenants", auth.currentUser.uid)
      
      // Update only the contact number in the tenant document
      await updateDoc(tenantRef, {
        contactNumber: contactNumber,
        updatedAt: new Date().toISOString(),
      })
      
      // Update local state
      setTenantData((prev: any) => ({
        ...prev,
        contactNumber: contactNumber,
      }))
      
      // Update the original contact number to match the new one
      setOriginalContactNumber(contactNumber)
      
      setSuccess("Contact number updated successfully")
    } catch (error) {
      console.error("Error updating contact number:", error)
      setError("Failed to update contact number. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TenantHeader 
        userData={tenantData} 
        onLogout={() => auth.signOut().then(() => router.push("/tenant/login"))} 
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-600 mt-2">View your profile information and update your contact number</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <Card className="md:col-span-1 bg-white border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900">Profile Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-6">
              <div className="relative mb-4">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 flex items-center justify-center">
                  <Image src="/logo.png" alt="RezTek Logo" width={80} height={80} />
                </div>
              </div>
              
              <h2 className="text-lg font-medium text-gray-900">
                {tenantData?.name} {tenantData?.surname}
              </h2>
              <p className="text-gray-500 text-sm">{tenantData?.email}</p>
              
              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Room</span>
                  <span className="font-medium text-gray-900">{tenantData?.roomNumber || "Not assigned"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Residence</span>
                  <span className="font-medium text-gray-900">{tenantData?.residence || "Not assigned"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Contact Number</span>
                  <span className="font-medium text-gray-900">{contactNumber || "Not provided"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Number Update Form */}
          <Card className="md:col-span-2 bg-white border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-900">Update Contact Number</CardTitle>
              <CardDescription>You can only update your contact number. All other profile information is read-only.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-500">{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-500">{success}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleUpdateContactNumber} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">First Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={tenantData?.name || ""}
                      className="border-gray-300 bg-gray-50"
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="surname" className="text-gray-700">Last Name</Label>
                    <Input
                      id="surname"
                      name="surname"
                      value={tenantData?.surname || ""}
                      className="border-gray-300 bg-gray-50"
                      disabled
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={tenantData?.email || ""}
                    className="border-gray-300 bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-500">Email address cannot be changed</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="residence" className="text-gray-700">Residence</Label>
                    <Input
                      id="residence"
                      name="residence"
                      value={tenantData?.residence || ""}
                      className="border-gray-300 bg-gray-50"
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="roomNumber" className="text-gray-700">Room Number</Label>
                    <Input
                      id="roomNumber"
                      name="roomNumber"
                      value={tenantData?.roomNumber || ""}
                      className="border-gray-300 bg-gray-50"
                      disabled
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-gray-700">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    value={contactNumber}
                    onChange={handleContactNumberChange}
                    className="border-gray-300"
                    placeholder="e.g. 0735619758"
                  />
                  <p className="text-xs text-gray-500">Only update your contact number if necessary. This number is used by admins to contact you.</p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="bg-red-600 hover:bg-red-700 text-white" 
                    disabled={saving || contactNumber === originalContactNumber}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Contact Number"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
