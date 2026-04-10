import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050505 0%, #0a1a12 50%, #050505 100%)',
        }}
      >
        {/* T lettermark */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}>
          <div style={{
            width: 80,
            height: 11,
            background: 'linear-gradient(90deg, #00d084, #00a86b)',
            borderRadius: 3,
            boxShadow: '0 0 14px rgba(0,208,132,0.5)',
          }} />
          <div style={{
            width: 11,
            height: 68,
            background: 'linear-gradient(180deg, #00d084, #00a86b)',
            borderRadius: 3,
            marginTop: -2,
            boxShadow: '0 0 14px rgba(0,208,132,0.4)',
          }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
