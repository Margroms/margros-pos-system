import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  // AUTH SYSTEM COMMENTED OUT - DIRECT ACCESS TO ADMIN DASHBOARD
  redirect("/dashboard/admin")
  
  /*
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log("/dashboard resolver: session", { hasSession: !!session, sessionError })
  if (!session) redirect("/")
  const email = session.user.email || ""
  let { data, error: userFetchError } = await supabase
    .from("users")
    .select("role")
    .eq("email", email)
    .single()
  console.log("/dashboard resolver: user fetch", { email, userFetchError, got: data })
  if (!data && email) {
    const name = (session.user.user_metadata?.full_name as string) || email.split("@")[0]
    const { data: provisioned, error: provisionError } = await supabase
      .from("users")
      .upsert([{ id: session.user.id, email, name, role: "waiter" }], { onConflict: "email" })
      .select("role")
      .single()
    console.log("/dashboard resolver: provision user", { provisionError, provisioned })
    data = provisioned || null
  }

  const role = data?.role || (session.user.user_metadata?.role as string) || "waiter"
  console.log("/dashboard resolver: derived role", role)

  // Immediately send the user to their role's home. This prevents cross-navigation via this page.
  const roleHome: Record<string, string> = {
    admin: "/dashboard/admin",
    waiter: "/dashboard/waiter",
    kitchen: "/dashboard/kitchen",
    billing: "/dashboard/billing",
    inventory: "/dashboard/inventory",
  }
  redirect(roleHome[role] || "/dashboard/waiter")
  */
}

