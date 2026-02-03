import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Trailblaize - Build the Future of Alumni Networks'
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
          background: '#0a0f1a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Grid Pattern Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 30%, rgba(45, 212, 191, 0.08) 0%, transparent 60%)',
          }}
        />

        {/* Now Hiring Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 50,
            padding: '12px 24px',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 12px #10b981',
            }}
          />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Now Hiring — Limited Positions
          </span>
        </div>

        {/* Main Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            Build the Future
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#2dd4bf',
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            of Alumni Networks
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: 40,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          Trailblaize is revolutionizing how organizations connect with their communities.
        </p>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 40,
            marginTop: 50,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 18 }}>5,500+ Users</span>
          </div>
          <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 18 }}>5 Schools</span>
          </div>
          <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 18 }}>Growing Fast</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
