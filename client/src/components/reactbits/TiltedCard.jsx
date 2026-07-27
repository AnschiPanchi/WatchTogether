import { useRef, useState } from 'react';

export default function TiltedCard({
  children,
  captionText = '',
  containerHeight = '100%',
  containerWidth = '100%',
  imageSrc = '',
  altText = 'Tilted card',
  scaleOnHover = 1.03,
  rotateAmplitude = 12,
  showMobileWarning = false,
  showTooltip = false,
  overlayContent = null,
  className = '',
}) {
  const ref = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);

  function handleMouse(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    setRotateX(rotationX);
    setRotateY(rotationY);
  }

  function handleMouseEnter() {
    setScale(scaleOnHover);
  }

  function handleMouseLeave() {
    setOpacity(0);
    setRotateX(0);
    setRotateY(0);
    setScale(1);
  }

  const [opacity, setOpacity] = useState(0);

  return (
    <div
      ref={ref}
      className={`tilted-card-container ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
      }}
      onMouseMove={(e) => {
        handleMouse(e);
        setOpacity(1);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="tilted-card-inner"
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
