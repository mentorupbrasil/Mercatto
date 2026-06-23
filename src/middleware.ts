import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "mercatto_session";

const publicPaths = ["/login", "/register"];

const protectedPrefixes = [
  "/",
  "/produtos",
  "/estoque",
  "/compras",
  "/pdv",
  "/fluxo-de-caixa",
  "/contas-a-pagar",
  "/contas-a-receber",
  "/clientes",
  "/fidelidade",
  "/fornecedores",
  "/agenda",
  "/funcionarios",
  "/metas",
  "/relatorios",
  "/dre",
  "/auditoria",
  "/configuracoes",
];

function isPublicPath(pathname: string) {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isProtectedPath(pathname: string) {
  if (pathname === "/") return true;
  return protectedPrefixes.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (isPublicPath(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
