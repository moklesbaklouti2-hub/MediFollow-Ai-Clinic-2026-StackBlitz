
export default function Orb3D() {
    return (
      <div
        style={{
          width: 112,
          height: 112,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 25%, #b5fff1, #42d5b4 45%, #087e70 100%)',
          boxShadow: '0 0 25px rgba(66, 213, 180, 0.55), inset -8px -8px 18px rgba(0, 50, 45, 0.3)',
          animation: 'neuralGlow 3s ease-in-out infinite',
        }}
      />
    );
  }

  