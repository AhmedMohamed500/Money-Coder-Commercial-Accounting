import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (process.env.DEMO_ONLY_DEPLOYMENT === "1") {
    if (pathname === "/") return NextResponse.redirect(new URL("/demo", request.url));
    if (pathname === "/demo" || pathname.startsWith("/demo/")) return NextResponse.next();
    return new NextResponse("This deployment contains the isolated Money Coder demo only.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const protectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/company") || pathname.startsWith("/office");
  if (protectedRoute && !request.cookies.has("money_coder_session")) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"] };
