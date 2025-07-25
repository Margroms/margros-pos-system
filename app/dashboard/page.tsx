import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, ClipboardList, CreditCard, Home, Package } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Select Your Role</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Waiter Dashboard
            </CardTitle>
            <CardDescription>Manage tables and orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Access table layouts, take orders, and manage customer requests.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/waiter">Enter</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Admin Dashboard
            </CardTitle>
            <CardDescription>Manage the entire restaurant</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Access analytics, manage menu items, staff, and restaurant settings.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/admin">Enter</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Kitchen Dashboard
            </CardTitle>
            <CardDescription>Manage food preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              View incoming orders, manage preparation status, and track kitchen operations.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/kitchen">Enter</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing Dashboard
            </CardTitle>
            <CardDescription>Manage payments and bills</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Generate bills, process payments, and manage financial transactions.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/billing">Enter</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Dashboard
            </CardTitle>
            <CardDescription>Manage stock and supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Track inventory levels, manage suppliers, and monitor stock usage.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/inventory">Enter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
