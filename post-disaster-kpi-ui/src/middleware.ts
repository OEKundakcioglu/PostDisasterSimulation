import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { nextUrl } = request;

  if (nextUrl.pathname === "/" || nextUrl.pathname === "/home") {
    return NextResponse.redirect(new URL("/home/InputParameters", request.url));
  }

  return NextResponse.next();
}
