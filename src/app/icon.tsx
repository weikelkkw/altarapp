import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050505 0%, #0a1a12 50%, #050505 100%)',
          borderRadius: 96,
        }}
      >
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,208,132,0.18)',
          display: 'flex',
        }} />
        {/* T lettermark */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}>
          {/* Horizontal bar */}
          <div style={{
            width: 220,
            height: 30,
            background: 'linear-gradient(90deg, #00d084, #00a86b)',
            borderRadius: 8,
            boxShadow: '0 0 40px rgba(0,208,132,0.5)',
          }} />
          {/* Vertical bar */}
          <div style={{
            width: 30,
            height: 190,
            background: 'linear-gradient(180deg, #00d084, #00a86b)',
            borderRadius: 8,
            marginTop: -6,
            boxShadow: '0 0 40px rgba(0,208,132,0.4)',
          }} />
        </div>
        {/* Bottom dot */}
        <div style={{
          position: 'absolute',
          bottom: 130,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#00d084',
          boxShadow: '0 0 20px rgba(0,208,132,0.8)',
          display: 'flex',
        }} />
      </div>
    ),
    { ...size }
  );
}
