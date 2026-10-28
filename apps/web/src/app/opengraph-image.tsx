import { ImageResponse } from 'next/og';

export const alt =
  'Two glowing theatre seats side by side, with a heart between them';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 68,
        color: '#FFF4EC',
        background:
          'radial-gradient(ellipse at 50% 45%, #64223f 0%, #3B0F26 38%, #1A0B14 78%)',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 25, color: '#FFB86B', letterSpacing: 7 }}>
          2SEATS
        </div>
        <div style={{ fontSize: 61, lineHeight: 1.12, maxWidth: 545 }}>
          Your seat is always next to mine.
        </div>
        <div
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 25,
            color: '#FFB3C6',
          }}
        >
          Movie dates for people who are miles apart.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          color: '#FFB3C6',
          filter: 'drop-shadow(0 0 24px rgba(232,70,108,.5))',
        }}
      >
        <Seat />
        <div style={{ fontSize: 54, color: '#E8466C' }}>♥</div>
        <Seat />
      </div>
    </div>,
    size,
  );
}

function Seat(): JSX.Element {
  return (
    <div
      style={{
        width: 142,
        height: 215,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid #FFB3C6',
        borderRadius: '48px 48px 22px 22px',
        background: 'linear-gradient(145deg,#79304d,#351222)',
        boxShadow: '0 0 36px rgba(232,70,108,.28)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 80,
          background: 'linear-gradient(145deg,#E8466C,#FFB3C6)',
        }}
      />
    </div>
  );
}
