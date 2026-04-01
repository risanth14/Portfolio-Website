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
type ContactStatus = 'idle' | 'sending' | 'success' | 'error'

type ChatMessage = {
  id: number
  role: ChatRole
  content: string
}

const GITHUB_USER = 'risanth14'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjgpovgp'
const THEME_STORAGE = 'portfolio_theme_mode'
const PROJECT_REFRESH_MS = 60_000

type GithubReposApiResponse = {
  repos: Array<Repo & {
    top_languages?: string[]
    is_pinned?: boolean
    pinned_index?: number | null
  }>
  pinned_order?: string[]
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

const experienceTimeline = [
  {
    id: 'exp-01',
    company: 'SGMC Canada',
    location: 'Toronto, ON',
    period: 'Jan 2026 - Apr 2026',
    bullets: [
      'Engineered a full-stack recruitment platform using Next.js, React, Node.js, and PostgreSQL for onboarding, role-based access, and dashboard workflows.',
      'Integrated Stripe payments and deployed services on AWS (EC2, S3) to support secure transactions and reliable release cycles.',
      'Optimized backend APIs and query paths to improve responsiveness and scalability across core user workflows.',
    ],
    tags: ['Next.js', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Stripe'],
  },
  {
    id: 'exp-02',
    company: 'Solora Tech',
    location: 'Toronto, ON',
    period: 'Sep 2025 - Dec 2025',
    bullets: [
      'Developed and shipped a scalable full-stack platform using React, Node.js, and Express with a production-ready UI.',
      'Designed and optimized REST APIs plus backend data flows to reduce latency and improve application responsiveness.',
      'Partnered across frontend and backend to deliver reliable end-to-end feature integration and stable releases.',
    ],
    tags: ['React', 'Node.js', 'Express', 'REST APIs'],
  },
  {
    id: 'exp-03',
    company: 'LEX Marketing Inc.',
    location: 'Toronto, ON',
    period: 'May 2025 - Aug 2025',
    bullets: [
      'Redesigned client websites with modern UI/UX principles to improve usability and engagement.',
      'Migrated sites from Weebly to WordPress, streamlining content workflows and improving maintainability.',
      'Improved mobile responsiveness and SEO foundations for better performance and accessibility across devices.',
    ],
    tags: ['WordPress', 'SEO', 'Responsive Design', 'UI/UX'],
  },
  {
    id: 'exp-04',
    company: 'Brazily Fitness Inc.',
    location: 'Toronto, ON',
    period: 'Jan 2025 - Apr 2025',
    bullets: [
      'Built and launched a promotional website that highlighted services, class content, and booking pathways.',
      'Refined site architecture, visual hierarchy, and content layout to improve navigation clarity and conversion flow.',
      'Strengthened technical SEO, page consistency, and handoff documentation to support long-term maintainability.',
    ],
    tags: ['Front-End Development', 'SEO', 'Web Content Strategy'],
  },
  {
    id: 'exp-05',
    company: 'Walmart',
    location: 'Whitby, ON',
    period: 'Sep 2024 - Present',
    bullets: [
      'Coordinated inbound freight unloading, pallet staging, and cross-department stocking to keep daily floor operations on schedule.',
      'Maintained inventory accuracy through disciplined overstock labeling, shelf placement, and backroom organization standards.',
      'Consistently supported safety-first execution in a fast-paced environment while collaborating effectively across teams.',
    ],
    tags: ['Operations', 'Inventory Control', 'Team Collaboration', 'Safety'],
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
  const [selectedRepo, setSelectedRepo] = useState<RepoView | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactStatus, setContactStatus] = useState<ContactStatus>('idle')
  const [contactStatusText, setContactStatusText] = useState('')
  const cursorBubbleRef = useRef<HTMLDivElement | null>(null)
  const cursorDotRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLElement | null>(null)
  const menuToggleRef = useRef<HTMLButtonElement | null>(null)
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

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (mobileMenuRef.current?.contains(target)) return
      if (menuToggleRef.current?.contains(target)) return
      setMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])
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

      const featuredRaw = pinnedRepos.slice(0, 6)
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    })

    let data: { answer?: string; detail?: string; error?: string } = {}
    try {
      data = (await response.json()) as { answer?: string; detail?: string; error?: string }
    } catch {
      data = {}
    }

    if (!response.ok) {
      throw new Error(data.detail || data.error || `Chat API error ${response.status}`)
    }

    return data.answer?.trim() ?? null
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
    } catch (error) {
      console.error(error)
      const detail = error instanceof Error ? error.message : ''
      pushMessage('bot', detail ? `Chat service issue: ${detail}` : localReply(trimmed))
    } finally {
      setChatBusy(false)
    }
  }

  async function onSubmitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (contactStatus === 'sending') return

    const trimmedName = contactName.trim()
    const trimmedEmail = contactEmail.trim()
    const trimmedMessage = contactMessage.trim()

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setContactStatus('error')
      setContactStatusText('Please fill out your name, email, and message.')
      return
    }

    setContactStatus('sending')
    setContactStatusText('Sending message...')

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          subject: 'New portfolio contact form message',
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      })

      let payload: { message?: string; errors?: Array<{ message?: string }>; error?: string; detail?: string } | null = null
      try {
        payload = (await response.json()) as { message?: string; errors?: Array<{ message?: string }>; error?: string; detail?: string }
      } catch {
        payload = null
      }

      if (!response.ok) {
        const detail =
          payload?.errors?.[0]?.message ||
          payload?.message ||
          payload?.detail ||
          payload?.error ||
          `status ${response.status}`
        throw new Error(`Form submit failed: ${detail}`)
      }

      setContactName('')
      setContactEmail('')
      setContactMessage('')
      setContactStatus('success')
      setContactStatusText('Message sent successfully. I will get back to you soon.')
    } catch (error) {
      console.error(error)
      setContactStatus('error')
      const detail = error instanceof Error ? error.message : 'Could not send message right now.'
      setContactStatusText(`Could not send message. ${detail}`)
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
              <a key={item.id} href={`#${item.id}`} className="theme-nav-link theme-nav-link-animated font-[Space_Grotesk] text-[1.03rem] font-medium">
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
              ref={menuToggleRef}
              className="theme-menu-btn rounded-full border px-4 py-1.5 text-sm font-semibold md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
            >
              Menu
            </button>

            <nav
              ref={mobileMenuRef}
              className={`${menuOpen ? 'flex' : 'hidden'} theme-nav theme-nav-mobile absolute left-3 right-3 top-[calc(100%+0.65rem)] z-50 flex-col rounded-2xl border p-4 text-sm md:hidden`}
            >
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="theme-nav-link theme-nav-mobile-link font-[Space_Grotesk] font-medium"
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
              <a href="/skills/Resume_Risanth.pdf" target="_blank" rel="noreferrer" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
                View Resume
              </a>
              <a href="#contact" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
                Contact
              </a>
            </div>
          </div>

          <div className="theme-panel relative flex min-h-[460px] flex-col items-center justify-center overflow-hidden rounded-3xl border p-6 sm:min-h-[500px]">
            <div className="theme-glow absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" />
            <div className="profile-avatar-ring h-56 w-56 sm:h-64 sm:w-64">
              <div className="profile-avatar-wrap h-full w-full overflow-hidden rounded-full border-2 border-amber-300/60 bg-gradient-to-br from-slate-700 to-slate-900">
                <img src={profileImage} alt="Risanth profile" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="mt-6 w-full space-y-4 text-center sm:mt-8">
              <p className="font-[Space_Grotesk] text-lg font-semibold sm:text-xl">Risanth | Full-Stack Developer</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  35% HIGHER TRANSACTION SUCCESS (STRIPE + AWS)
                </span>
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  FULL-STACK PLATFORM DELIVERY (REACT/NODE/EXPRESS)
                </span>
                <span className="theme-chip whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.08em] sm:text-xs">
                  WORKFLOW + AI BUILDS (ROTATEOPS/NOVAPREP/FORGEFIT)
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Actively Seeking Co-op</span>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Toronto, ON</span>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">Available 2026</span>
              </div>
              <p className="theme-muted mx-auto max-w-[42ch] text-sm leading-6">
                Focused on scalable full-stack systems, API performance, and practical AI-powered products.
              </p>
            </div>
          </div>
        </section>

        <a href="#about" className="scroll-explore scroll-explore-float group mx-auto mt-4 mb-8 flex w-fit flex-col items-center gap-1.5">
          <span className="theme-muted text-sm font-semibold uppercase tracking-[0.24em]">Scroll To Explore</span>
          <span className="text-2xl text-slate-200 transition-colors group-hover:text-amber-300" aria-hidden="true">
            ↓
          </span>
        </a>

        <section id="about" className="pt-20">
          <p className="theme-eyebrow text-center text-xs font-semibold uppercase tracking-[0.22em]">About</p>
          <h2 className="mx-auto mt-4 max-w-5xl pb-4 text-center font-[Space_Grotesk] text-4xl font-bold leading-[1.22] tracking-tight sm:text-5xl md:text-[3.6rem]">
            Software Engineering Co-op student
            <span className="block pt-1 pb-2 bg-gradient-to-r from-amber-300 via-amber-200 to-blue-300 bg-clip-text text-transparent">
              building scalable full-stack products
            </span>
          </h2>

          <p className="theme-muted mx-auto mt-5 max-w-3xl text-center text-base leading-8 md:text-lg">
            Ontario Tech BEng (Software Engineering Co-op) student with hands-on full-stack experience across React,
            Next.js, Node.js, Express, and PostgreSQL.
          </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="theme-panel about-glow-card rounded-3xl border p-6">
              <p className="text-xl">🎓</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">University</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Ontario Tech University</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                BEng Software Engineering Co-op (Honours), Sep 2023 - Apr 2027. Focused on algorithms, databases, AI,
                software design, and web development.
              </p>
            </article>

              <article className="theme-panel about-glow-card rounded-3xl border p-6">
              <p className="text-xl">💼</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Experience</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Full-Stack Development</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Built production web platforms at SGMC Canada, Solora Tech, and LEX Marketing using React, Next.js,
                Node.js, Express, PostgreSQL, and AWS.
              </p>
            </article>

              <article className="theme-panel about-glow-card rounded-3xl border p-6">
              <p className="text-xl">📈</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Projects</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Recent Full-Stack Projects</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Built RotateOps, NovaPrep, and ForgeFit with React/Node.js, Supabase, Express, and OpenAI APIs to
                improve workflow automation, adaptive learning, and personalized fitness insights.
              </p>
            </article>
          </div>
        </section>

        <SkillsGlobe theme={theme} />

        <section id="projects" className="pt-20">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">
                <span className="text-current">Selected </span>
                <span className="skills-title-accent">Projects</span>
              </h2>
              <p className="mt-2 font-mono text-sm">
                <span className="text-emerald-300">risanth14</span>
                <span className="theme-muted">@github</span>
                <span className="text-slate-200">:~ </span>
                <span className="text-amber-300">$</span>
                <span className="text-slate-100"> ls -la ~/projects</span>
                <span
                  className="ml-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full align-[-2px] bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.95)]"
                  aria-hidden="true"
                />
              </p>
            </div>
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

            <div className="grid gap-3 md:h-[774px] md:grid-cols-2 md:grid-rows-3">
              {!loadingProjects &&
                !projectsError &&
                featuredRepos.map((repo) => (
                  <article key={repo.id} className="theme-panel flex h-auto flex-col rounded-2xl border p-4 md:h-full md:min-h-0 md:overflow-hidden">
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
        </section>        <section id="experience" className="pt-20">
          <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">
            <span className="text-current">Work </span>
            <span className="skills-title-accent">Experience</span>
          </h2>
          <div className="relative mt-6 space-y-4 md:space-y-7">
            <div
              className="timeline-spine absolute bottom-0 left-1/2 top-0 hidden w-[5px] -translate-x-1/2 md:block"
              aria-hidden="true"
            />
            {experienceTimeline.map((item, index) => {
              const isLeft = index % 2 === 0
              return (
                <div key={item.id} className="relative md:grid md:grid-cols-2 md:gap-10">
                  <span
                    className="timeline-node absolute left-1/2 top-8 hidden h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-[#041335] md:block"
                    aria-hidden="true"
                  />
                  <div className={isLeft ? 'md:col-start-1' : 'hidden md:block'} />
                  <article className={`theme-panel rounded-2xl border p-5 ${isLeft ? 'md:col-start-1' : 'md:col-start-2'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">{item.id}</p>
                      <p className="theme-muted text-sm font-semibold">{item.period}</p>
                    </div>
                    <h3 className="mt-3 font-[Space_Grotesk] text-2xl font-semibold">{item.company}</h3>
                    <p className="theme-muted mt-1 text-sm font-semibold">{item.location}</p>
                    <ul className="theme-muted mt-4 list-disc space-y-2 pl-5 text-sm leading-7 marker:text-slate-300">
                      {item.bullets.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="theme-chip rounded-full border px-3 py-1 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        </section>

        <section id="contact" className="pt-20">
          <h2 className="font-[Space_Grotesk] text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            <span className="text-current">Let&apos;s work </span>
            <span className="skills-title-accent">together</span>
          </h2>
          <p className="theme-muted mt-5 max-w-3xl text-lg leading-9">
            Seeking Software Engineering co-op opportunities for upcoming terms. Based in Toronto and open to remote,
            hybrid, or relocation roles.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="theme-panel rounded-3xl border p-7">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/35 bg-blue-500/10 text-blue-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M6.94 8.5H3.56V20h3.38V8.5Zm-1.69-1.54a1.96 1.96 0 1 0 0-3.92 1.96 1.96 0 0 0 0 3.92ZM20.44 20v-6.16c0-3.3-1.76-4.84-4.1-4.84-1.89 0-2.74 1.04-3.22 1.77V8.5H9.75c.04 1.5 0 11.5 0 11.5h3.37v-6.42c0-.34.02-.67.13-.91.27-.67.89-1.36 1.94-1.36 1.37 0 1.92 1.04 1.92 2.56V20h3.33Z" />
                </svg>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">LinkedIn</p>
              <p className="mt-3 font-[Space_Grotesk] text-[1.55rem] font-bold leading-none">risanth-sivarajah</p>
              <a
                href="https://www.linkedin.com/in/risanth-sivarajah/"
                target="_blank"
                rel="noreferrer"
                className="theme-btn-outline mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Connect With Me
                <span aria-hidden="true">↗</span>
              </a>
            </article>

            <article className="theme-panel rounded-3xl border p-7">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-400/30 bg-slate-400/10 text-slate-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.51 1 .1-.78.42-1.31.76-1.61-2.66-.31-5.46-1.33-5.46-5.92 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.55.12-3.22 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.67.24 2.92.12 3.22.77.84 1.24 1.92 1.24 3.23 0 4.6-2.8 5.61-5.47 5.91.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.58A12 12 0 0 0 12 .5Z" />
                </svg>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">GitHub</p>
              <p className="mt-3 font-[Space_Grotesk] text-[1.55rem] font-bold leading-none">risanth14</p>
              <a
                href="https://github.com/risanth14"
                target="_blank"
                rel="noreferrer"
                className="theme-btn-outline mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                View Repos
                <span aria-hidden="true">↗</span>
              </a>
            </article>

            <article className="theme-panel rounded-3xl border p-7">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M6.62 10.79a15.54 15.54 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1-.24 11.3 11.3 0 0 0 3.54.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.3 11.3 0 0 0 .56 3.54 1 1 0 0 1-.24 1l-2.2 2.25Z" />
                </svg>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Phone</p>
              <p className="mt-3 font-[Space_Grotesk] text-[1.55rem] font-bold leading-none">647-781-8615</p>
              <a href="tel:+16477818615" className="theme-btn-outline mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                Call Me
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          </div>

          <div className="theme-panel mt-6 rounded-3xl border p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Send Direct Email</p>
            <p className="theme-muted mt-3">Use this form to send me a message at risanth14@gmail.com.</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmitContactForm}>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Your name"
                  className="theme-input rounded-2xl border px-4 py-3 text-sm outline-none"
                />
                <input
                  type="email"
                  name="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="Your email"
                  className="theme-input rounded-2xl border px-4 py-3 text-sm outline-none"
                />
              </div>
              <textarea
                name="message"
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                placeholder="Your message"
                rows={6}
                className="theme-input w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={contactStatus === 'sending'} className="theme-btn-primary rounded-full px-6 py-2.5 font-semibold disabled:opacity-60">
                  {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
                {contactStatusText && (
                  <p className={`text-sm ${contactStatus === 'success' ? 'text-emerald-300' : contactStatus === 'error' ? 'text-rose-300' : 'text-cyan-200'}`}>
                    {contactStatusText}
                  </p>
                )}
              </div>
            </form>
          </div>
          <div className="theme-muted mt-5 text-sm">
            Available for 2026 opportunities - Toronto, ON - Open to remote and relocation.
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
        aria-label={chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
        className="chat-fab theme-btn-primary fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_35px_rgba(0,0,0,0.4)]"
      >
        <span className="chat-fab-ring" aria-hidden="true" />
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" aria-hidden="true">
          <path
            d="M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v3l3.8-3H20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 12H10l-1.5 1.2L7 18v-2H4V6h16v10Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {chatOpen && (
        <section className="theme-panel fixed bottom-20 right-4 z-50 flex h-[min(620px,calc(100vh-7rem))] w-[min(460px,calc(100%-1rem))] flex-col overflow-hidden rounded-2xl border shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
          <div className="theme-border flex items-center justify-between border-b px-5 py-3.5">
            <strong className="font-[Space_Grotesk] text-sm">Portfolio AI Assistant</strong>
            <button type="button" onClick={() => setChatOpen(false)} className="theme-btn-outline rounded-full border px-2.5 py-1 text-xs">
              Close
            </button>
          </div>

          <div className="project-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`w-fit max-w-[72%] rounded-lg px-2.5 py-1.5 text-[14px] leading-6 ${
                  message.role === 'user' ? 'theme-chat-user ml-auto text-right' : 'theme-chat-bot mr-auto'
                }`}
              >
                {message.content}
              </div>
            ))}
            {chatBusy && <div className="theme-chat-bot mr-auto w-fit max-w-[72%] rounded-lg px-2.5 py-1.5 text-[14px] leading-6">Thinking...</div>}
          </div>

          <form onSubmit={onSendMessage} className="theme-border grid grid-cols-[1fr_auto] gap-2 border-t p-3.5">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about skills, projects, or experience..."
              className="theme-input rounded-xl border px-3 py-2.5 text-[15px] leading-6 outline-none"
            />
            <button type="submit" disabled={chatBusy} className="theme-btn-primary rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60">
              Send
            </button>
          </form>

        </section>
      )}

      <footer className="theme-border border-t py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 text-xs font-semibold uppercase tracking-[0.16em] md:px-8 xl:px-12">
          <span className="text-amber-300">RS</span>
          <span className="theme-muted">•</span>
          <span className="theme-muted">© {currentYear} Risanth Sivarajah</span>
          <a href="https://github.com/risanth14" target="_blank" rel="noreferrer" className="theme-muted hover:text-slate-100 transition-colors">
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/risanth-sivarajah/" target="_blank" rel="noreferrer" className="theme-muted hover:text-slate-100 transition-colors">
            LinkedIn
          </a>
          <a href="mailto:risanth14@gmail.com" className="theme-muted hover:text-slate-100 transition-colors">
            Email
          </a>
          <span className="theme-muted">•</span>
          <span className="theme-muted">Risanth Sivarajah</span>
          <a href="#top" className="theme-muted hover:text-slate-100 transition-colors">
            Back To Top ↑
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App






// Testing commit for Vercel integration.

