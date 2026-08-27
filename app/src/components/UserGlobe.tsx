import { useEffect, useRef, useState } from "react"
import createGlobe from "cobe"

export interface GlobeMarker {
  id: string
  location: [number, number]
  size: number
  label?: string
}

interface UserGlobeProps {
  markers: GlobeMarker[]
  className?: string
}

const BASE_THETA = 0.2

const THETA_MIN = -Math.PI / 2 + 0.05
const THETA_MAX = Math.PI / 2 - 0.05

export function UserGlobe({ markers, className }: UserGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffsetX = useRef(0)
  const dragOffsetY = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: BASE_THETA,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [0.2, 0.4, 1],
      glowColor: [1, 1, 1],
      markers: markers.map((m) => ({
        location: m.location,
        size: m.size,
        id: m.id,
      })),
    })

    let phi = 0
    let animationFrameId: number
    function animate() {
      if (pointerInteracting.current === null) {
        phi += 0.005
      }
      const theta = Math.min(
        THETA_MAX,
        Math.max(THETA_MIN, BASE_THETA + dragOffsetY.current)
      )
      globe.update({ phi: phi + dragOffsetX.current, theta })
      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      globe.destroy()
    }
  }, [markers])

  return (
    <div className={className} style={{ position: "relative", width: 600, maxWidth: "100%" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = {
            x: e.clientX - dragOffsetX.current * 200,
            y: e.clientY + dragOffsetY.current * 200,
          }
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
        }}
        onPointerUp={() => {
          pointerInteracting.current = null
          if (canvasRef.current) canvasRef.current.style.cursor = "grab"
        }}
        onPointerOut={() => {
          pointerInteracting.current = null
          if (canvasRef.current) canvasRef.current.style.cursor = "grab"
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const deltaX = e.clientX - pointerInteracting.current.x
            const deltaY = e.clientY - pointerInteracting.current.y
            dragOffsetX.current = deltaX / 200
            // Inversé : glisser vers le haut incline le globe vers le haut
            dragOffsetY.current = -deltaY / 200
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const deltaX = e.touches[0].clientX - pointerInteracting.current.x
            const deltaY = e.touches[0].clientY - pointerInteracting.current.y
            dragOffsetX.current = deltaX / 200
            dragOffsetY.current = -deltaY / 200
          }
        }}
        style={{ width: "100%", height: "auto", aspectRatio: 1, cursor: "grab" }}
      />
      {markers
        .filter((m) => m.label)
        .map((m) => (
          <button
            key={`hit-${m.id}`}
            type="button"
            aria-label="Afficher le nombre d'utilisateurs"
            onClick={() => setActiveMarkerId((prev) => (prev === m.id ? null : m.id))}
            className="marker-hit"
            style={{ positionAnchor: `--cobe-${m.id}` } as React.CSSProperties}
          />
        ))}
      {markers
        .filter((m) => m.label && m.id === activeMarkerId)
        .map((m) => (
          <div
            key={m.id}
            className="marker-label"
            style={{ positionAnchor: `--cobe-${m.id}` } as React.CSSProperties}
          >
            {m.label}
          </div>
        ))}
    </div>
  )
}
