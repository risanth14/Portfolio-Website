import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type ThemeMode = 'dark' | 'light'

type SkillDef = {
  name: string
  color: string
  logo: string
}

const SKILLS: SkillDef[] = [
  { name: 'Python', color: '#3776ab', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { name: 'React', color: '#61dafb', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
  { name: 'TypeScript', color: '#3178c6', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
  { name: 'Next.js', color: '#f8fafc', logo: 'https://cdn.simpleicons.org/nextdotjs/ffffff' },
  { name: 'Node.js', color: '#68a063', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
  { name: 'JavaScript', color: '#f7df1e', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
  { name: 'Flask', color: '#f8fafc', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg' },
  { name: '.NET', color: '#6b4ce6', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dot-net/dot-net-original.svg' },
  { name: 'GraphQL', color: '#e10098', logo: 'https://cdn.simpleicons.org/graphql/e10098' },
  { name: 'Docker', color: '#2496ed', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
  { name: 'Kubernetes', color: '#326CE5', logo: 'https://cdn.simpleicons.org/kubernetes/326CE5' },
  { name: 'Terraform', color: '#844fba', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg' },
  { name: 'Jenkins', color: '#d33833', logo: 'https://cdn.simpleicons.org/jenkins/d33833' },
  { name: 'GitHub Actions', color: '#2088ff', logo: 'https://cdn.simpleicons.org/githubactions/2088ff' },
  { name: 'Azure', color: '#0078d4', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg' },
  { name: 'GCP', color: '#4285f4', logo: 'https://cdn.simpleicons.org/googlecloud/4285f4' },
  { name: 'FastAPI', color: '#009688', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg' },
  { name: 'PostgreSQL', color: '#336791', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg' },
  { name: 'MySQL', color: '#00758f', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
  { name: 'Oracle DB', color: '#f80000', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg' },
  { name: 'Java', color: '#ED8B00', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
  { name: 'C#', color: '#7b4be2', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' },
  { name: 'C++', color: '#00599c', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
  { name: 'Chart.js', color: '#ff6384', logo: 'https://cdn.simpleicons.org/chartdotjs/ff6384' },
  { name: 'Postman', color: '#ff6c37', logo: 'https://cdn.simpleicons.org/postman/ff6c37' },
  { name: 'Git', color: '#f1502f', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
  { name: 'GitHub', color: '#f8fafc', logo: 'https://cdn.simpleicons.org/github/ffffff' },
]

const GLOBE_HEIGHT = 520

export default function SkillsGlobe({ theme }: { theme: ThemeMode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef<string | null>(null)
  const [hovered, setHovered] = useState<{
    name: string
    x: number
    y: number
    color: string
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = GLOBE_HEIGHT

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 14

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    renderer.domElement.style.cursor = 'grab'

    const globe = new THREE.Group()
    scene.add(globe)

    const RADIUS = 5

    const sphereGeo = new THREE.IcosahedronGeometry(RADIUS, 2)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    })
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
    globe.add(sphereMesh)

    const ringMats: THREE.MeshBasicMaterial[] = []
    const makeRing = (rx: number, ry: number, rz: number, op: number, col: number) => {
      const geo = new THREE.RingGeometry(RADIUS + 0.02, RADIUS + 0.07, 128)
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: op,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.set(rx, ry, rz)
      globe.add(ring)
      ringMats.push(mat)
    }
    makeRing(Math.PI / 2, 0, 0, 0.1, 0xa78bfa)
    makeRing(Math.PI / 3, 0, Math.PI / 6, 0.06, 0xec4899)
    makeRing(Math.PI / 2.5, Math.PI / 4, 0, 0.05, 0x60a5fa)

    const glowGeo = new THREE.SphereGeometry(0.4, 16, 16)
    const iconSprites: THREE.Sprite[] = []
    const loader = new THREE.TextureLoader()

    SKILLS.forEach((skill, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / SKILLS.length)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i

      const x = RADIUS * Math.sin(phi) * Math.cos(theta)
      const y = RADIUS * Math.cos(phi)
      const z = RADIUS * Math.sin(phi) * Math.sin(theta)

      const spriteMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.position.set(x, y, z)
      sprite.scale.set(1, 1, 1)
      sprite.userData = { name: skill.name, baseColor: skill.color, baseScale: 1 }

      loader.load(
        skill.logo,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          spriteMat.map = texture
          spriteMat.needsUpdate = true
          const img = texture.image as HTMLImageElement | undefined
          if (img?.width && img?.height) {
            const aspect = img.width / img.height
            const base = 0.9
            sprite.scale.set(base * aspect, base, 1)
            sprite.userData.baseScale = base
            sprite.userData.aspect = aspect
          }
        },
        undefined,
        () => {
          spriteMat.color = new THREE.Color(skill.color)
          spriteMat.opacity = 0.85
        },
      )

      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(skill.color),
        transparent: true,
        opacity: 0,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.set(x, y, z)
      glow.userData = { isGlow: true, parentName: skill.name }

      globe.add(sprite)
      globe.add(glow)
      iconSprites.push(sprite)
    })

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-999, -999)

    let isDragging = false
    let prevMouse = { x: 0, y: 0 }
    let autoSpeed = 0.003
    const velocity = { x: 0, y: 0 }

    const onPointerDown = (event: PointerEvent) => {
      isDragging = true
      prevMouse = { x: event.clientX, y: event.clientY }
      autoSpeed = 0
      renderer.domElement.style.cursor = 'grabbing'
    }

    const onPointerUp = () => {
      isDragging = false
      renderer.domElement.style.cursor = 'grab'
      window.setTimeout(() => {
        autoSpeed = 0.003
      }, 800)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging) {
        const dx = event.clientX - prevMouse.x
        const dy = event.clientY - prevMouse.y
        velocity.y = dx * 0.005
        velocity.x = dy * 0.003
        prevMouse = { x: event.clientX, y: event.clientY }
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      isDragging = true
      autoSpeed = 0
      prevMouse = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }

    const onTouchEnd = () => {
      isDragging = false
      window.setTimeout(() => {
        autoSpeed = 0.003
      }, 800)
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!isDragging || !event.touches.length) return
      const dx = event.touches[0].clientX - prevMouse.x
      const dy = event.touches[0].clientY - prevMouse.y
      velocity.y = dx * 0.005
      velocity.x = dy * 0.003
      prevMouse = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }

    const el = renderer.domElement
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchmove', onTouchMove, { passive: true })

    let rafId = 0

    const animate = () => {
      globe.rotation.y += autoSpeed

      if (!isDragging) {
        velocity.x *= 0.94
        velocity.y *= 0.94
      }
      globe.rotation.y += velocity.y
      globe.rotation.x += velocity.x
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x))

      if (theme === 'light') {
        sphereMat.color.set(0x1e3a8a)
        sphereMat.opacity = 0.15
        if (ringMats[0]) {
          ringMats[0].color.set(0x1e3a8a)
          ringMats[0].opacity = 0.14
        }
        if (ringMats[1]) {
          ringMats[1].color.set(0x334155)
          ringMats[1].opacity = 0.09
        }
        if (ringMats[2]) {
          ringMats[2].color.set(0x1e40af)
          ringMats[2].opacity = 0.1
        }
      } else {
        sphereMat.color.set(0xa78bfa)
        sphereMat.opacity = 0.07
        if (ringMats[0]) {
          ringMats[0].color.set(0xa78bfa)
          ringMats[0].opacity = 0.1
        }
        if (ringMats[1]) {
          ringMats[1].color.set(0xec4899)
          ringMats[1].opacity = 0.06
        }
        if (ringMats[2]) {
          ringMats[2].color.set(0x60a5fa)
          ringMats[2].opacity = 0.05
        }
      }

      iconSprites.forEach((sprite) => {
        const worldPos = sprite.position.clone().applyMatrix4(globe.matrixWorld)
        const dist = worldPos.distanceTo(camera.position)
        const minD = camera.position.z - RADIUS
        const maxD = camera.position.z + RADIUS
        const t = Math.max(0, Math.min(1, 1 - (dist - minD) / (maxD - minD)))

        const isHovered = hoveredRef.current === sprite.userData.name

        let scale: number
        let opacity: number
        if (t > 0.6) {
          scale = 0.85 + t * 0.7
          opacity = 0.92 + t * 0.08
        } else if (t > 0.3) {
          scale = 0.5 + t * 0.55
          opacity = 0.45 + t * 0.28
        } else {
          scale = 0.28 + t * 0.38
          opacity = 0.18 + t * 0.18
        }

        if (isHovered) {
          scale = 1.9
          opacity = 1
        }

        const aspect = sprite.userData.aspect ?? 1
        const baseScale = sprite.userData.baseScale ?? 0.9
        const s = scale * baseScale
        sprite.scale.set(s * aspect, s, 1)
        ;(sprite.material as THREE.SpriteMaterial).opacity = opacity
      })

      globe.children.forEach((child) => {
        if (child.userData?.isGlow) {
          const parentName = child.userData.parentName
          const isHovered = hoveredRef.current === parentName
          ;(child as THREE.Mesh).scale.setScalar(isHovered ? 3.1 : 0)
          ;((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = isHovered ? 0.2 : 0
        }
      })

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(iconSprites)

      if (hits.length > 0) {
        const obj = hits[0].object as THREE.Sprite
        const wp = obj.position.clone().applyMatrix4(globe.matrixWorld)
        wp.project(camera)

        const rect = el.getBoundingClientRect()
        const sx = (wp.x * 0.5 + 0.5) * rect.width
        const sy = (-wp.y * 0.5 + 0.5) * rect.height

        hoveredRef.current = obj.userData.name
        setHovered({
          name: obj.userData.name,
          x: sx,
          y: sy,
          color: obj.userData.baseColor,
        })
        if (!isDragging) el.style.cursor = 'pointer'
      } else {
        hoveredRef.current = null
        setHovered(null)
        if (!isDragging) el.style.cursor = 'grab'
      }

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = container.clientWidth
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      renderer.dispose()
      sphereGeo.dispose()
      sphereMat.dispose()
      glowGeo.dispose()
      if (container.contains(el)) container.removeChild(el)
    }
  }, [theme])

  return (
    <section id="skills" className="pt-20">
      <div className="mb-6 flex items-end justify-center gap-3 text-center">
        <p className="theme-eyebrow pb-2 text-xs font-semibold uppercase tracking-[0.22em] md:pb-3">
          Tech Stack
        </p>
        <h2 className="font-[Space_Grotesk] text-5xl font-bold leading-none md:text-7xl">
          <span className="text-current">My </span>
          <span className="skills-title-accent">Skills</span>
        </h2>
      </div>

      <div className="relative mx-auto max-w-[1060px] px-2 py-4 md:px-5 md:py-6">
        <div
          ref={containerRef}
          className="relative mx-auto"
          style={{ maxWidth: 860, height: GLOBE_HEIGHT }}
        >
          {hovered && (
            <div
              className="pointer-events-none absolute z-50 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              style={{
                left: hovered.x,
                top: hovered.y + 26,
                transform: 'translateX(-50%)',
                background: theme === 'light'
                  ? 'linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.9))'
                  : 'linear-gradient(135deg, rgba(2,6,23,0.92), rgba(15,23,42,0.9))',
                border: `1px solid ${hovered.color}aa`,
                color: '#f8fafc',
                textShadow: '0 1px 2px rgba(0,0,0,0.55)',
                boxShadow: `0 10px 24px rgba(2,6,23,0.45), 0 0 0 1px ${hovered.color}33`,
              }}
            >
              {hovered.name}
            </div>
          )}
        </div>

        <p className="theme-muted text-center text-sm">Drag to rotate . Hover nodes for details</p>
      </div>
    </section>
  )
}

