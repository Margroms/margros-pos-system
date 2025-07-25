import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChefHat, ClipboardList, CreditCard, Home, Package } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input 
                id="password" 
                placeholder="••••••••" 
                type="password" 
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button className="w-full h-11 text-base" asChild>
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <div className="text-center text-sm text-muted-foreground">Select your role to preview:</div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="h-11 text-xs" asChild>
                <Link href="/dashboard/waiter">
                  <Home className="mr-1.5 h-4 w-4" />
                  <span>Waiter</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 text-xs" asChild>
                <Link href="/dashboard/admin">
                  <ClipboardList className="mr-1.5 h-4 w-4" />
                  <span>Admin</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 text-xs" asChild>
                <Link href="/dashboard/kitchen">
                  <ChefHat className="mr-1.5 h-4 w-4" />
                  <span>Kitchen</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 text-xs" asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  <span>Billing</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="col-span-2 h-11 text-xs" asChild>
                <Link href="/dashboard/inventory">
                  <Package className="mr-1.5 h-4 w-4" />
                  <span>Inventory</span>
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
