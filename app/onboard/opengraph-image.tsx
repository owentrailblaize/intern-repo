import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Start Onboarding with Trailblaize';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Load Instrument Serif font
  const instrumentSerif = await fetch(
    new URL('https://fonts.gstatic.com/s/instrumentserif/v4/jizBRFtNs2ka5fXjeivQ4LroWlx-2zIZj1bIkNo.woff2')
  ).then((res) => res.arrayBuffer());

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
          background: 'linear-gradient(135deg, #1a2744 0%, #0f172a 100%)',
          fontFamily: 'Instrument Serif',
        }}
      >
        {/* Trailblaize logo/branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="45" fill="#14b8a6" />
            <path
              d="M30 50 L45 65 L70 35"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        
        {/* Main text */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 400,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            fontFamily: 'Instrument Serif',
          }}
        >
          Start Onboarding
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 400,
            color: '#14b8a6',
            textAlign: 'center',
            lineHeight: 1.2,
            marginTop: 8,
            fontFamily: 'Instrument Serif',
          }}
        >
          with Trailblaize
        </div>
        
        {/* URL */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: 48,
          }}
        >
          trailblaize.net
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Instrument Serif',
          data: instrumentSerif,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
}
