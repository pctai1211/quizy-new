import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { STUDENT_SESSION_COOKIE, verifyStudentSessionCookieValue } from "@/lib/student-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";
  const isStudentLoginRoute = pathname === "/student/login";
  // /quiz/[id] requires a logged-in student too — only students in the
  // students table may attempt a quiz (see app/quiz/[id]/page.tsx).
  const isStudentGatedRoute =
    (pathname.startsWith("/student") || pathname.startsWith("/quiz/")) && !isStudentLoginRoute;

  // Admin auth: Supabase Auth session + profiles.role, unchanged.
  if (isAdminRoute || isLoginRoute) {
    const { supabaseResponse, user, role } = await updateSession(request);

    if (isAdminRoute && !user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }

    if (isLoginRoute && user) {
      return NextResponse.redirect(new URL(role === "student" ? "/student/dashboard" : "/admin/dashboard", request.url));
    }

    return supabaseResponse;
  }

  // Student auth: passwordless, signed cookie set by studentLogin — no
  // Supabase Auth session involved (see lib/student-session.ts).
  if (isStudentGatedRoute || isStudentLoginRoute) {
    const studentId = await verifyStudentSessionCookieValue(
      request.cookies.get(STUDENT_SESSION_COOKIE)?.value
    );

    if (isStudentGatedRoute && !studentId) {
      const redirectUrl = new URL("/student/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isStudentLoginRoute && studentId) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login", "/quiz/:path*"],
};
