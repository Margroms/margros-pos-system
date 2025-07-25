"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase, type Order, type OrderItem } from "@/lib/supabase"
import { Bell, Check, Clock, Printer } from "lucide-react"
import { useState, useEffect } from "react"

export default function KitchenDashboard() {
  const { toast } = useToast()

  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders()
      })
      .subscribe()

    const orderItemsSubscription = supabase
      .channel("kitchen-order-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchOrderItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSubscription)
      supabase.removeChannel(orderItemsSubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchOrders(), fetchOrderItems()])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables (*)
      `)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } else {
      setOrders(data || [])
    }
  }

  const fetchOrderItems = async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        *,
        menu_items (*)
      `)
      .in("status", ["pending", "preparing", "ready"])

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch order items",
        variant: "destructive",
      })
    } else {
      setOrderItems(data || [])
    }
  }

  // Get order items for a specific order
  const getOrderItems = (orderId: number) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  // Update item status
  const updateItemStatus = async (orderId: number, itemId: number, status: "pending" | "preparing" | "ready") => {
    try {
      const { error } = await supabase.from("order_items").update({ status }).eq("id", itemId)

      if (error) throw error

      // Check if all items in the order are ready
      const orderItemsList = getOrderItems(orderId)
      const updatedItems = orderItemsList.map((item) => (item.id === itemId ? { ...item, status } : item))

      // Update order status based on item statuses
      let orderStatus: "pending" | "preparing" | "ready" = "pending"
      if (updatedItems.every((item) => item.status === "ready")) {
        orderStatus = "ready"
      } else if (
        updatedItems.some((item) => item.status === "preparing") &&
        !updatedItems.some((item) => item.status === "pending")
      ) {
        orderStatus = "preparing"
      }

      await supabase.from("orders").update({ status: orderStatus }).eq("id", orderId)

      toast({
        title: "Item Status Updated",
        description: `Item has been marked as ${status}`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating item status:", error)
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      })
    }
  }

  // Update order status
  const updateOrderStatus = async (orderId: number, status: "pending" | "preparing" | "ready") => {
    try {
      // Update order status
      const { error: orderError } = await supabase.from("orders").update({ status }).eq("id", orderId)

      if (orderError) throw orderError

      // Update all items in the order to match the order status
      const { error: itemsError } = await supabase.from("order_items").update({ status }).eq("order_id", orderId)

      if (itemsError) throw itemsError

      toast({
        title: "Order Status Updated",
        description: `Order #${orderId} has been marked as ${status}`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  // Print order


  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500"
      case "preparing":
        return "bg-blue-500"
      case "ready":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Calculate time elapsed in minutes
  const getTimeElapsed = (timestamp: string) => {
    const orderTime = new Date(timestamp).getTime()
    const currentTime = new Date().getTime()
    return Math.floor((currentTime - orderTime) / 60000)
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Kitchen Dashboard</h1>
          <p className="text-muted-foreground">Manage food preparation and order queue</p>
        </div>

        <Tabs defaultValue="all">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="preparing">Preparing</TabsTrigger>
              <TabsTrigger value="ready">Ready</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Bell className="h-4 w-4" />
              <span>New Order Alert</span>
            </Button>
          </div>

          {["all", "pending", "preparing", "ready"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders
                  .filter((order) => tab === "all" || order.status === tab)
                  .map((order) => {
                    const items = getOrderItems(order.id)
                    return (
                      <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Table {order.tables?.number}</CardTitle>
                            <Badge className={`text-white ${getStatusColor(order.status)}`}>
                              {order.status === "pending"
                                ? "Pending"
                                : order.status === "preparing"
                                  ? "Preparing"
                                  : "Ready"}
                            </Badge>
                          </div>
                          <CardDescription className="flex justify-between">
                            <span>Order #{order.id}</span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(order.created_at)} ({getTimeElapsed(order.created_at)} min ago)
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <ul className="space-y-2">
                            {items.map((item) => (
                              <li key={item.id} className="flex justify-between items-center p-2 rounded-md bg-muted">
                                <div>
                                  <div className="font-medium">
                                    {item.quantity}x {item.menu_items?.name}
                                  </div>
                                  {item.notes && (
                                    <div className="text-xs text-muted-foreground">Note: {item.notes}</div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant={item.status === "pending" ? "default" : "outline"}
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => updateItemStatus(order.id, item.id, "pending")}
                                  >
                                    Pending
                                  </Button>
                                  <Button
                                    variant={item.status === "preparing" ? "default" : "outline"}
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => updateItemStatus(order.id, item.id, "preparing")}
                                  >
                                    Preparing
                                  </Button>
                                  <Button
                                    variant={item.status === "ready" ? "default" : "outline"}
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => updateItemStatus(order.id, item.id, "ready")}
                                  >
                                    Ready
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          {order.notes && (
                            <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-950 rounded-md text-sm">
                              <span className="font-medium">Order Notes:</span> {order.notes}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex gap-2 pt-2">
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            disabled={order.status === "ready"}
                          >
                            <Check className="mr-1 h-4 w-4" /> Mark All Ready
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
              </div>

              {orders.filter((order) => tab === "all" || order.status === tab).length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-lg">No {tab === "all" ? "" : tab} orders at the moment</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
