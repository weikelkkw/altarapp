'use client';

import { tokens } from '../lib/theme';

interface Props {
  height?: number;
  width?: number | string;
  radius?: number;
  count?: number;
}

export function Skeleton({ height = 16, width = '100%', radius = 8, count = 1 }: Props) {
  const arr = Array.from({ length: count });
  return (
    <>
      {arr.map((_, i) => (
        <div
          key={i}
          style={{
            height,
            width,
            borderRadius: radius,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
            backgroundSize: '300% 100%',
            animation: 'altar-skel 1.4s infinite linear',
            margin: count > 1 ? '0 0 8px' : 0,
            border: `1px solid ${tokens.border}`,
          }}
        />
      ))}
      <style>{`@keyframes altar-skel { 0%{background-position:0% 0} 100%{background-position:300% 0} }`}</style>
    </>
  );
}
