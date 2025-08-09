import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper for debugging auth environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// Database type definitions
export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
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
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          menu_item_id: number
          quantity: number
          price: number
          notes?: string
          created_at: string
        }
      }
      menu_items: {
        Row: {
          id: number
          name: string
          price: number
          category_id: number
          description: string
          image_url?: string
          is_available: boolean
          created_at: string
          updated_at: string
        }
      }
      menu_categories: {
        Row: {
          id: number
          name: string
          display_order: number
          created_at: string
          updated_at: string
        }
      }
      inventory_items: {
        Row: {
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
        }
      }
      inventory_categories: {
        Row: {
          id: number
          name: string
          created_at: string
          updated_at: string
        }
      }
      tables: {
        Row: {
          id: number
          number: number
          capacity: number
          status: "free" | "occupied" | "bill-pending" | "reserved"
          zone?: string
          seats?: number
          created_at: string
          updated_at: string
        }
      }
      payments: {
        Row: {
          id: number
          order_id: number
          amount: number
          payment_method: string
          transaction_id?: string
          status: "pending" | "completed" | "failed" | "refunded"
          processed_by?: string
          created_at: string
        }
      }
    }
  }
}

export type Table<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Order = Table<'orders'>;
export type OrderItem = Table<'order_items'>;
export type MenuItem = Table<'menu_items'>;
export type MenuCategory = Table<'menu_categories'>;
export type InventoryItem = Table<'inventory_items'>;
export type InventoryCategory = Table<'inventory_categories'>;
export type TableRow = Table<'tables'>;
export type Payment = Table<'payments'>;

// Extended types with relations for specific use cases
export type OrderItemWithMenuItem = OrderItem & {
  menu_items?: MenuItem;
};

export type PaymentWithOrder = Payment & {
  orders?: Order & {
    tables?: TableRow;
  };
};

export type InventoryItemWithCategory = InventoryItem & {
  inventory_categories?: InventoryCategory;
};

// Path: margros-pos-system/lib/supabase.ts
