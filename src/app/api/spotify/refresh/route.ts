import { NextRequest } from 'next/server';

// Refreshes a Spotify access token using the stored refresh token.
// Called by the client when the access token is about to expire.
export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  if (!refreshToken) {
    return Response.json({ error: 'Missing refreshToken' }, { status: 400 });
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Server config missing' }, { status: 500 });
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[Spotify refresh] failed:', res.status, text);
    return Response.json({ error: 'refresh_failed' }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({
    accessToken:  data.access_token,
    expiresIn:    data.expires_in,
    // Spotify may return a new refresh token; fall back to the existing one
    refreshToken: data.refresh_token || refreshToken,
  });
}
