import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name: string
  role: "waiter" | "admin" | "kitchen" | "billing" | "inventory"
  created_at: string
  updated_at: string
}

export interface Table {
  id: number
  number: number
  seats: number
  zone: "AC" | "Non-AC" | "Outdoor"
  status: "free" | "occupied" | "bill-pending"
  created_at: string
  updated_at: string
}

export interface MenuCategory {
  id: number
  name: string
  display_order: number
  created_at: string
}

export interface MenuItem {
  id: number
  name: string
  price: number
  category_id: number
  description?: string
  image_url?: string
  is_available: boolean
  created_at: string
  updated_at: string
  menu_categories?: MenuCategory
}

export interface Order {
  id: number
  table_id: number
  waiter_id?: string
  status: "pending" | "preparing" | "ready" | "served" | "paid"
  notes?: string
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method?: "cash" | "card" | "upi" | "qr"
  created_at: string
  updated_at: string
  tables?: Table
  users?: User
}

export interface OrderItem {
  id: number
  order_id: number
  menu_item_id: number
  quantity: number
  price: number
  notes?: string
  status: "pending" | "preparing" | "ready" | "served"
  created_at: string
  updated_at: string
  menu_items?: MenuItem
}

export interface InventoryCategory {
  id: number
  name: string
  created_at: string
}

export interface InventoryItem {
  id: number
  name: string
  category_id: number
  quantity: number
  unit: string
  restock_threshold: number
  price: number
  expiry_date?: string
  last_restocked?: string
  created_at: string
  updated_at: string
  inventory_categories?: InventoryCategory
}

export interface Payment {
  id: number
  order_id: number
  amount: number
  payment_method: string
  transaction_id?: string
  status: "pending" | "completed" | "failed" | "refunded"
  processed_by?: string
  created_at: string
}
