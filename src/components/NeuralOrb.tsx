
import { useEffect, useState } from 'react';

type NeuralOrbProps = {
  thinking?: boolean;
};

export default function NeuralOrb({
  thinking = false,
}: NeuralOrbProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(thinking);
  }, [thinking]);

  return (
    <div
      className={`neural-orb-3d ${active ? 'thinking' : ''}`}
      role="img"
      aria-label={active ? 'Copilote en réflexion' : 'Copilote disponible'}
    >
      <div className="orb-sphere">
        <div className="orb-core" />
        <div className="orb-ring orb-ring-one" />
        <div className="orb-ring orb-ring-two" />
        <div className="orb-particles" />
      </div>

      <style>{`
        .neural-orb-3d {
          width: 180px;
          height: 180px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-sphere {
          width: 130px;
          height: 130px;
          position: relative;
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 30%,
            #a6fff0 0%,
            #38d9bd 25%,
            #087c91 60%,
            #142b45 100%
          );
          box-shadow:
            0 0 25px rgba(56, 217, 189, 0.45),
            inset -10px -10px 25px rgba(0, 0, 0, 0.3);
          animation: neuralFloat 4s ease-in-out infinite;
        }

        .orb-core {
          position: absolute;
          width: 35px;
          height: 35px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #eafffb;
          box-shadow: 0 0 25px #a6fff0;
        }

        .orb-ring {
          position: absolute;
          inset: -12px;
          border: 1px solid rgba(166, 255, 240, 0.65);
          border-radius: 50%;
        }

        .orb-ring-one {
          transform: rotateX(65deg);
        }

        .orb-ring-two {
          transform: rotateY(65deg);
        }

        .orb-particles {
          position: absolute;
          inset: -20px;
          border: 2px dotted rgba(56, 217, 189, 0.55);
          border-radius: 50%;
          animation: neuralRotate 12s linear infinite;
        }

        .thinking .orb-sphere {
          animation-duration: 1.2s;
          box-shadow: 0 0 40px rgba(56, 217, 189, 0.8);
        }

        @keyframes neuralFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }

        @keyframes neuralRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-sphere,
          .orb-particles {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

