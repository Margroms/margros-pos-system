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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase, type TableRow, type OrderItemWithMenuItem, type MenuItem, type Order, type PaymentWithOrder } from "@/lib/supabase"
import { CreditCard, Download, Printer, Receipt, Wallet, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"

import { getBillingInsights, getQuickInsights } from "@/models/BillingAgent";
import MarkdownRenderer from "@/components/markdown-renderer"

// Define types matching database constraints
// Remove local type definitions since we're importing them from supabase.ts

type TableBill = {
  table: TableRow
  orders: Order[]
  totalAmount: number
  pendingPayment: PaymentWithOrder
}

type PaymentMethod = "cash" | "card" | "upi" | "qr"

type InventoryItem = {
  id: number
  name: string
  quantity: number
  unit: string
}

type MenuItemIngredient = {
  id: number
  menu_item_id: number
  inventory_item_id: number
  quantity_required: number
  inventory_items?: InventoryItem
}

export default function BillingDashboard() {
  const { toast } = useToast()

  // State
  const [tableBills, setTableBills] = useState<TableBill[]>([])
  const [orderItems, setOrderItems] = useState<OrderItemWithMenuItem[]>([])
  const [completedPayments, setCompletedPayments] = useState<PaymentWithOrder[]>([])
  const [selectedTableBill, setSelectedTableBill] = useState<TableBill | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0)
  const [transactionId, setTransactionId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [inventoryWarnings, setInventoryWarnings] = useState<string[]>([])
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const tablesSubscription = supabase
      .channel("billing-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        fetchTableBills()
      })
      .subscribe()

    const paymentsSubscription = supabase
      .channel("billing-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        fetchTableBills()
        fetchCompletedPayments()
      })
      .subscribe()

    const ordersSubscription = supabase
      .channel("billing-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchTableBills()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(tablesSubscription)
      supabase.removeChannel(paymentsSubscription)
      supabase.removeChannel(ordersSubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchTableBills(), fetchOrderItems(), fetchCompletedPayments()])
    setLoading(false)
  }

  const fetchTableBills = async () => {
    try {
      // Get tables with bill-pending status
      const { data: tables, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("status", "bill-pending")

      if (tablesError) throw tablesError

      if (!tables || tables.length === 0) {
        setTableBills([])
        return
      }

      // Get orders for these tables
      const tableIds = tables.map(table => table.id)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .in("table_id", tableIds)
        .eq("status", "served")

      if (ordersError) throw ordersError

      // Get pending payments for these orders
      const orderIds = orders?.map(order => order.id) || []
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .in("order_id", orderIds)
        .eq("status", "pending")

      if (paymentsError) throw paymentsError

      // Group data by table
      const tableBillsData: TableBill[] = tables.map(table => {
        const tableOrders = orders?.filter(order => order.table_id === table.id) || []
        const totalAmount = tableOrders.reduce((sum, order) => sum + order.total, 0)
        const pendingPayment = payments?.find(payment => 
          tableOrders.some(order => order.id === payment.order_id)
        )

        return {
          table,
          orders: tableOrders,
          totalAmount,
          pendingPayment: pendingPayment!
        }
      }).filter(bill => bill.pendingPayment) // Only include tables with pending payments

      setTableBills(tableBillsData)
    } catch (error) {
      console.error("Error fetching table bills:", error)
      toast({
        title: "Error",
        description: "Failed to fetch pending bills",
        variant: "destructive",
      })
    }
  }

  const fetchOrderItems = async () => {
    const { data, error } = await supabase.from("order_items").select(`
        *,
        menu_items (*)
      `)

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

  const fetchCompletedPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        orders (
          *,
          tables (*)
        )
      `)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      })
    } else {
      setCompletedPayments(data || [])
    }
  }

  // Get order items for a specific order
  const getOrderItems = (orderId: number) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  // Handle table bill selection and check inventory
  const handleTableBillSelect = async (tableBill: TableBill) => {
    setSelectedTableBill(tableBill)
    setAdditionalDiscount(0)
    setPaymentMethod("cash")
    setTransactionId("")
    
    // Check inventory availability
    await checkInventoryAvailability(tableBill)
  }

  // Check if enough inventory is available for all items
  const checkInventoryAvailability = async (tableBill: TableBill) => {
    try {
      const warnings: string[] = []
      
      // Get all order items for this table
      const allOrderItems = tableBill.orders.flatMap(order => getOrderItems(order.id))
      
      // Group by menu item to calculate total quantities needed
      const menuItemQuantities = allOrderItems.reduce((acc, item) => {
        acc[item.menu_item_id] = (acc[item.menu_item_id] || 0) + item.quantity
        return acc
      }, {} as Record<number, number>)

      // For each menu item, check ingredient availability
      for (const [menuItemId, totalQuantity] of Object.entries(menuItemQuantities)) {
        const { data: ingredients, error } = await supabase
          .from("menu_item_ingredients")
          .select(`
            *,
            inventory_items (id, name, quantity, unit)
          `)
          .eq("menu_item_id", parseInt(menuItemId))

        if (error) {
          console.error("Error fetching ingredients:", error)
          continue
        }

        // Check each ingredient
        for (const ingredient of ingredients || []) {
          const requiredQuantity = ingredient.quantity_required * Number(totalQuantity)
          const availableQuantity = ingredient.inventory_items?.quantity || 0

          if (requiredQuantity > availableQuantity) {
            warnings.push(
              `Insufficient ${ingredient.inventory_items?.name}: need ${requiredQuantity}${ingredient.inventory_items?.unit}, have ${availableQuantity}${ingredient.inventory_items?.unit}`
            )
          }
        }
      }

      setInventoryWarnings(warnings)
    } catch (error) {
      console.error("Error checking inventory:", error)
      setInventoryWarnings([])
    }
  }

  // Calculate final total with additional discount
  const calculateFinalTotal = (originalAmount: number) => {
    const discountAmount = (originalAmount * additionalDiscount) / 100
    return originalAmount - discountAmount
  }

  // Process inventory deductions
  const processInventoryDeductions = async (tableBill: TableBill) => {
    try {
      // Get all order items for this table
      const allOrderItems = tableBill.orders.flatMap(order => getOrderItems(order.id))
      
      // Group by menu item to calculate total quantities needed
      const menuItemQuantities = allOrderItems.reduce((acc, item) => {
        acc[item.menu_item_id] = (acc[item.menu_item_id] || 0) + item.quantity
        return acc
      }, {} as Record<number, number>)

      const inventoryUpdates: Array<{
        inventoryItemId: number
        quantityUsed: number
        itemName: string
      }> = []

      // Calculate total ingredient usage
      for (const [menuItemId, totalQuantity] of Object.entries(menuItemQuantities)) {
        const { data: ingredients, error } = await supabase
          .from("menu_item_ingredients")
          .select(`
            *,
            inventory_items (id, name, quantity, unit)
          `)
          .eq("menu_item_id", parseInt(menuItemId))

        if (error) throw error

        for (const ingredient of ingredients || []) {
          const quantityUsed = ingredient.quantity_required * Number(totalQuantity)
          const existingUpdate = inventoryUpdates.find(u => u.inventoryItemId === ingredient.inventory_item_id)
          
          if (existingUpdate) {
            existingUpdate.quantityUsed += quantityUsed
          } else {
            inventoryUpdates.push({
              inventoryItemId: ingredient.inventory_item_id,
              quantityUsed,
              itemName: ingredient.inventory_items?.name || 'Unknown'
            })
          }
        }
      }

      // Process each inventory update
      for (const update of inventoryUpdates) {
        // Get current inventory quantity
        const { data: currentItem, error: fetchError } = await supabase
          .from("inventory_items")
          .select("quantity")
          .eq("id", update.inventoryItemId)
          .single()

        if (fetchError) throw fetchError

        const newQuantity = currentItem.quantity - update.quantityUsed

        // Update inventory quantity
        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ quantity: Math.max(0, newQuantity) }) // Prevent negative quantities
          .eq("id", update.inventoryItemId)

        if (updateError) throw updateError

        // Create inventory transaction record
        const { error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert({
            inventory_item_id: update.inventoryItemId,
            transaction_type: "usage",
            quantity: update.quantityUsed,
            notes: `Used for Table ${tableBill.table.number} payment - ${update.quantityUsed} units consumed`,
            // user_id: currentUser?.id // Add if you have user context
          })

        if (transactionError) throw transactionError
      }

      return inventoryUpdates
    } catch (error) {
      console.error("Error processing inventory deductions:", error)
      throw error
    }
  }

  // Process payment with inventory deduction
  const processPayment = async () => {
    if (!selectedTableBill) return

    // Check for inventory warnings
    if (inventoryWarnings.length > 0) {
      const proceed = window.confirm(
        `Warning: Inventory issues detected:\n\n${inventoryWarnings.join('\n')}\n\nDo you want to proceed anyway?`
      )
      if (!proceed) return
    }

    try {
      const finalAmount = calculateFinalTotal(selectedTableBill.totalAmount)

      // Process inventory deductions first
      const inventoryUpdates = await processInventoryDeductions(selectedTableBill)

      // Update payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          amount: finalAmount,
          payment_method: paymentMethod,
          status: "completed",
          transaction_id: transactionId || null,
          // processed_by: currentUser?.id // Add if you have user context
        })
        .eq("id", selectedTableBill.pendingPayment.id)

      if (paymentError) throw paymentError

      // Update all orders to paid status with discount if applied
      if (additionalDiscount > 0) {
        const orderUpdates = selectedTableBill.orders.map(order => ({
          id: order.id,
          status: "paid" as const,
          discount: additionalDiscount,
          total: order.total - (order.total * additionalDiscount) / 100
        }))

        for (const update of orderUpdates) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({
              status: update.status,
              discount: update.discount,
              total: update.total,
              payment_method: paymentMethod
            })
            .eq("id", update.id)

          if (orderError) throw orderError
        }
      } else {
        // No additional discount, just update status and payment method
        const orderIds = selectedTableBill.orders.map(order => order.id)
        const { error: ordersError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_method: paymentMethod
          })
          .in("id", orderIds)

        if (ordersError) throw ordersError
      }

      // Update table status to free
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "free" })
        .eq("id", selectedTableBill.table.id)

      if (tableError) throw tableError

      // Show success message with inventory details
      const inventoryMessage = inventoryUpdates.length > 0 
        ? `\n\nInventory Updated:\n${inventoryUpdates.map(u => `• ${u.itemName}: -${u.quantityUsed}`).join('\n')}`
        : ""

      toast({
        title: "Payment Processed Successfully",
        description: `Payment for Table ${selectedTableBill.table.number} (₹${finalAmount.toFixed(2)})${inventoryMessage}`,
        duration: 6000,
      })

      // Reset selected table bill
      setSelectedTableBill(null)
      setInventoryWarnings([])
      fetchData()
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Print bill
  const printBill = () => {
    if (!selectedTableBill) return

    toast({
      title: "Printing Bill",
      description: `Bill for Table ${selectedTableBill.table.number} has been sent to the printer`,
    })
  }

  // Download bill
  const downloadBill = () => {
    if (!selectedTableBill) return

    toast({
      title: "Downloading Bill",
      description: `Bill for Table ${selectedTableBill.table.number} has been downloaded`,
    })
  }

  const handleGetAiInsights = async () => {
    setLoadingInsights(true);
    try {
      // Fetch comprehensive data for analysis
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get all payments from last 7 days for comprehensive analysis
      const { data: recentPayments, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          orders (
            *,
            tables (*),
            order_items (
              *,
              menu_items (*)
            )
          )
        `)
        .eq("status", "completed")
        .gte("created_at", last7Days.toISOString())
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get menu items with sales data
      const { data: allOrderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          menu_items (*),
          orders!inner (
            status,
            created_at,
            payments!inner (
              status,
              created_at
            )
          )
        `)
        .gte("orders.created_at", last7Days.toISOString())
        .eq("orders.payments.status", "completed");

      if (orderItemsError) throw orderItemsError;

      // Calculate metrics
      const totalRevenue = recentPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const totalOrders = recentPayments?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Payment method breakdown
      const paymentMethodBreakdown = recentPayments?.reduce((acc, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
        return acc;
      }, {} as Record<string, number>) || {};

      // Top selling items
      const itemSales = allOrderItems?.reduce((acc, item) => {
        const itemName = item.menu_items?.name || 'Unknown Item';
        if (!acc[itemName]) {
          acc[itemName] = { quantity: 0, revenue: 0 };
        }
        acc[itemName].quantity += item.quantity;
        acc[itemName].revenue += item.price * item.quantity;
        return acc;
      }, {} as Record<string, {quantity: number, revenue: number}>) || {};

      const topSellingItems = Object.entries(itemSales)
        .map(([name, data]) => ({ 
          name, 
          quantity: (data as {quantity: number, revenue: number}).quantity, 
          revenue: (data as {quantity: number, revenue: number}).revenue 
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Hourly trends
      const hourlyData = recentPayments?.reduce((acc, payment) => {
        const hour = new Date(payment.created_at).getHours();
        if (!acc[hour]) {
          acc[hour] = { orders: 0, revenue: 0 };
        }
        acc[hour].orders += 1;
        acc[hour].revenue += payment.amount;
        return acc;
      }, {} as Record<number, {orders: number, revenue: number}>) || {};

      const hourlyTrends = Object.entries(hourlyData)
        .map(([hour, data]) => ({ 
          hour: parseInt(hour), 
          orders: (data as {orders: number, revenue: number}).orders, 
          revenue: (data as {orders: number, revenue: number}).revenue 
        }))
        .sort((a, b) => a.hour - b.hour);

      const comprehensiveData = {
        completedPayments: recentPayments || [],
        orderItems: allOrderItems || [],
        tableBills,
        timeRange: "Last 7 days",
        totalRevenue,
        totalOrders,
        averageOrderValue,
        paymentMethodBreakdown,
        topSellingItems,
        hourlyTrends
      };

      const insights = await getBillingInsights(comprehensiveData);
      setAiInsights(insights || "No insights available.");
      setShowAiInsights(true);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Fallback to quick insights with available data
      const quickInsights = await getQuickInsights(completedPayments);
      setAiInsights(quickInsights || "Unable to generate insights at this time.");
      setShowAiInsights(true);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading billing data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground">Process table payments and manage bills</p>
        </div>
        <Button onClick={handleGetAiInsights} disabled={loadingInsights} className="mb-4">
          {loadingInsights ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing Data...
            </>
          ) : (
            'Get AI Insights'
          )}
        </Button>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending Payments</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 h-fit lg:sticky lg:top-20">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Bills</CardTitle>
                    <CardDescription>Tables waiting for payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tableBills.map((tableBill) => (
                        <div
                          key={tableBill.table.id}
                          className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-md ${
                            selectedTableBill?.table.id === tableBill.table.id
                              ? "ring-2 ring-primary bg-muted/50"
                              : "bg-background"
                          }`}
                          onClick={() => handleTableBillSelect(tableBill)}
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">Table {tableBill.table.number}</h3>
                            <Badge variant="destructive">Bill Pending</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {tableBill.orders.length} order(s)
                          </div>
                          <div className="text-lg font-bold mt-1">₹{tableBill.totalAmount.toFixed(2)}</div>
                        </div>
                      ))}

                      {tableBills.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No pending bills</p>
                          <p className="text-xs">All tables are clear</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                {selectedTableBill ? (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <CardTitle>Bill for Table {selectedTableBill.table.number}</CardTitle>
                        <Badge variant="destructive">Payment Pending</Badge>
                      </div>
                      <CardDescription>
                        {selectedTableBill.table.zone} Section • {selectedTableBill.table.seats} Seats •{" "}
                        {selectedTableBill.orders.length} order(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Inventory Warnings */}
                        {inventoryWarnings.length > 0 && (
                          <div className="border border-amber-300 rounded-md p-3 bg-amber-50">
                            <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                              <AlertTriangle className="h-4 w-4" />
                              Inventory Warnings
                            </div>
                            <ul className="text-sm text-amber-700 space-y-1">
                              {inventoryWarnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="border rounded-md overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Item</th>
                                <th className="text-center p-2">Qty</th>
                                <th className="text-right p-2">Price</th>
                                <th className="text-right p-2 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTableBill.orders.map((order) => (
                                getOrderItems(order.id).map((item) => (
                                  <tr key={item.id} className="border-b last:border-0">
                                    <td className="p-2 whitespace-nowrap">
                                      {item.menu_items?.name}
                                      {item.notes && (
                                        <div className="text-xs text-muted-foreground">{item.notes}</div>
                                      )}
                                    </td>
                                    <td className="text-center p-2 whitespace-nowrap">{item.quantity}</td>
                                    <td className="text-right p-2 whitespace-nowrap">₹{item.price.toFixed(2)}</td>
                                    <td className="text-right p-2 whitespace-nowrap">₹{(item.price * item.quantity).toFixed(2)}</td>
                                  </tr>
                                ))
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>₹{selectedTableBill.orders.reduce((sum, order) => sum + order.subtotal, 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Additional Discount</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={additionalDiscount}
                                onChange={(e) => setAdditionalDiscount(Number(e.target.value))}
                                className="w-20 h-8"
                                min="0"
                                max="100"
                              />
                              <span>%</span>
                            </div>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Final Total</span>
                            <span>₹{calculateFinalTotal(selectedTableBill.totalAmount).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="pt-4">
                          <Label className="mb-2 block">Payment Method</Label>
                          <RadioGroup
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                            className="grid grid-cols-2 sm:grid-cols-2 gap-2"
                          >
                            <div className="flex items-center space-x-2 border rounded-md p-3 data-[state=checked]:border-primary">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer w-full">
                                <Wallet className="h-4 w-4" /> Cash
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-3 data-[state=checked]:border-primary">
                              <RadioGroupItem value="card" id="card" />
                              <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer w-full">
                                <CreditCard className="h-4 w-4" /> Card
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-3 data-[state=checked]:border-primary">
                              <RadioGroupItem value="upi" id="upi" />
                              <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer w-full">
                                <Receipt className="h-4 w-4" /> UPI
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-3 data-[state=checked]:border-primary">
                              <RadioGroupItem value="qr" id="qr" />
                              <Label htmlFor="qr" className="flex items-center gap-2 cursor-pointer w-full">
                                <Receipt className="h-4 w-4" /> QR Scan
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {(paymentMethod === "card" || paymentMethod === "upi") && (
                          <div className="pt-2">
                            <Label htmlFor="transaction-id" className="mb-2 block">Transaction ID (Optional)</Label>
                            <Input
                              id="transaction-id"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="Enter transaction ID for reference"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="w-full sm:flex-1" onClick={printBill}>
                        <Printer className="mr-2 h-4 w-4" /> Print Bill
                      </Button>
                      <Button variant="outline" className="w-full sm:flex-1" onClick={downloadBill}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full sm:flex-1"
                            variant={inventoryWarnings.length > 0 ? "destructive" : "default"}
                          >
                            {inventoryWarnings.length > 0 ? (
                              <>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Process Payment
                              </>
                            ) : (
                              "Process Payment"
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Confirm Payment</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to process payment for Table {selectedTableBill.table.number}?
                              {inventoryWarnings.length > 0 && " This will proceed despite inventory warnings and deduct ingredients from inventory."}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-2">
                            <div className="flex justify-between font-medium">
                              <span>Original Amount:</span>
                              <span>₹{selectedTableBill.totalAmount.toFixed(2)}</span>
                            </div>
                            {additionalDiscount > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>Discount ({additionalDiscount}%):</span>
                                <span>-₹{(selectedTableBill.totalAmount * additionalDiscount / 100).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                              <span>Final Amount:</span>
                              <span>₹{calculateFinalTotal(selectedTableBill.totalAmount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Payment Method:</span>
                              <span className="capitalize">{paymentMethod}</span>
                            </div>
                            {inventoryWarnings.length > 0 && (
                              <div className="text-sm text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                                <strong>Warning:</strong> Inventory will be deducted despite low stock warnings.
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="w-full sm:w-auto">
                              Cancel
                            </Button>
                            <Button onClick={processPayment} className="w-full sm:w-auto">
                              Confirm Payment & Deduct Inventory
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
                      <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Table Selected</h3>
                      <p className="text-muted-foreground">Select a table from the list to process payment</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent completed payments</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Desktop Table View */}
                <div className="hidden md:block border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Payment ID</th>
                        <th className="text-left p-3">Table</th>
                        <th className="text-left p-3">Date & Time</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Payment Method</th>
                        <th className="text-left p-3">Transaction ID</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedPayments.map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-3">PAY-{payment.id}</td>
                          <td className="p-3">Table {payment.orders?.tables?.number || 'N/A'}</td>
                          <td className="p-3">{new Date(payment.created_at).toLocaleString()}</td>
                          <td className="p-3">₹{payment.amount.toFixed(2)}</td>
                          <td className="p-3 capitalize">{payment.payment_method}</td>
                          <td className="p-3">{payment.transaction_id || '-'}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {completedPayments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            No payment history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {completedPayments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">PAY-{payment.id}</CardTitle>
                            <CardDescription>
                              Table {payment.orders?.tables?.number || 'N/A'}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Date & Time</span>
                          <span className="text-sm font-medium">
                            {new Date(payment.created_at).toLocaleDateString()} at{' '}
                            {new Date(payment.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="text-lg font-bold text-green-600">
                            ₹{payment.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Payment Method</span>
                          <Badge variant="outline" className="capitalize">
                            {payment.payment_method}
                          </Badge>
                        </div>
                        {payment.transaction_id && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Transaction ID</span>
                            <span className="text-sm font-mono text-right">
                              {payment.transaction_id}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {completedPayments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No payment history found</p>
                      <p className="text-sm">Completed payments will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {showAiInsights && (
        <Dialog open={showAiInsights} onOpenChange={setShowAiInsights}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🤖 AI Billing Insights
              </DialogTitle>
              <DialogDescription>
                Comprehensive analysis of your restaurant's sales performance and customer behavior
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] pr-2">
              <div className="space-y-4">
                {aiInsights ? <MarkdownRenderer content={aiInsights} /> : (
                  <div className="text-center py-8 text-muted-foreground">No insights available at this time.</div>
                )}
              </div>
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setShowAiInsights(false)}>Close Analysis</Button>
              <Button onClick={handleGetAiInsights} disabled={loadingInsights}>
                {loadingInsights ? 'Refreshing…' : 'Refresh Insights'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}