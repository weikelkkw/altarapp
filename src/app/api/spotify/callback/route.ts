import { NextRequest } from 'next/server';

// Handles the Spotify OAuth callback.
// Exchanges the authorization code for access + refresh tokens,
// then redirects the user back to the app with tokens in the URL fragment
// (so they stay client-side and never appear in server logs).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') || '/bible';
  const returnTo = decodeURIComponent(state);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  if (error || !code) {
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=${error || 'no_code'}`);
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri  = `${appUrl}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=server_config`);
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[Spotify callback] token exchange failed:', res.status, text);
      return Response.redirect(`${appUrl}${returnTo}?spotify_error=token_exchange`);
    }

    const data = await res.json();
    const { access_token, refresh_token, expires_in } = data;

    // Redirect back to the app — put tokens in the hash fragment (client-only)
    // The frontend SpotifyProvider will read and store them in localStorage.
    const fragment = new URLSearchParams({
      spotify_access_token:  access_token,
      spotify_refresh_token: refresh_token,
      spotify_expires_in:    String(expires_in),
    });

    return Response.redirect(`${appUrl}${returnTo}#${fragment}`);
  } catch (err) {
    console.error('[Spotify callback] error:', err);
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=server_error`);
  }
}
