import { NextResponse, type NextRequest } from 'next/server';

// Supabase stores the session in a cookie named sb-[project-ref]-auth-token
// Extract the project ref from the URL so we don't hardcode it
function getAuthCookieName(supabaseUrl: string): string {
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return '';
  }
}

function hasValidSession(request: NextRequest, supabaseUrl: string): boolean {
  const cookieName = getAuthCookieName(supabaseUrl);
  if (!cookieName) return false;

  // Supabase may chunk large tokens across multiple cookies (.0, .1, etc.)
  const direct = request.cookies.get(cookieName)?.value;
  const chunked = request.cookies.get(`${cookieName}.0`)?.value;
  const token = direct || chunked;

  if (!token) return false;

  try {
    // Token is a JSON string with access_token inside
    const parsed = JSON.parse(decodeURIComponent(token));
    return !!(parsed?.access_token || parsed?.[0]?.access_token);
  } catch {
    // If it's not JSON it might be a raw JWT — presence alone is enough
    return token.length > 20;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/bible') && !pathname.startsWith('/bible/auth');
  const isAuthPage = pathname.startsWith('/bible/auth');

  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return NextResponse.next({ request });

  const signedIn = hasValidSession(request, supabaseUrl);

  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/bible/auth';
    return NextResponse.redirect(url);
  }

  if (isAuthPage && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/bible';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/bible/:path*'],
};
