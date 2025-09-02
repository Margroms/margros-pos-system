import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // AUTH SYSTEM COMMENTED OUT - ALLOWING ALL ACCESS
  return NextResponse.next()
  
  /*
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Require auth for dashboard routes
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log("[middleware] session", { hasSession: !!session, sessionError })
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Determine role using email (your public.users uses independent ids)
  const email = session.user.email || ""
  let role = ""
  let { data: userRow, error: userFetchError } = await supabase
    .from("users")
    .select("role")
    .eq("email", email)
    .single()
  console.log("[middleware] userRow", { email, userFetchError, got: userRow })
  // Auto-provision a row if missing, defaulting to waiter (can be changed later by admin)
  if (!userRow && email) {
    const name = (session.user.user_metadata?.full_name as string) || email.split("@")[0]
    const { data: provisioned, error: provisionError } = await supabase
      .from("users")
      .upsert(
        [{ id: session.user.id, email, name, role: "waiter" }],
        { onConflict: "email" }
      )
      .select("role")
      .single()
    console.log("[middleware] provisioned", { provisionError, provisioned })
    userRow = provisioned || undefined
  }
  role = userRow?.role || (session.user.user_metadata?.role as string) || ""
  console.log("[middleware] derived role", role, "pathname", request.nextUrl.pathname)

  const pathname = request.nextUrl.pathname

  // Dashboard root → redirect to role home
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    const roleHome: Record<string, string> = {
      admin: "/dashboard/admin",
      waiter: "/dashboard/waiter",
      kitchen: "/dashboard/kitchen",
      billing: "/dashboard/billing",
      inventory: "/dashboard/inventory",
    }
    const target = roleHome[role] || "/dashboard/waiter"
    return NextResponse.redirect(new URL(target, request.url))
  }

  // Access control per section
  const accessMatrix: Array<{ prefix: string; allowed: string[] }> = [
    { prefix: "/dashboard/admin", allowed: ["admin"] },
    { prefix: "/dashboard/waiter", allowed: ["admin", "waiter"] },
    { prefix: "/dashboard/kitchen", allowed: ["admin", "kitchen"] },
    { prefix: "/dashboard/billing", allowed: ["admin", "billing"] },
    { prefix: "/dashboard/inventory", allowed: ["admin", "inventory"] },
  ]

  for (const { prefix, allowed } of accessMatrix) {
    if (pathname.startsWith(prefix)) {
      if (!allowed.includes(role)) {
        // Not permitted → send to their home
        const home = role === "admin" ? "/dashboard/admin" : `/dashboard/${role}`
        return NextResponse.redirect(new URL(home, request.url))
      }
      break
    }
  }

  return response
  */
}

export const config = {
  matcher: "/dashboard/:path*",
}


