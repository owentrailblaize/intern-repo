import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Join the Trailblaize Team'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(180deg, #f5f7f6 0%, #eef1ef 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Flag Icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 40 40"
          fill="none"
          style={{ marginBottom: 30 }}
        >
          <path
            d="M12 8C10 14 7 32 5 38"
            stroke="#1a2744"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M14 5C14 5 20 3 26 5C32 7 36 5 38 6C38 6 36 12 38 16C32 14 26 16 20 14C14 12 14 14 14 14V5Z"
            fill="#1a2744"
          />
          <path
            d="M14 18C14 18 20 16 26 18C32 20 36 19 38 20C40 22 40 26 37 28C33 30 28 29 22 27C16 25 14 26 14 26V18Z"
            fill="#1a2744"
          />
        </svg>
        
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: '#1a2744',
            marginBottom: 10,
            fontStyle: 'normal',
          }}
        >
          Trailblaize
        </div>
        
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: '#1a2744',
            fontStyle: 'italic',
            marginBottom: 40,
          }}
        >
          Growth Space
        </div>
        
        <div
          style={{
            fontSize: 42,
            fontWeight: 400,
            color: '#4b5563',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Join the Team
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
