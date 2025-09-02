"use client"

import type React from "react"

import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChefHat, ClipboardList, CreditCard, Home, Menu, Package } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Determine the current role from the URL
  const rolePath = pathname.split("/")[2]
  const role = ["waiter", "admin", "kitchen", "billing", "inventory"].includes(rolePath) ? rolePath : "waiter"

  // Role-specific data
  const roleData = {
    waiter: {
      name: "John Waiter",
      email: "john.waiter@restaurant.com",
      icon: Home,
      title: "Waiter Dashboard",
    },
    admin: {
      name: "Admin User",
      email: "admin@restaurant.com",
      icon: ClipboardList,
      title: "Admin Dashboard",
    },
    kitchen: {
      name: "Chef Gordon",
      email: "chef@restaurant.com",
      icon: ChefHat,
      title: "Kitchen Dashboard",
    },
    billing: {
      name: "Billing Staff",
      email: "billing@restaurant.com",
      icon: CreditCard,
      title: "Billing Dashboard",
    },
    inventory: {
      name: "Inventory Manager",
      email: "inventory@restaurant.com",
      icon: Package,
      title: "Inventory Dashboard",
    },
  }

  const currentRole = roleData[role as keyof typeof roleData]
  const RoleIcon = currentRole.icon

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-6">
          <div className="md:hidden mr-2">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
                <div className="flex flex-col gap-6 py-6 px-4">
                  <div className="flex items-center gap-3 px-2">
                    <RoleIcon className="h-6 w-6" />
                    <span className="text-lg font-semibold">{currentRole.title}</span>
                  </div>
                  <nav className="flex flex-col gap-2 px-2">
                    <MainNav className="flex flex-col items-start gap-4" role={role} />
                  </nav>
                  {/* AUTH DISABLED - SHOW ALL SECTIONS TO EVERYONE */}
                  <div className="border-t pt-4 px-2">
                    <div className="text-sm font-medium mb-3 text-muted-foreground">Switch Section</div>
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="outline" size="sm" className="justify-start" asChild>
                        <Link href="/dashboard/admin" onClick={() => setIsSidebarOpen(false)}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Admin
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" asChild>
                        <Link href="/dashboard/kitchen" onClick={() => setIsSidebarOpen(false)}>
                          <ChefHat className="mr-2 h-4 w-4" />
                          Kitchen
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" asChild>
                        <Link href="/dashboard/billing" onClick={() => setIsSidebarOpen(false)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Billing
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" asChild>
                        <Link href="/dashboard/waiter" onClick={() => setIsSidebarOpen(false)}>
                          <Home className="mr-2 h-4 w-4" />
                          Waiter
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start" asChild>
                        <Link href="/dashboard/inventory" onClick={() => setIsSidebarOpen(false)}>
                          <Package className="mr-2 h-4 w-4" />
                          Inventory
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <RoleIcon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <Link href={`/dashboard/${role}`} className="font-bold text-sm sm:text-base truncate">
              <span className="hidden sm:inline">{currentRole.title}</span>
              <span className="sm:hidden">{currentRole.title.split(' ')[0]}</span>
            </Link>
          </div>
          <div className="hidden md:flex md:flex-1 md:items-center md:justify-between md:gap-10">
            <MainNav className="mx-6" role={role} />
            <div className="flex items-center gap-4">
              {/* AUTH DISABLED - SHOW ALL SECTIONS TO EVERYONE */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/admin">Admin</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/kitchen">Kitchen</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/billing">Billing</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/waiter">Waiter</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/inventory">Inventory</Link>
                </Button>
              </div>
              <ThemeToggle />
              <UserNav />
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}
