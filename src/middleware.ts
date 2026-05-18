import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "TREASURER";
  const isChurchUser = role === "CHURCH_TREASURER" || role === "CHURCH_PASTOR" || role === "CHURCH_USER";

  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isChurchRoute = nextUrl.pathname.startsWith("/church");
  const isDashboard = nextUrl.pathname === "/dashboard";

  if (isApiRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (isLoggedIn) {
      if (isAdmin) return NextResponse.redirect(new URL("/admin", nextUrl));
      if (isChurchUser) return NextResponse.redirect(new URL("/church/dashboard", nextUrl));
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAdminRoute && !isAdmin) {
    if (isChurchUser) return NextResponse.redirect(new URL("/church/dashboard", nextUrl));
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isChurchRoute && !isChurchUser && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isDashboard) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin", nextUrl));
    if (isChurchUser) return NextResponse.redirect(new URL("/church/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
