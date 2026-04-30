import { NextResponse, type NextRequest } from 'next/server';

// Auth is handled at the component level — no server-side redirects needed.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/bible/:path*'],
};
