"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Order, type Payment } from "@/lib/supabase"
import { ArrowDown, ArrowUp, CreditCard, DollarSign, ShoppingBag, Users } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function AdminDashboard() {
  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [menuCategories, setMenuCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageBill: 0,
  })
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([])
  const [topSellingItems, setTopSellingItems] = useState<any[]>([])
  const [weeklyRevenueData, setWeeklyRevenueData] = useState<any[]>([])
  const [yearlyRevenueData, setYearlyRevenueData] = useState<any[]>([])

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([
      fetchOrders(), 
      fetchPayments(), 
      fetchOrderItems(), 
      fetchMenuItems(), 
      fetchMenuCategories()
    ])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables (*),
        order_items (
          *,
          menu_items (*)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching orders:", error)
    } else {
      setOrders(data || [])
      calculateStats(data || [])
      generateRevenueData(data || [])
    }
  }

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        orders (
          *,
          tables (*)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
    } else {
      setPayments(data || [])
    }
  }

  const fetchOrderItems = async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        *,
        menu_items (*),
        orders (*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching order items:", error)
    } else {
      setOrderItems(data || [])
      generateTopSellingItems(data || [])
    }
  }

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_categories (*)
      `)

    if (error) {
      console.error("Error fetching menu items:", error)
    } else {
      setMenuItems(data || [])
    }
  }

  const fetchMenuCategories = async () => {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .order("display_order")

    if (error) {
      console.error("Error fetching menu categories:", error)
    } else {
      setMenuCategories(data || [])
      // Generate category data after fetching categories
      if (data && data.length > 0) {
        await generateCategoryData(data)
      }
    }
  }

  const calculateStats = (ordersData: Order[]) => {
    const paidOrders = ordersData.filter((order) => order.status === "paid")
    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0)
    const totalOrders = ordersData.length
    const totalCustomers = new Set(ordersData.map((order) => order.table_id)).size
    const averageBill = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

    setStats({
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageBill,
    })
  }

  const generateRevenueData = (ordersData: Order[]) => {
    const paidOrders = ordersData.filter((order) => order.status === "paid")
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    const dailyRevenue = last7Days.map(date => {
      const dayOrders = paidOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate.toDateString() === date.toDateString()
      })
      const revenue = dayOrders.reduce((sum, order) => sum + Number(order.total), 0)
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: revenue
      }
    })

    setRevenueData(dailyRevenue)

    // Generate weekly data
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (3 - i) * 7 - 6)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - (3 - i) * 7)
      return { startDate, endDate, name: `Week ${i + 1}` }
    })

    const weeklyRevenue = last4Weeks.map(week => {
      const weekOrders = paidOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= week.startDate && orderDate <= week.endDate
      })
      const revenue = weekOrders.reduce((sum, order) => sum + Number(order.total), 0)
      return {
        name: week.name,
        revenue: revenue
      }
    })

    setWeeklyRevenueData(weeklyRevenue)

    // Generate monthly data
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (11 - i))
      return date
    })

    const monthlyRevenue = last12Months.map(date => {
      const monthOrders = paidOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate.getMonth() === date.getMonth() && 
               orderDate.getFullYear() === date.getFullYear()
      })
      const revenue = monthOrders.reduce((sum, order) => sum + Number(order.total), 0)
      return {
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: revenue
      }
    })

    setMonthlyRevenueData(monthlyRevenue)

    // Generate yearly data
    const last5Years = Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - (4 - i)
      return year
    })

    const yearlyRevenue = last5Years.map(year => {
      const yearOrders = paidOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate.getFullYear() === year
      })
      const revenue = yearOrders.reduce((sum, order) => sum + Number(order.total), 0)
      return {
        name: year.toString(),
        revenue: revenue
      }
    })

    setYearlyRevenueData(yearlyRevenue)
  }

  const generateCategoryData = async (categoriesData: any[]) => {
    if (categoriesData.length === 0) return

    try {
      const { data: orderItemsWithCategories, error } = await supabase
        .from("order_items")
        .select(`
          *,
          menu_items!inner (
            *,
            menu_categories!inner (*)
          ),
          orders!inner (*)
        `)
        .eq("orders.status", "paid")

      if (error) {
        console.error("Error fetching category data:", error)
        return
      }

      const categoryRevenue = categoriesData.map(category => {
        const categoryItems = orderItemsWithCategories?.filter(
          item => item.menu_items?.menu_categories?.id === category.id
        ) || []
        
        const revenue = categoryItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)
        
        return {
          name: category.name,
          value: revenue,
          fill: getRandomColor(category.id)
        }
      }).filter(item => item.value > 0)

      setCategoryData(categoryRevenue)
    } catch (error) {
      console.error("Error generating category data:", error)
    }
  }

  const generateTopSellingItems = (orderItemsData: any[]) => {
    const paidOrderItems = orderItemsData.filter(item => 
      item.orders?.status === "paid"
    )

    const itemQuantities = paidOrderItems.reduce((acc, item) => {
      const itemName = item.menu_items?.name || 'Unknown Item'
      acc[itemName] = (acc[itemName] || 0) + Number(item.quantity)
      return acc
    }, {} as Record<string, number>)

    const topItems = Object.entries(itemQuantities)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([name, quantity]) => ({
        name,
        quantity
      }))

    setTopSellingItems(topItems)
  }

  const getRandomColor = (seed: number) => {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"]
    return colors[seed % colors.length]
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of restaurant performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-muted-foreground">
                  Based on paid orders
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-muted-foreground">
                  All order statuses
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tables Served</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-muted-foreground">
                  Unique tables served
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.averageBill.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-muted-foreground">
                  Per paid order
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export
              </Button>
              <Button variant="outline" size="sm">
                Print
              </Button>
            </div>
          </div>

          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the current week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No revenue data available</p>
                        <p className="text-xs">Complete some paid orders to see revenue charts</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the last 4 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the current year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Yearly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the last 5 years</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Revenue by menu category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No category data available</p>
                      <p className="text-xs">Add menu categories and complete orders to see category performance</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Most popular menu items by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {topSellingItems.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topSellingItems}
                      margin={{ top: 20, right: 20, bottom: 20, left: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantity" name="Quantity Sold" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No sales data available</p>
                      <p className="text-xs">Complete some paid orders to see top selling items</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
