import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Start Onboarding with Trailblaize';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
        }}
      >
        {/* Main text */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.3,
            fontFamily: 'Georgia, serif',
          }}
        >
          Start Onboarding
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.3,
            marginTop: 8,
            fontFamily: 'Georgia, serif',
          }}
        >
          with Trailblaize
        </div>
        
        {/* URL */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: 60,
            fontFamily: 'Georgia, serif',
          }}
        >
          trailblaize.net
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
