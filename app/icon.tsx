import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          borderRadius: 4,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 40 40"
          fill="none"
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
      </div>
    ),
    {
      ...size,
    }
  )
}
