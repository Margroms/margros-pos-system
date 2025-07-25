"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { supabase, type Table, type OrderItem, type MenuItem, type MenuCategory } from "@/lib/supabase"
import { Check, Edit, Send, Trash, Receipt } from "lucide-react"
import { useState, useEffect } from "react"

// Define Order type matching actual database constraints
type Order = {
  id: number
  table_id: number
  waiter_id?: string
  status: "pending" | "preparing" | "ready" | "served" | "paid"
  notes?: string
  subtotal: number
  discount: number
  total: number
  payment_method?: "cash" | "card" | "upi" | "qr"
  created_at: string
  updated_at: string
  tables?: Table
}

export default function WaiterDashboard() {
  const { toast } = useToast()

  // State
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [newOrder, setNewOrder] = useState<Omit<OrderItem, "id" | "order_id" | "created_at" | "updated_at">[]>([])
  const [orderNotes, setOrderNotes] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions with better error handling
    const tablesSubscription = supabase
      .channel("tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, (payload) => {
        console.log("Tables change detected:", payload)
        fetchTables()
      })
      .subscribe()

    const ordersSubscription = supabase
      .channel("orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log("Orders change detected:", payload)
        fetchOrders()
      })
      .subscribe()

    const orderItemsSubscription = supabase
      .channel("order_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, (payload) => {
        console.log("Order items change detected:", payload)
        fetchOrderItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(tablesSubscription)
      supabase.removeChannel(ordersSubscription)
      supabase.removeChannel(orderItemsSubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchTables(), fetchOrders(), fetchOrderItems(), fetchMenuItems(), fetchMenuCategories()])
    setLoading(false)
  }

  const fetchTables = async () => {
    const { data, error } = await supabase.from("tables").select("*").order("number")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tables",
        variant: "destructive",
      })
    } else {
      setTables(data || [])
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          tables (*)
        `)
        .in("status", ["pending", "preparing", "ready", "served"])
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch orders error:", error)
        throw error
      }

      console.log("Orders fetched successfully:", data?.length || 0, "orders")
      setOrders(data || [])
    } catch (error) {
      console.error("Error in fetchOrders:", error)
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    }
  }

  const fetchOrderItems = async () => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          menu_items (*)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch order items error:", error)
        throw error
      }

      console.log("Order items fetched successfully:", data?.length || 0, "items")
      setOrderItems(data || [])
    } catch (error) {
      console.error("Error in fetchOrderItems:", error)
      toast({
        title: "Error",
        description: "Failed to fetch order items",
        variant: "destructive",
      })
    }
  }

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_categories (*)
      `)
      .eq("is_available", true)
      .order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch menu items",
        variant: "destructive",
      })
    } else {
      setMenuItems(data || [])
    }
  }

  const fetchMenuCategories = async () => {
    const { data, error } = await supabase.from("menu_categories").select("*").order("display_order")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch menu categories",
        variant: "destructive",
      })
    } else {
      setMenuCategories(data || [])
    }
  }

  // Get orders for a specific table
  const getTableOrders = (tableId: number) => {
    return orders.filter((order) => order.table_id === tableId)
  }

  // Get order items for a specific order
  const getOrderItems = (orderId: number) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  // Handle table selection
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table)
    setNewOrder([])
    setOrderNotes("")
  }

  // Add item to new order
  const addItemToOrder = (item: MenuItem) => {
    const existingItem = newOrder.find((orderItem) => orderItem.menu_item_id === item.id)

    if (existingItem) {
      setNewOrder(
        newOrder.map((orderItem) =>
          orderItem.menu_item_id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem,
        ),
      )
    } else {
      setNewOrder([
        ...newOrder,
        {
          menu_item_id: item.id,
          quantity: 1,
          price: item.price,
          notes: "",
          status: "pending",
        },
      ])
    }
  }

  // Remove item from new order
  const removeItemFromOrder = (menuItemId: number) => {
    setNewOrder(newOrder.filter((item) => item.menu_item_id !== menuItemId))
  }

  // Update item quantity in new order
  const updateItemQuantity = (menuItemId: number, quantity: number) => {
    if (quantity < 1) return

    setNewOrder(newOrder.map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity } : item)))
  }

  // Update item notes in new order
  const updateItemNotes = (menuItemId: number, notes: string) => {
    setNewOrder(newOrder.map((item) => (item.menu_item_id === menuItemId ? { ...item, notes } : item)))
  }

  // Place order
  const placeOrder = async () => {
    if (!selectedTable || newOrder.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      })
      return
    }

    try {
      // Calculate totals
      const subtotal = newOrder.reduce((total, item) => total + item.price * item.quantity, 0)
      const total = subtotal

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: selectedTable.id,
          status: "pending",
          notes: orderNotes,
          subtotal,
          discount: 0,
          total,
        })
        .select()
        .single()

      if (orderError) {
        console.error("Order creation error:", orderError)
        throw orderError
      }

      console.log("Order created successfully:", orderData)

      // Create order items
      const orderItemsToInsert = newOrder.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        status: "pending" as const,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert)

      if (itemsError) {
        console.error("Order items creation error:", itemsError)
        throw itemsError
      }

      console.log("Order items created successfully")

      // Update table status to occupied
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "occupied" })
        .eq("id", selectedTable.id)

      if (tableError) {
        console.error("Table status update error:", tableError)
        throw tableError
      }

      console.log("Table status updated successfully")

      // Reset form
      setNewOrder([])
      setOrderNotes("")

      toast({
        title: "Order Placed Successfully",
        description: `Order #${orderData.id} has been sent to the kitchen for Table ${selectedTable.number}`,
      })

      // Refresh data to ensure UI updates
      await fetchData()
      
      console.log("Data refreshed after order placement")
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update order status
  const updateOrderStatus = async (orderId: number, status: "pending" | "preparing" | "ready" | "served") => {
    try {
      console.log(`Updating order ${orderId} to status: ${status}`)
      
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)

      if (error) {
        console.error("Order status update error:", error)
        throw error
      }

      console.log(`Order ${orderId} status updated successfully to ${status}`)

      toast({
        title: "Order Updated",
        description: `Order #${orderId} has been marked as ${status}`,
      })

      // Refresh data to ensure UI updates
      await fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Send all table orders to billing
  const sendToBilling = async (tableId: number) => {
    try {
      // Get all served orders for this table
      const tableOrders = getTableOrders(tableId).filter(order => order.status === "served")
      
      if (tableOrders.length === 0) {
        toast({
          title: "Error",
          description: "No served orders found for this table",
          variant: "destructive",
        })
        return
      }

      // Calculate total amount for the table
      const totalAmount = tableOrders.reduce((sum, order) => sum + order.total, 0)

      // Create payment entries for ALL orders (not just the first one)
      const paymentInserts = tableOrders.map(order => ({
        order_id: order.id,
        amount: order.total,
        payment_method: "pending", // Will be updated when actual payment is processed
        status: "pending",
        // processed_by will be set when payment is actually processed
      }))

      const { error: paymentError } = await supabase
        .from("payments")
        .insert(paymentInserts)

      if (paymentError) throw paymentError

      // Update table status to bill-pending
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "bill-pending" })
        .eq("id", tableId)

      if (tableError) throw tableError

      // Keep orders as "served" - don't change their status since "billing" is not allowed
      // The table status "bill-pending" indicates they're ready for billing

      toast({
        title: "Sent to Billing",
        description: `All ${tableOrders.length} order(s) for Table ${selectedTable?.number} have been sent to billing (Total: ₹${totalAmount.toFixed(2)})`,
      })

      // Refresh data and update selected table state
      await fetchData()
      
      // Update the selected table with the new status
      if (selectedTable) {
        const updatedTable = { ...selectedTable, status: "bill-pending" as const }
        setSelectedTable(updatedTable)
      }
    } catch (error) {
      console.error("Error sending to billing:", error)
      toast({
        title: "Error",
        description: "Failed to send orders to billing",
        variant: "destructive",
      })
    }
  }

  // Check if table has any served orders
  const hasServedOrders = (tableId: number) => {
    return getTableOrders(tableId).some(order => order.status === "served")
  }

  // Check if table has pending payment (bill sent to billing)
  const hasPendingPayment = async (tableId: number) => {
    const tableOrders = getTableOrders(tableId)
    if (tableOrders.length === 0) return false

    const orderIds = tableOrders.map(order => order.id)
    const { data } = await supabase
      .from("payments")
      .select("*")
      .in("order_id", orderIds)
      .eq("status", "pending")

    return (data && data.length > 0)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "free":
        return "bg-green-600 hover:bg-green-700"
      case "occupied":
        return "bg-blue-600 hover:bg-blue-700"
      case "bill-pending":
        return "bg-amber-600 hover:bg-amber-700"
      default:
        return "bg-gray-600 hover:bg-gray-700"
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "free":
        return "Free"
      case "occupied":
        return "Occupied"
      case "bill-pending":
        return "Bill Pending"
      default:
        return "Unknown"
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tables...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Table Layout</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Select a table to manage orders</p>
      </div>

      <Tabs defaultValue="AC" className="w-full">
        <TabsList className="mb-4 h-12 w-full grid grid-cols-3 p-1">
          <TabsTrigger value="AC" className="text-sm font-medium py-3 px-2">AC Section</TabsTrigger>
          <TabsTrigger value="Non-AC" className="text-sm font-medium py-3 px-2">Non-AC</TabsTrigger>
          <TabsTrigger value="Outdoor" className="text-sm font-medium py-3 px-2">Outdoor</TabsTrigger>
        </TabsList>

        {["AC", "Non-AC", "Outdoor"].map((zone) => (
          <TabsContent key={zone} value={zone} className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {tables
                .filter((table) => table.zone === zone)
                .map((table) => {
                  const tableOrders = getTableOrders(table.id)
                  return (
                    <Card
                      key={table.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg border-2 min-h-[120px] sm:min-h-[130px] active:scale-95",
                        selectedTable?.id === table.id && "ring-2 ring-primary border-primary shadow-md",
                        table.status === "occupied" ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" : "",
                        table.status === "bill-pending" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "",
                        table.status === "free" ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "",
                      )}
                      onClick={() => handleTableSelect(table)}
                    >
                      <CardContent className="p-3 sm:p-4 h-full">
                        <div className="text-center space-y-2 h-full flex flex-col justify-center">
                          <div className="flex items-center justify-center">
                            <Badge className={cn("text-white text-sm font-bold px-3 py-1.5", getStatusColor(table.status))}>
                              T{table.number}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            {table.seats} seats
                          </div>
                          <div className="text-sm">
                            {tableOrders.length > 0 ? (
                              <p className="font-semibold text-primary">{tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}</p>
                            ) : (
                              <p className="text-muted-foreground">Available</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

        {selectedTable && (
          <div className="mt-6 space-y-6">
            {/* Mobile-first layout: Stack vertically on mobile, side-by-side on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Orders Section */}
              <Card className="order-2 lg:order-1">
                <CardHeader className="pb-4 px-4 sm:px-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg sm:text-xl">Table {selectedTable.number}</CardTitle>
                      <Badge className={cn("text-white text-sm px-3 py-1.5", getStatusColor(selectedTable.status))}>
                        {getStatusText(selectedTable.status)}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {selectedTable.zone} Section • {selectedTable.seats} Seats
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6 max-h-[55vh] sm:max-h-[65vh] overflow-y-auto">
                  {getTableOrders(selectedTable.id).length > 0 ? (
                    <>
                      {getTableOrders(selectedTable.id).map((order) => {
                        const items = getOrderItems(order.id)
                        return (
                          <Card key={order.id} className="border shadow-sm">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm sm:text-base font-semibold">Order #{order.id}</span>
                                <Badge
                                  variant={
                                    order.status === "pending"
                                      ? "destructive"
                                      : order.status === "served"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-sm px-3 py-1"
                                >
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {items.map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm sm:text-base py-2 border-b border-gray-100 last:border-0">
                                    <span className="flex-1">
                                      <span className="font-semibold text-primary">{item.quantity}x</span> {item.menu_items?.name}
                                      {item.notes && (
                                        <span className="text-muted-foreground block mt-1 text-sm">
                                          Note: {item.notes}
                                        </span>
                                      )}
                                    </span>
                                    <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {order.notes && (
                                <div className="mt-3 text-sm bg-muted p-3 rounded-lg">
                                  <span className="font-semibold">Order Notes:</span> {order.notes}
                                </div>
                              )}
                              <div className="mt-4 pt-3 border-t flex justify-between font-semibold text-base">
                                <span>Total</span>
                                <span>₹{order.total.toFixed(2)}</span>
                              </div>
                              {order.status === "pending" && (
                                <div className="mt-4">
                                  <Button
                                    variant="default"
                                    size="lg"
                                    className="w-full h-12 text-base bg-primary"
                                    onClick={() => updateOrderStatus(order.id, "served")}
                                  >
                                    <Check className="mr-2 h-5 w-5" /> Mark as Served
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}

                      {/* Send to Billing Button - shows when there are served orders and table is not bill-pending */}
                      {hasServedOrders(selectedTable.id) && selectedTable.status !== "bill-pending" && (
                        <Card className="border-2 border-dashed border-primary bg-primary/10 dark:bg-primary/5">
                          <CardContent className="pt-6 px-4 sm:px-6">
                            <div className="text-center">
                              <Button
                                variant="default"
                                size="lg"
                                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
                                onClick={() => sendToBilling(selectedTable.id)}
                              >
                                <Receipt className="mr-3 h-5 w-5" /> Send All Orders to Billing
                              </Button>
                              <p className="text-sm text-muted-foreground mt-3">
                                This will send all served orders to the billing system
                              </p>
                              <p className="text-sm font-semibold text-primary mt-2">
                                Total Bill: ₹{getTableOrders(selectedTable.id)
                                  .filter(order => order.status === "served")
                                  .reduce((sum, order) => sum + order.total, 0)
                                  .toFixed(2)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Show bill pending status */}
                      {selectedTable.status === "bill-pending" && (
                        <Card className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                          <CardContent className="pt-6 px-4 sm:px-6">
                            <div className="text-center">
                              <div className="text-amber-700 dark:text-amber-300 font-semibold text-base">
                                <Receipt className="inline mr-3 h-5 w-5" />
                                Bill Sent to Billing System
                              </div>
                              <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                                Orders have been sent for payment processing
                              </p>
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-2">
                                Total Amount: ₹{getTableOrders(selectedTable.id)
                                  .reduce((sum, order) => sum + order.total, 0)
                                  .toFixed(2)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-base">No orders for this table</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="order-1 lg:order-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">New Order</CardTitle>
                  <CardDescription className="text-sm">Add items to the order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue={menuCategories[0]?.name || "Starters"}>
                    <TabsList className="mb-4 w-full flex-wrap h-auto gap-1 p-1 bg-muted">
                      {menuCategories.map((category) => (
                        <TabsTrigger 
                          key={category.id} 
                          value={category.name}
                          className="text-sm px-3 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
                        >
                          {category.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {menuCategories.map((category) => (
                      <TabsContent key={category.id} value={category.name} className="mt-0">
                        <div className="grid grid-cols-1 gap-3 max-h-[45vh] sm:max-h-[55vh] overflow-y-auto">
                          {menuItems
                            .filter((item) => item.category_id === category.id)
                            .map((item) => (
                              <Button
                                key={item.id}
                                variant="outline"
                                className="justify-between h-auto py-4 px-4 text-left border-2 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all"
                                onClick={() => addItemToOrder(item)}
                              >
                                <div className="flex flex-col items-start gap-1.5">
                                  <span className="text-base font-semibold text-foreground">{item.name}</span>
                                  {item.description && (
                                    <span className="text-sm text-muted-foreground line-clamp-2">{item.description}</span>
                                  )}
                                </div>
                                <span className="text-base font-bold text-primary">₹{item.price.toFixed(2)}</span>
                              </Button>
                            ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <div className="mt-6">
                    <h3 className="font-semibold text-base mb-3">Current Order</h3>
                    {newOrder.length > 0 ? (
                      <div className="space-y-3">
                        {newOrder.map((item) => {
                          const menuItem = menuItems.find((mi) => mi.id === item.menu_item_id)
                          return (
                            <div
                              key={item.menu_item_id}
                              className="flex items-center justify-between border-2 rounded-lg p-3 bg-card border-border"
                            >
                              <div className="flex-1 mr-3">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-semibold text-base text-foreground">{menuItem?.name}</span>
                                  <span className="font-bold text-primary">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                                    >
                                      -
                                    </Button>
                                    <span className="min-w-[2rem] text-center font-semibold">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
                                    >
                                      +
                                    </Button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 px-3">
                                          <Edit className="h-3 w-3 mr-1" /> Notes
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Item Notes</DialogTitle>
                                          <DialogDescription>Add special instructions for this item</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                          <div className="grid gap-2">
                                            <Label htmlFor="item-notes">Notes</Label>
                                            <Textarea
                                              id="item-notes"
                                              placeholder="E.g., Extra spicy, No onions"
                                              value={item.notes}
                                              onChange={(e) => updateItemNotes(item.menu_item_id, e.target.value)}
                                              className="min-h-[80px]"
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button type="submit">Save Notes</Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeItemFromOrder(item.menu_item_id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        <div className="mt-4">
                          <Label htmlFor="order-notes" className="text-base font-medium">Order Notes</Label>
                          <Textarea
                            id="order-notes"
                            placeholder="Add notes for the entire order"
                            className="mt-2 min-h-[80px]"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                          />
                        </div>

                        <div className="mt-6 pt-4 border-t-2 flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span className="text-primary">
                            ₹{newOrder.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="text-base">No items added yet</p>
                        <p className="text-sm mt-1">Select items from the menu above</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button className="w-full h-12 text-base font-semibold" disabled={newOrder.length === 0} onClick={placeOrder}>
                    <Send className="mr-3 h-5 w-5" /> Place Order
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
    </div>
  )
}