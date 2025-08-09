"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const handleLogin = async () => {
    if (loading) return
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    console.log("[login] signIn", { error, user: data?.user?.id, email })
    if (error) {
      setLoading(false)
      return alert(error.message)
    }

    // Wait for session cookie to be written (prevents bounce by middleware)
    let tries = 0
    let session = null
    while (tries < 10) {
      const res = await supabase.auth.getSession()
      session = res.data.session
      if (session) break
      await new Promise((r) => setTimeout(r, 100))
      tries++
    }
    console.log("[login] session settled", { hasSession: !!session, tries })

    // Resolve role on the client and go straight to the section to avoid flicker
    let role = "waiter"
    const { data: userRow, error: fetchErr } = await supabase
      .from("users")
      .select("role")
      .eq("email", email)
      .single()
    console.log("[login] role fetch", { fetchErr, userRow })
    if (!userRow) {
      const name = session?.user?.user_metadata?.full_name || email.split("@")[0]
      const { data: provisioned, error: provisionErr } = await supabase
        .from("users")
        .upsert([{ id: session?.user?.id, email, name, role }], { onConflict: "email" })
        .select("role")
        .single()
      console.log("[login] role provision", { provisionErr, provisioned })
      role = provisioned?.role || role
    } else {
      role = userRow.role || role
    }

    const roleHome: Record<string, string> = {
      admin: "/dashboard/admin",
      waiter: "/dashboard/waiter",
      kitchen: "/dashboard/kitchen",
      billing: "/dashboard/billing",
      inventory: "/dashboard/inventory",
    }
    window.location.href = roleHome[role] || "/dashboard/waiter"
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
            <Button className="w-full h-11 text-base" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
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
