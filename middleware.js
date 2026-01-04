import { NextResponse } from "next/server";

export async function middleware(request) {
  let user = request.cookies.get("user")?.value;
  if (user) user = JSON.parse(user);

  const path = request.nextUrl.pathname;
  if (!user || !user.token) {
    if (path != "/login")
      return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
