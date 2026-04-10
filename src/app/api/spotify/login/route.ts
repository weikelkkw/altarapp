import { NextRequest } from 'next/server';

// Redirects the user to Spotify's OAuth authorization page.
// Required scopes:
//   streaming         — Web Playback SDK (in-browser playback)
//   user-read-email   — identify the user
//   user-read-private — check Premium status
//   user-modify-playback-state — play/pause/seek/volume
//   user-read-playback-state   — get current track info
export function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return new Response('SPOTIFY_CLIENT_ID not configured', { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/callback`;

  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
  ].join(' ');

  // Pass the origin path so we can redirect back after OAuth
  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/bible';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state: encodeURIComponent(returnTo),
    show_dialog: 'false',
  });

  return Response.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
