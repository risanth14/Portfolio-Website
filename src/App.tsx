import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import SkillsGlobe from './components/SkillsGlobe'
import profileImage from './components/images/Profile Picture.jpg'

type Repo = {
  id: number
  name: string
  description: string | null
  html_url: string
  homepage: string | null
  languages_url: string
  stargazers_count: number
  forks_count: number
  language: string | null
  updated_at: string
  pushed_at: string
  topics?: string[]
  fork: boolean
  owner: {
    login: string
  }
}

type RepoView = Repo & {
  isPinned: boolean
  topLanguages: string[]
  pinnedIndex?: number
}

type ChatRole = 'user' | 'bot'
type ThemeMode = 'dark' | 'light'

type ChatMessage = {
  id: number
  role: ChatRole
  content: string
}

const GITHUB_USER = 'risanth14'
const OPENAI_KEY_STORAGE = 'portfolio_openai_key'
const THEME_STORAGE = 'portfolio_theme_mode'
const PROJECT_REFRESH_MS = 60_000

type GithubReposApiResponse = {
  repos: Array<Repo & {
    top_languages?: string[]
    is_pinned?: boolean
    pinned_index?: number | null
  }>
  total_count?: number
}

const navItems = [
  { id: 'top', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

const timeline = [
  {
    heading: 'Software Development Journey',
    text: 'Built and shipped multiple web applications with a focus on usability, reliability, and scalability.',
  },
  {
    heading: 'Computer Science Foundation',
    text: 'Applied data structures, algorithms, and software engineering principles in real-world projects.',
  },
  {
    heading: 'Collaboration and Delivery',
    text: 'Worked through iterative feedback loops to deliver polished features quickly and safely.',
  },
]

const fallbackAnswers: Array<{ trigger: string[]; text: string }> = [
  {
    trigger: ['skill', 'stack', 'technology', 'tech'],
    text: 'Risanth works primarily with React, TypeScript, Tailwind CSS, Node.js, and databases like MySQL/MongoDB.',
  },
  {
    trigger: ['project', 'build', 'portfolio', 'github'],
    text: 'Check the Projects section for featured builds, and use the GitHub button for the full repository list.',
  },
  {
    trigger: ['experience', 'education', 'background'],
    text: 'Risanth has a strong software development and computer science foundation, focused on practical product delivery.',
  },
]

function App() {
  const [repos, setRepos] = useState<RepoView[]>([])
  const [featuredRepos, setFeaturedRepos] = useState<RepoView[]>([])
  const [totalRepoCount, setTotalRepoCount] = useState(0)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE)
    if (stored === 'dark' || stored === 'light') return stored
    return 'dark'
  })

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'bot',
      content: 'Hi, I am Risanth\'s portfolio assistant. Ask me about projects, skills, or experience.',
    },
  ])
  const [chatBusy, setChatBusy] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<RepoView | null>(null)
  const cursorBubbleRef = useRef<HTMLDivElement | null>(null)
  const cursorDotRef = useRef<HTMLDivElement | null>(null)
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        delay: `${(index % 17) * 0.35}s`,
        size: 1 + (index % 3),
      })),
    [],
  )

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE, theme)
  }, [theme])

  useEffect(() => {
    void fetchProjects()
    const intervalId = window.setInterval(() => {
      void fetchProjects()
    }, PROJECT_REFRESH_MS)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const bubble = cursorBubbleRef.current
    const dot = cursorDotRef.current
    if (!bubble || !dot) return

    let rafId = 0
    let currentX = -120
    let currentY = -120
    let targetX = -120
    let targetY = -120
    let lastTargetX = -120
    let lastTargetY = -120
    const bubbleSize = 40
    const dotSize = 8

    const animate = () => {
      currentX += (targetX - currentX) * 0.14
      currentY += (targetY - currentY) * 0.14

      const leadX = targetX - currentX
      const leadY = targetY - currentY
      const speed = Math.hypot(targetX - lastTargetX, targetY - lastTargetY)
      const stretch = Math.min(0.34, speed / 18)
      const angle = Math.atan2(leadY, leadX)
      const scaleX = 1 + stretch
      const scaleY = 1 - stretch * 0.55
      const wobble = Math.sin(Date.now() * 0.01) * 5
      const r1 = 52 + wobble + stretch * 16
      const r2 = 46 - wobble * 0.5
      const r3 = 58 - wobble * 0.7 + stretch * 10
      const r4 = 44 + wobble * 0.6

      bubble.style.transform = `translate3d(${currentX - bubbleSize / 2}px, ${currentY - bubbleSize / 2}px, 0) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`
      bubble.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r3}% ${r1}% ${r4}% ${r2}%`
      lastTargetX = targetX
      lastTargetY = targetY
      rafId = requestAnimationFrame(animate)
    }

    const moveCursor = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      dot.style.transform = `translate3d(${targetX - dotSize / 2}px, ${targetY - dotSize / 2}px, 0)`
      bubble.style.opacity = '1'
      dot.style.opacity = '1'
    }

    const hideCursor = () => {
      bubble.style.opacity = '0'
      dot.style.opacity = '0'
    }

    window.addEventListener('pointermove', moveCursor, { passive: true })
    window.addEventListener('pointerleave', hideCursor)
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', moveCursor)
      window.removeEventListener('pointerleave', hideCursor)
    }
  }, [])
  async function fetchProjects() {
    try {
      setLoadingProjects(true)

      const response = await fetch(`/api/github-repos?username=${encodeURIComponent(GITHUB_USER)}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`GitHub function error ${response.status}`)
      }

      const data = (await response.json()) as GithubReposApiResponse
      const userRepos = (data.repos ?? []).filter((repo) => repo.owner?.login?.toLowerCase() === GITHUB_USER)
      setTotalRepoCount(userRepos.length)

      const pinnedOrder = new Map<string, number>()
      userRepos.forEach((repo) => {
        const index = repo.pinned_index
        if (typeof index === 'number') {
          pinnedOrder.set(repo.name.toLowerCase(), index)
        }
      })

      const sortedRepos = [...userRepos].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )

      const pinnedRepos = [...userRepos]
        .filter((repo) => pinnedOrder.has(repo.name.toLowerCase()))
        .sort((a, b) => (pinnedOrder.get(a.name.toLowerCase()) ?? 999) - (pinnedOrder.get(b.name.toLowerCase()) ?? 999))

      const nonPinned = [...userRepos]
        .filter((repo) => !pinnedOrder.has(repo.name.toLowerCase()))
        .sort(
          (a, b) =>
            b.stargazers_count - a.stargazers_count ||
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )

      const featuredRaw = [...pinnedRepos, ...nonPinned].slice(0, 6)
      const visibleRaw = sortedRepos

      const toRepoView = (repo: Repo): RepoView => ({
        ...repo,
        isPinned: (repo as GithubReposApiResponse['repos'][number]).is_pinned === true || pinnedOrder.has(repo.name.toLowerCase()),
        topLanguages: (repo as GithubReposApiResponse['repos'][number]).top_languages ?? (repo.language ? [repo.language] : []),
        pinnedIndex: pinnedOrder.get(repo.name.toLowerCase()),
      })

      setRepos(visibleRaw.map(toRepoView))
      setFeaturedRepos(featuredRaw.map(toRepoView))
      setProjectsError('')
    } catch (error) {
      console.error(error)
      setProjectsError('Could not load pinned repositories right now. Check deployment env vars (GITHUB_TOKEN, GITHUB_USERNAME).')
    } finally {
      setLoadingProjects(false)
    }
  }

  function saveApiKey() {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return
    localStorage.setItem(OPENAI_KEY_STORAGE, trimmed)
    setApiKeyInput('')
    pushMessage('bot', 'API key saved in this browser. You can now ask AI-powered questions.')
  }

  function pushMessage(role: ChatRole, content: string) {
    setChatMessages((prev) => [...prev, { id: Date.now() + Math.random(), role, content }])
  }

  function localReply(question: string) {
    const lower = question.toLowerCase()
    const found = fallbackAnswers.find((item) => item.trigger.some((token) => lower.includes(token)))
    if (found) return found.text
    return 'Risanth builds polished full-stack products and integrates AI where it provides real value to users.'
  }

  function formatRelativeDate(dateString: string) {
    const target = new Date(dateString).getTime()
    const diffMs = target - Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const dayDiff = Math.round(diffMs / dayMs)
    if (Math.abs(dayDiff) < 1) return 'today'
    if (Math.abs(dayDiff) < 30) return `${Math.abs(dayDiff)} day${Math.abs(dayDiff) === 1 ? '' : 's'} ago`
    const monthDiff = Math.round(Math.abs(dayDiff) / 30)
    if (monthDiff < 12) return `${monthDiff} month${monthDiff === 1 ? '' : 's'} ago`
    const yearDiff = Math.round(monthDiff / 12)
    return `${yearDiff} year${yearDiff === 1 ? '' : 's'} ago`
  }

  function languageColor(language: string) {
    const normalized = language.toLowerCase()
    if (normalized.includes('typescript')) return '#3b82f6'
    if (normalized.includes('javascript')) return '#facc15'
    if (normalized.includes('python')) return '#60a5fa'
    if (normalized.includes('css')) return '#a855f7'
    if (normalized.includes('html')) return '#f97316'
    if (normalized.includes('shell')) return '#84cc16'
    if (normalized.includes('sql')) return '#38bdf8'
    return '#94a3b8'
  }

  async function askOpenAI(question: string) {
    const key = localStorage.getItem(OPENAI_KEY_STORAGE)
    if (!key) return null

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'You are an assistant for Risanth\'s portfolio. Be concise, factual, and only answer about his projects, skills, and experience.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_output_tokens: 180,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`)
    }

    const data = (await response.json()) as { output_text?: string }
    return data.output_text?.trim() ?? null
  }

  async function onSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed || chatBusy) return

    pushMessage('user', trimmed)
    setChatInput('')
    setChatBusy(true)

    try {
      const aiResponse = await askOpenAI(trimmed)
      if (aiResponse) {
        pushMessage('bot', aiResponse)
      } else {
        pushMessage('bot', localReply(trimmed))
      }
    } catch {
      pushMessage('bot', localReply(trimmed))
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <div className={`theme-root ${theme === 'dark' ? 'theme-dark' : 'theme-light'} relative min-h-screen overflow-x-hidden`}>
      <div ref={cursorBubbleRef} className="cursor-bubble hidden md:block" aria-hidden="true" />
      <span ref={cursorDotRef} className="cursor-dot hidden md:block" aria-hidden="true" />

      <div className="stars-layer" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      <header className="theme-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-4 md:px-8 xl:px-12">
          <a className="flex items-center gap-3 font-[Space_Grotesk] text-xl font-bold tracking-tight" href="#top">
            <span className="theme-brand-badge flex h-10 w-10 items-center justify-center rounded-full text-base font-bold">RS</span>
            <span>Risanth</span>
          </a>

          <nav className="hidden items-center gap-9 md:flex xl:gap-11">
            {navItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="theme-nav-link theme-nav-link-animated text-[1.03rem] font-medium">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <a className="theme-btn-primary rounded-full px-5 py-2 text-sm font-semibold" href="/skills/Resume_Risanth.pdf" download="Resume_Risanth.pdf">
              Resume
            </a>
            <button
              type="button"
              className="theme-switch relative h-8 w-14 rounded-full border"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span className={`theme-switch-thumb ${theme === 'light' ? 'theme-switch-thumb-light' : ''}`}>
                {theme === 'light' ? (
                  <svg className="theme-switch-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="5.2" fill="#f39a1f" />
                    <g stroke="#ffd36a" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="12" y1="2.8" x2="12" y2="5.2" />
                      <line x1="12" y1="18.8" x2="12" y2="21.2" />
                      <line x1="2.8" y1="12" x2="5.2" y2="12" />
                      <line x1="18.8" y1="12" x2="21.2" y2="12" />
                      <line x1="5.6" y1="5.6" x2="7.3" y2="7.3" />
                      <line x1="16.7" y1="16.7" x2="18.4" y2="18.4" />
                      <line x1="16.7" y1="7.3" x2="18.4" y2="5.6" />
                      <line x1="5.6" y1="18.4" x2="7.3" y2="16.7" />
                    </g>
                  </svg>
                ) : (
                  <svg className="theme-switch-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="11.5" r="6.4" fill="#ffcb59" />
                    <circle cx="13.2" cy="9.2" r="6.8" fill="#0f2b6b" />
                  </svg>
                )}
              </span>
            </button>
          </div>

          <button
            type="button"
            className="theme-menu-btn rounded-full border px-4 py-1.5 text-sm font-semibold md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
          >
            Menu
          </button>

          <nav
            className={`${menuOpen ? 'flex' : 'hidden'} theme-nav absolute right-3 top-16 z-50 w-72 flex-col rounded-2xl border p-4 text-sm md:hidden`}
          >
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="theme-nav-link theme-nav-link-animated font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                className="theme-switch relative h-8 w-14 rounded-full border"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className={`theme-switch-thumb ${theme === 'light' ? 'theme-switch-thumb-light' : ''}`}>
                  {theme === 'light' ? (
                    <svg className="theme-switch-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="5.2" fill="#f39a1f" />
                      <g stroke="#ffd36a" strokeWidth="1.8" strokeLinecap="round">
                        <line x1="12" y1="2.8" x2="12" y2="5.2" />
                        <line x1="12" y1="18.8" x2="12" y2="21.2" />
                        <line x1="2.8" y1="12" x2="5.2" y2="12" />
                        <line x1="18.8" y1="12" x2="21.2" y2="12" />
                        <line x1="5.6" y1="5.6" x2="7.3" y2="7.3" />
                        <line x1="16.7" y1="16.7" x2="18.4" y2="18.4" />
                        <line x1="16.7" y1="7.3" x2="18.4" y2="5.6" />
                        <line x1="5.6" y1="18.4" x2="7.3" y2="16.7" />
                      </g>
                    </svg>
                  ) : (
                    <svg className="theme-switch-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="10.5" cy="11.5" r="6.4" fill="#ffcb59" />
                      <circle cx="13.2" cy="9.2" r="6.8" fill="#0f2b6b" />
                    </svg>
                  )}
                </span>
              </button>
              <a className="theme-btn-primary rounded-full px-4 py-2 text-center font-semibold" href="/skills/Resume_Risanth.pdf" download="Resume_Risanth.pdf">
                Resume
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto w-[min(1120px,94%)] pb-28 pt-8 md:pt-16">
        <section className="grid min-h-[78vh] items-center gap-8 py-4 md:grid-cols-[1.15fr_0.85fr] md:py-8">
          <div>
            <p className="theme-eyebrow mb-3 text-xs font-semibold uppercase tracking-[0.26em]">Software Developer</p>
            <h1 className="font-[Space_Grotesk] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-[3.1rem]">
              Building user-focused web products that ship.
            </h1>
            <p className="theme-muted mt-5 max-w-2xl text-base leading-7 md:text-lg">
              I am Risanth, a full-stack developer actively seeking co-op opportunities. I build clean, scalable
              applications and practical AI features that solve real user problems.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#projects" className="theme-btn-primary rounded-full px-5 py-2.5 font-semibold">
                View Projects
              </a>
              <a href="/skills/Resume_Risanth.pdf" download="Resume_Risanth.pdf" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
                Download Resume
              </a>
              <a href="#contact" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
                Contact
              </a>
            </div>
          </div>

          <div className="theme-panel relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden rounded-3xl border p-6 sm:min-h-[500px]">
            <div className="theme-glow absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" />
            <div className="h-56 w-56 overflow-hidden rounded-full border-2 border-amber-300/60 bg-gradient-to-br from-slate-700 to-slate-900 shadow-[0_0_40px_rgba(88,166,255,0.35)] sm:h-64 sm:w-64">
              <img src={profileImage} alt="Risanth profile" className="h-full w-full object-cover" />
            </div>
            <div className="mt-6 w-full space-y-4 text-center sm:mt-8">
              <p className="font-[Space_Grotesk] text-lg font-semibold sm:text-xl">Risanth | Full-Stack Developer</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  35% ORGANIC TRAFFIC GROWTH (SEO + ANALYTICS)
                </span>
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  30% FEWER FOLLOW-UPS (BOOKING AUTOMATION)
                </span>
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  WORDPRESS MIGRATIONS + RESPONSIVE REDESIGNS
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Actively Seeking Co-op</span>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Toronto, ON</span>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Available 2026</span>
              </div>
              <p className="theme-muted mx-auto max-w-[28ch] text-sm leading-6">
                Focused on scalable web apps, backend systems, and practical AI solutions.
              </p>
            </div>
          </div>
        </section>        <SkillsGlobe theme={theme} />

        <section id="about" className="pt-20">
          <p className="theme-eyebrow text-center text-xs font-semibold uppercase tracking-[0.22em]">About</p>
          <h2 className="mx-auto mt-4 max-w-5xl pb-4 text-center font-[Space_Grotesk] text-4xl font-bold leading-[1.22] tracking-tight sm:text-5xl md:text-[3.6rem]">
            Software Engineering Co-op student
            <span className="block pt-1 pb-2 bg-gradient-to-r from-amber-300 via-amber-200 to-blue-300 bg-clip-text text-transparent">
              delivering measurable web impact
            </span>
          </h2>

          <p className="theme-muted mx-auto mt-5 max-w-3xl text-center text-base leading-8 md:text-lg">
            Ontario Tech Software Engineering Co-op student building scalable, user-focused web products.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">🎓</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">University</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Ontario Tech University</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                BEng Software Engineering Co-op (Honours), Sep 2023 - Apr 2027. Focused on algorithms, databases, AI,
                software design, and web development.
              </p>
            </article>

            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">💼</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Experience</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Full-Stack + Operations</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Built full-stack products at ConnectToTalent and TandemTeach using React, Next.js, Node.js, and
                PostgreSQL. Also work at Walmart, supporting fast-paced operations and safety standards.
              </p>
            </article>

            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">📈</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Projects</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Recent Full-Stack Projects</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Built RotateOps for workflow automation, a Leave-Of-Absence Dashboard with Flask + PostgreSQL, and
                Solora Tech with React/Next.js/Tailwind for scalable, high-performance web experiences.
              </p>
            </article>
          </div>
        </section>

        <section id="projects" className="pt-20">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">
              <span className="text-current">Selected </span>
              <span className="skills-title-accent">Projects</span>
            </h2>
            <a href="https://github.com/risanth14?tab=repositories" target="_blank" rel="noreferrer" className="theme-link text-sm font-semibold">
              View all {GITHUB_USER} repositories
            </a>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
            <article className="theme-panel flex h-[774px] flex-col rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-[Space_Grotesk] text-lg font-semibold">Repositories</h3>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">{totalRepoCount}</span>
              </div>

              <div className="project-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {loadingProjects && <p className="theme-muted text-sm">Loading repositories...</p>}
                {!loadingProjects && projectsError && <p className="text-sm text-amber-500">{projectsError}</p>}
                {!loadingProjects && !projectsError && repos.length === 0 && (
                  <p className="theme-muted text-sm">No public repositories found.</p>
                )}

                {!loadingProjects &&
                  !projectsError &&
                  repos.map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="theme-sub-panel block rounded-xl border px-3 py-2.5 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-[Space_Grotesk] text-[1.1rem] font-semibold leading-tight">{repo.name}</p>
                        <div className="flex items-center gap-2">
                          {repo.isPinned && (
                            <span className="theme-chip rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                              Pinned
                            </span>
                          )}
                          <span className="theme-muted text-xs">* {repo.stargazers_count}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {repo.topLanguages.map((lang) => (
                          <span key={`${repo.id}-${lang}`} className="theme-muted inline-flex items-center gap-1">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: languageColor(lang) }}
                              aria-hidden="true"
                            />
                            {lang}
                          </span>
                        ))}
                        {repo.topLanguages.length === 0 && (
                          <span className="theme-muted inline-flex items-center gap-1">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" aria-hidden="true" />
                            Mixed
                          </span>
                        )}
                        <span className="theme-muted">-</span>
                        <span className="theme-muted">{formatRelativeDate(repo.updated_at)}</span>
                      </div>
                    </a>
                  ))}
              </div>
            </article>

            <div className="grid h-[774px] gap-3 md:grid-cols-2 md:grid-rows-3">
              {!loadingProjects &&
                !projectsError &&
                featuredRepos.map((repo) => (
                  <article key={repo.id} className="theme-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 pr-2 font-[Space_Grotesk] text-[1.35rem] leading-tight font-semibold">
                        {repo.name}
                      </h3>
                      {repo.isPinned && (
                        <span className="theme-chip rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-amber-300">
                      {repo.stargazers_count} stars, {repo.forks_count} forks, {repo.language || 'Mixed'}
                    </p>
                    <p className="theme-muted mt-2 line-clamp-2 min-h-10 text-sm leading-5">
                      {repo.description || 'No description available yet.'}
                    </p>
                    <div className="mt-3 flex flex-wrap content-start gap-2 text-xs">
                      {(repo.topLanguages.length ? repo.topLanguages : [repo.language || 'Mixed']).slice(0, 3).map((lang) => (
                        <span key={`${repo.id}-tile-${lang}`} className="theme-chip rounded-full border px-3 py-1">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: languageColor(lang) }}
                              aria-hidden="true"
                            />
                            {lang}
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <span className="theme-muted text-xs">Updated {formatRelativeDate(repo.updated_at)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRepo(repo)}
                        className="theme-btn-outline rounded-full border px-4 py-2 text-xs font-semibold"
                      >
                        Click For Details
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </section>

        <section id="experience" className="pt-20">
          <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">Experience & Education</h2>
          <div className="mt-6 space-y-4">
            {timeline.map((item) => (
              <article key={item.heading} className="theme-panel rounded-2xl border p-5">
                <h3 className="font-[Space_Grotesk] text-lg font-semibold">{item.heading}</h3>
                <p className="theme-muted mt-2 text-sm leading-6">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="pt-20">
          <div className="theme-panel rounded-3xl border p-6 md:p-8">
            <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">Let&apos;s work together.</h2>
            <p className="theme-muted mt-3 max-w-2xl">
              If you are hiring, collaborating, or building something ambitious, I would love to connect.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="mailto:youremail@example.com" className="theme-btn-primary rounded-full px-5 py-2.5 font-semibold">
                Email Me
              </a>
              <a href="https://github.com/risanth14" target="_blank" rel="noreferrer" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
                GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {selectedRepo && (
        <div className="fixed inset-0 z-[70] bg-[rgba(2,8,24,0.72)] backdrop-blur-sm" onClick={() => setSelectedRepo(null)}>
          <section
            className="theme-panel mx-auto mt-[8vh] w-[min(760px,92vw)] rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="theme-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {selectedRepo.isPinned ? 'Pinned Project' : 'Project'}
                </p>
                <h3 className="mt-1 font-[Space_Grotesk] text-4xl font-bold leading-tight">{selectedRepo.name}</h3>
                <p className="mt-2 text-sm font-semibold text-amber-300">
                  {selectedRepo.stargazers_count} stars, {selectedRepo.forks_count} forks, {selectedRepo.language || 'Mixed'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepo(null)}
                className="theme-btn-outline rounded-xl border px-3 py-1 text-sm font-semibold"
              >
                X
              </button>
            </div>

            <p className="theme-muted text-sm leading-7">
              {selectedRepo.description || 'No description available yet. Open the repository for full details.'}
            </p>

            <div className="mt-5">
              <p className="theme-muted text-[11px] font-semibold uppercase tracking-[0.18em]">Languages</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedRepo.topLanguages.length ? selectedRepo.topLanguages : [selectedRepo.language || 'Mixed']).map((lang) => (
                  <span key={`modal-lang-${selectedRepo.id}-${lang}`} className="theme-chip rounded-full border px-3 py-1 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: languageColor(lang) }}
                        aria-hidden="true"
                      />
                      {lang}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <p className="theme-muted text-xs">Updated {formatRelativeDate(selectedRepo.updated_at)}</p>
              <a href={selectedRepo.html_url} target="_blank" rel="noreferrer" className="theme-btn-primary rounded-full px-5 py-2 text-sm font-semibold">
                View On GitHub
              </a>
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setChatOpen((open) => !open)}
        className="theme-btn-primary fixed bottom-5 right-5 z-50 rounded-full px-5 py-2.5 text-sm font-bold shadow-[0_14px_35px_rgba(0,0,0,0.4)]"
      >
        AI Chat
      </button>

      {chatOpen && (
        <section className="theme-panel fixed bottom-20 right-4 z-50 w-[min(380px,calc(100%-1.5rem))] overflow-hidden rounded-2xl border shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
          <div className="theme-border flex items-center justify-between border-b px-4 py-3">
            <strong className="font-[Space_Grotesk] text-sm">Portfolio AI Assistant</strong>
            <button type="button" onClick={() => setChatOpen(false)} className="theme-btn-outline rounded-full border px-2.5 py-1 text-xs">
              Close
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl px-3 py-2 text-sm leading-6 ${
                  message.role === 'user' ? 'theme-chat-user ml-10 text-right' : 'theme-chat-bot mr-10'
                }`}
              >
                {message.content}
              </div>
            ))}
            {chatBusy && <div className="theme-chat-bot mr-10 rounded-xl px-3 py-2 text-sm">Thinking...</div>}
          </div>

          <form onSubmit={onSendMessage} className="theme-border grid grid-cols-[1fr_auto] gap-2 border-t p-3">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about skills, projects, or experience..."
              className="theme-input rounded-xl border px-3 py-2 text-sm outline-none"
            />
            <button type="submit" disabled={chatBusy} className="theme-btn-primary rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60">
              Send
            </button>
          </form>

          <details className="theme-border border-t px-3 py-2">
            <summary className="theme-muted cursor-pointer text-xs">Set OpenAI API key (optional)</summary>
            <div className="mt-2 flex gap-2">
              <input
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                type="password"
                placeholder="sk-..."
                className="theme-input w-full rounded-xl border px-3 py-2 text-xs outline-none"
              />
              <button type="button" onClick={saveApiKey} className="theme-btn-outline rounded-xl border px-3 py-2 text-xs font-semibold">
                Save
              </button>
            </div>
          </details>
        </section>
      )}

      <footer className="theme-border border-t py-6 text-center text-sm">
        <p className="theme-muted">Copyright {currentYear} Risanth. Built with React, TypeScript, Tailwind CSS, and intention.</p>
      </footer>
    </div>
  )
}

export default App






// Testing commit for Vercel integration.
