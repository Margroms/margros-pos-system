
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (error || !user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { role } = user
  const { pathname } = req.nextUrl

  if (role === 'admin') {
    return res
  }

  if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/dashboard/billing') && role !== 'billing') {
	return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/dashboard/inventory') && role !== 'inventory') {
	return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/dashboard/kitchen') && role !== 'kitchen') {
	return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/dashboard/waiter') && role !== 'waiter') {
	return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: '/dashboard/:path*',
}
