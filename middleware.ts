import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isStudentRoute = pathname.startsWith("/student"); // bỏ /quiz/ ra khỏi đây
  const isQuizRoute = pathname.startsWith("/quiz/");
  const isResultRoute = pathname.startsWith("/result");

  const isLoginRoute = pathname === "/login";
  const isStudentLoginRoute = pathname === "/student/login";

  const { supabaseResponse, user, role } = await updateSession(request);

  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }

    return supabaseResponse;
  }

  if (isStudentRoute) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (role !== "student") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return supabaseResponse;
  }

  /*
   * ----------------------------------------------------------
   * /quiz/*
   * Cho phép cả student và admin (admin preview quiz)
   * ----------------------------------------------------------
   */
  if (isQuizRoute) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (role !== "student" && role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return supabaseResponse;
  }

  if (isResultRoute) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (role !== "student" && role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return supabaseResponse;
  }

  if (isLoginRoute) {
    if (user && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (user && role === "student") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }

    return supabaseResponse;
  }

  if (isStudentLoginRoute) {
    if (user && role === "student") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }

    if (user && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/login",
    "/quiz/:path*",
    "/result/:path*",
  ],
};