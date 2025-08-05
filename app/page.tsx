"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      window.location.href = "/dashboard"
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Restaurant POS</CardTitle>
            <CardDescription className="text-sm sm:text-base">Enter your credentials to sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button className="w-full h-11 text-base" onClick={handleLogin}>
              Sign In
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a href="/signup" className="underline">
                Sign up
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
