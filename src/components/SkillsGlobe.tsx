import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type ThemeMode = 'dark' | 'light'
type SkillCategory = 'frontend' | 'backend' | 'infra' | 'ai_data'

type SkillDef = {
  name: string
  color: string
  logo: string
  category: SkillCategory
}

const CATEGORY_CONFIG: Record<
  SkillCategory,
  { label: string; accentHex: string; accentTextClass: string }
> = {
  frontend: {
    label: 'Frontend',
    accentHex: '#3b82f6',
    accentTextClass: 'text-blue-300',
  },
  backend: {
    label: 'Backend',
    accentHex: '#f59e0b',
    accentTextClass: 'text-amber-300',
  },
  infra: {
    label: 'Infra & Cloud',
    accentHex: '#10b981',
    accentTextClass: 'text-emerald-300',
  },
  ai_data: {
    label: 'AI & Data',
    accentHex: '#a855f7',
    accentTextClass: 'text-violet-300',
  },
}

const SKILLS: SkillDef[] = [
  { name: 'React', color: '#61dafb', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', category: 'frontend' },
  { name: 'TypeScript', color: '#3178c6', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg', category: 'frontend' },
  { name: 'Next.js', color: '#f8fafc', logo: 'https://cdn.simpleicons.org/nextdotjs/ffffff', category: 'frontend' },
  { name: 'JavaScript', color: '#f7df1e', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', category: 'frontend' },

  { name: 'Node.js', color: '#68a063', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg', category: 'backend' },
  { name: 'FastAPI', color: '#009688', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg', category: 'backend' },
  { name: 'Flask', color: '#f8fafc', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg', category: 'backend' },
  { name: '.NET', color: '#6b4ce6', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dot-net/dot-net-original.svg', category: 'backend' },
  { name: 'GraphQL', color: '#e10098', logo: 'https://cdn.simpleicons.org/graphql/e10098', category: 'backend' },
  { name: 'PostgreSQL', color: '#336791', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', category: 'backend' },
  { name: 'MySQL', color: '#00758f', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg', category: 'backend' },
  { name: 'Oracle DB', color: '#f80000', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg', category: 'backend' },

  { name: 'Docker', color: '#2496ed', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg', category: 'infra' },
  { name: 'Kubernetes', color: '#326CE5', logo: 'https://cdn.simpleicons.org/kubernetes/326CE5', category: 'infra' },
  { name: 'Terraform', color: '#844fba', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg', category: 'infra' },
  { name: 'Jenkins', color: '#d33833', logo: 'https://cdn.simpleicons.org/jenkins/d33833', category: 'infra' },
  { name: 'GitHub Actions', color: '#2088ff', logo: 'https://cdn.simpleicons.org/githubactions/2088ff', category: 'infra' },
  { name: 'Azure', color: '#0078d4', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', category: 'infra' },
  { name: 'GCP', color: '#4285f4', logo: 'https://cdn.simpleicons.org/googlecloud/4285f4', category: 'infra' },

  { name: 'Python', color: '#3776ab', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', category: 'ai_data' },
  { name: 'Chart.js', color: '#ff6384', logo: 'https://cdn.simpleicons.org/chartdotjs/ff6384', category: 'ai_data' },
  { name: 'Java', color: '#ED8B00', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg', category: 'ai_data' },
  { name: 'C#', color: '#7b4be2', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg', category: 'ai_data' },
  { name: 'C++', color: '#00599c', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg', category: 'ai_data' },
  { name: 'Postman', color: '#ff6c37', logo: 'https://cdn.simpleicons.org/postman/ff6c37', category: 'ai_data' },
  { name: 'Git', color: '#f1502f', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg', category: 'ai_data' },
  { name: 'GitHub', color: '#f8fafc', logo: 'https://cdn.simpleicons.org/github/ffffff', category: 'ai_data' },
]

const GLOBE_HEIGHT = 520

export default function SkillsGlobe({ theme }: { theme: ThemeMode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filterBarRef = useRef<HTMLDivElement>(null)
  const globeWrapRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<SkillCategory | null>(null)
  const [hovered, setHovered] = useState<{
    name: string
    x: number
    y: number
    color: string
  } | null>(null)

  const visibleSkills = useMemo(
    () => (activeCategory ? SKILLS.filter((skill) => skill.category === activeCategory) : SKILLS),
    [activeCategory],
  )

  useEffect(() => {
    if (!activeCategory) return

    const onWindowPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (filterBarRef.current?.contains(target)) return
      if (globeWrapRef.current?.contains(target)) return
      setActiveCategory(null)
    }

    window.addEventListener('pointerdown', onWindowPointerDown)
    return () => window.removeEventListener('pointerdown', onWindowPointerDown)
  }, [activeCategory])

  useEffect(() => {
    const container = containerRef.current
    if (!container || visibleSkills.length === 0) return

    const width = container.clientWidth
    const height = GLOBE_HEIGHT
    const accent = activeCategory ? CATEGORY_CONFIG[activeCategory].accentHex : '#3b82f6'
    const accentColor = new THREE.Color(accent)

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
      color: accentColor,
      wireframe: true,
      transparent: true,
      opacity: theme === 'light' ? 0.16 : 0.1,
    })
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
    globe.add(sphereMesh)

    const ringMats: THREE.MeshBasicMaterial[] = []
    const makeRing = (rx: number, ry: number, rz: number, op: number) => {
      const geo = new THREE.RingGeometry(RADIUS + 0.02, RADIUS + 0.07, 128)
      const mat = new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: op,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.set(rx, ry, rz)
      globe.add(ring)
      ringMats.push(mat)
    }
    makeRing(Math.PI / 2, 0, 0, theme === 'light' ? 0.18 : 0.14)
    makeRing(Math.PI / 3, 0, Math.PI / 6, theme === 'light' ? 0.13 : 0.1)
    makeRing(Math.PI / 2.5, Math.PI / 4, 0, theme === 'light' ? 0.11 : 0.08)

    const glowGeo = new THREE.SphereGeometry(0.4, 16, 16)
    const iconSprites: THREE.Sprite[] = []
    const loader = new THREE.TextureLoader()

    visibleSkills.forEach((skill, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / visibleSkills.length)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i

      const x = RADIUS * Math.sin(phi) * Math.cos(theta)
      const y = RADIUS * Math.cos(phi)
      const z = RADIUS * Math.sin(phi) * Math.sin(theta)

      const spriteMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
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
          spriteMat.opacity = 0.9
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

      sphereMat.color.copy(accentColor)
      sphereMat.opacity = theme === 'light' ? 0.16 : 0.1
      ringMats.forEach((mat, idx) => {
        mat.color.copy(accentColor)
        mat.opacity = (theme === 'light' ? 0.16 : 0.1) - idx * 0.03
      })

      iconSprites.forEach((sprite) => {
        const worldPos = sprite.position.clone().applyMatrix4(globe.matrixWorld)
        const dist = worldPos.distanceTo(camera.position)
        const minD = camera.position.z - RADIUS
        const maxD = camera.position.z + RADIUS
        const t = Math.max(0, Math.min(1, 1 - (dist - minD) / (maxD - minD)))
        const isHovered = hoveredRef.current === sprite.userData.name

        let scale = t > 0.6 ? 0.85 + t * 0.7 : t > 0.3 ? 0.5 + t * 0.55 : 0.28 + t * 0.38
        let opacity = t > 0.6 ? 0.92 + t * 0.08 : t > 0.3 ? 0.45 + t * 0.28 : 0.18 + t * 0.18

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
      hoveredRef.current = null
      if (container.contains(el)) container.removeChild(el)
    }
  }, [activeCategory, theme, visibleSkills])

  return (
    <section id="skills" className="pt-20">
      <div className="mb-6 flex items-end justify-center gap-3 text-center">
        <p className="theme-eyebrow pb-2 text-xs font-semibold uppercase tracking-[0.22em] md:pb-3">Tech Stack</p>
        <h2 className="font-[Space_Grotesk] text-5xl font-bold leading-none md:text-7xl">
          <span className="text-current">My </span>
          <span className="skills-title-accent">Skills</span>
        </h2>
      </div>

      <div ref={filterBarRef} className="mb-4 flex flex-wrap justify-center gap-2">
        {(Object.keys(CATEGORY_CONFIG) as SkillCategory[]).map((category) => {
          const item = CATEGORY_CONFIG[category]
          const active = category === activeCategory
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? 'skills-filter-pill-active font-bold'
                  : 'theme-chip border'
              }`}
              style={
                active
                  ? {
                      borderColor: `${item.accentHex}aa`,
                      background: `${item.accentHex}22`,
                      boxShadow: `0 0 26px ${item.accentHex}88, inset 0 0 14px ${item.accentHex}33`,
                      color: item.accentHex,
                      textShadow: `0 0 14px ${item.accentHex}cc`,
                      ['--pill-glow' as string]: item.accentHex,
                    }
                  : undefined
              }
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: item.accentHex,
                    boxShadow: active ? `0 0 10px ${item.accentHex}` : 'none',
                  }}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      <div ref={globeWrapRef} className="relative mx-auto max-w-[1060px] px-2 py-4 md:px-5 md:py-6">
        <div ref={containerRef} className="relative mx-auto" style={{ maxWidth: 860, height: GLOBE_HEIGHT }}>
          {hovered && (
            <div
              className="pointer-events-none absolute z-50 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              style={{
                left: hovered.x,
                top: hovered.y + 26,
                transform: 'translateX(-50%)',
                background:
                  theme === 'light'
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

        {activeCategory && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {visibleSkills.map((skill) => (
              <span key={skill.name} className="theme-chip inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm font-semibold">
                <img
                  src={skill.logo}
                  alt={`${skill.name} logo`}
                  loading="lazy"
                  className="h-3.5 w-3.5 object-contain"
                />
                {skill.name}
              </span>
            ))}
          </div>
        )}

      </div>
    </section>
  )
}


