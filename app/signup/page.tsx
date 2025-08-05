
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("waiter")

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (error) {
      alert(error.message)
    } else if (data.user) {
      await supabase.from("users").insert({
        id: data.user.id,
        name,
        email,
        role,
      })
      window.location.href = "/"
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-sm sm:text-base">Enter your details to create an account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input 
                id="name" 
                placeholder="Your Name" 
                type="text" 
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                placeholder="name@example.com" 
                type="email" 
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input 
                id="password" 
                placeholder="••••••••" 
                type="password" 
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button className="w-full h-11 text-base" onClick={handleSignup}>
              Sign Up
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
