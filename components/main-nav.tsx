"use client"

import { cn } from "@/lib/utils"
import { ChefHat, ClipboardList, CreditCard, Home, Package, Settings, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface MainNavProps {
  className?: string
  role: string
}

export function MainNav({ className, role }: MainNavProps) {
  const pathname = usePathname()

  const roleLinks = {
    waiter: [
      { href: "/dashboard/waiter", label: "Tables", icon: Home },
    ],
    admin: [
      { href: "/dashboard/admin", label: "Overview", icon: Home },
      { href: "/dashboard/admin/menu", label: "Menu", icon: Package },
 
    ],
    kitchen: [
      { href: "/dashboard/kitchen", label: "Orders Queue", icon: ChefHat },
    ],
    billing: [
      { href: "/dashboard/billing", label: "Active Bills", icon: CreditCard },
    ],
    inventory: [
      { href: "/dashboard/inventory", label: "Overview", icon: Package },
    ],
  }

  const links = roleLinks[role as keyof typeof roleLinks] || []

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {links.map((link) => {
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary min-h-[44px] px-2 py-2 rounded-md",
              pathname === link.href ? "text-primary bg-secondary" : "text-muted-foreground hover:bg-secondary/50",
            )}
          >
            <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
