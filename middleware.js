import { NextResponse } from "next/server";

export async function middleware(request) {
  let user = null;
  const userCookie = request.cookies.get("user")?.value;
  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("user");
      return response;
    }
  }

  const path = request.nextUrl.pathname;
  if (!user || !user.token) {
    if (path !== "/login")
      return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
