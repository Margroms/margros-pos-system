"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function UserNav() {
  const router = useRouter()
  const supabase = createClient()
  
  // AUTH SYSTEM COMMENTED OUT - STATIC USER INFO
  const [email, setEmail] = useState<string>("admin@restaurant.com")
  const [name, setName] = useState<string>("Admin User")
  const [role, setRole] = useState<string>("admin")

  useEffect(() => {
    // AUTH SYSTEM COMMENTED OUT - NO SESSION FETCHING
    /*
    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      const userEmail = session?.user?.email || ""
      setEmail(userEmail)
      setName(session?.user?.user_metadata?.full_name || userEmail?.split("@")[0] || "User")
      if (userEmail) {
        const { data } = await supabase.from("users").select("role").eq("email", userEmail).single()
        if (data?.role) setRole(data.role)
      }
    })()
    return () => {
      mounted = false
    }
    */
  }, [])

  const handleLogout = async () => {
    // AUTH SYSTEM COMMENTED OUT - SIMPLE REDIRECT
    router.replace("/")
    /*
    await supabase.auth.signOut()
    router.replace("/")
    */
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" alt={name} />
            <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate" title={name}>{name}</p>
            <p className="text-xs leading-none text-muted-foreground truncate" title={email}>{email}</p>
            {role && <p className="text-xs font-medium text-muted-foreground mt-1 capitalize">{role} Role</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
