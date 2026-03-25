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
  stargazers_count: number
  language: string | null
  updated_at: string
  fork: boolean
  owner: {
    login: string
  }
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
    text: 'The projects section pulls repositories from GitHub and highlights the most active work with direct repo/live links.',
  },
  {
    trigger: ['experience', 'education', 'background'],
    text: 'Risanth has a strong software development and computer science foundation, focused on practical product delivery.',
  },
]

function App() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [featuredRepos, setFeaturedRepos] = useState<Repo[]>([])
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
  const cursorRef = useRef<HTMLDivElement | null>(null)
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
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const cursor = cursorRef.current
    if (!cursor) return

    let rafId = 0
    let currentX = -100
    let currentY = -100
    let targetX = -100
    let targetY = -100

    const animate = () => {
      currentX += (targetX - currentX) * 0.14
      currentY += (targetY - currentY) * 0.14
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      rafId = requestAnimationFrame(animate)
    }

    const moveCursor = (event: PointerEvent) => {
      targetX = event.clientX - 20
      targetY = event.clientY - 20
      cursor.style.opacity = '1'
    }

    const hideCursor = () => {
      cursor.style.opacity = '0'
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
      const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=20`)

      if (!response.ok) {
        throw new Error(`GitHub error ${response.status}`)
      }

      const data = (await response.json()) as Repo[]
      const userRepos = data.filter((repo) => !repo.fork && repo.owner?.login?.toLowerCase() === GITHUB_USER)
      const featured = [...userRepos]
        .sort(
          (a, b) =>
            b.stargazers_count - a.stargazers_count ||
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 6)

      setRepos(userRepos)
      setFeaturedRepos(featured)
      setProjectsError('')
    } catch {
      setProjectsError('Could not load projects from GitHub right now.')
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
      <div ref={cursorRef} className="cursor-orb hidden md:block" aria-hidden="true">
        <span className="cursor-dot" />
      </div>

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
            <a className="theme-btn-primary rounded-full px-5 py-2 text-sm font-semibold" href="/Resume_Risanth.pdf" target="_blank" rel="noreferrer">
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
              <a className="theme-btn-primary rounded-full px-4 py-2 text-center font-semibold" href="/Resume_Risanth.pdf" target="_blank" rel="noreferrer">
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
            <h1 className="font-[Space_Grotesk] text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl md:text-6xl">
              Building AI-ready products and backend systems that ship.
            </h1>
            <p className="theme-muted mt-5 max-w-2xl text-base leading-7 md:text-lg">
              I am Risanth, a full-stack developer actively seeking co-op opportunities. I build clean, scalable
              applications and practical AI features that solve real user problems.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#projects" className="theme-btn-primary rounded-full px-5 py-2.5 font-semibold">
                View Projects
              </a>
              <a href="/Resume_Risanth.pdf" target="_blank" rel="noreferrer" className="theme-btn-outline rounded-full border px-5 py-2.5 font-semibold">
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
          <h2 className="mx-auto mt-4 max-w-5xl pb-2 text-center font-[Space_Grotesk] text-4xl font-bold leading-[1.16] tracking-tight sm:text-5xl md:text-[3.6rem]">
            Software Engineering Co-op student
            <span className="block bg-gradient-to-r from-amber-300 via-amber-200 to-blue-300 bg-clip-text text-transparent">
              delivering measurable web impact
            </span>
          </h2>

          <p className="theme-muted mx-auto mt-5 max-w-3xl text-center text-base leading-8 md:text-lg">
            Ontario Tech Software Engineering student building maintainable web applications with measurable results,
            including 35% traffic growth and 30% fewer manual follow-ups.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">🎓</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">University</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Ontario Tech University</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Bachelor of Engineering in Software Engineering Co-op (Honours), with coursework across algorithms,
                data structures, databases, AI, and web programming.
              </p>
            </article>

            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">💼</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Experience</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Web Development + Operations</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Delivered production website improvements at Lex Marketing Inc and Dancing DJ Andre, and currently work
                at Walmart where I support fast-paced operations with consistency, safety, and execution discipline.
              </p>
            </article>

            <article className="theme-panel rounded-3xl border p-6">
              <p className="text-xl">📈</p>
              <h3 className="mt-4 font-[Space_Grotesk] text-2xl font-semibold">Projects</h3>
              <p className="theme-muted mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Full-Stack Builds</p>
              <p className="theme-muted mt-4 text-sm leading-7">
                Built projects like Forge Fit (React + Firebase), a Flask leave-of-absence dashboard with PostgreSQL,
                and a browser-based version control editor with undo/redo and snapshot history.
              </p>
            </article>
          </div>
        </section>

        <section id="projects" className="pt-20">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-[Space_Grotesk] text-3xl font-bold md:text-4xl">Selected Projects</h2>
            <a href="https://github.com/risanth14?tab=repositories" target="_blank" rel="noreferrer" className="theme-link text-sm font-semibold">
              View all {GITHUB_USER} repositories
            </a>
          </div>
          <p className="theme-muted mt-3 text-sm">
            Repositories and project cards below are pulled from GitHub user: <span className="font-semibold">{GITHUB_USER}</span>.
          </p>

          <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <article className="theme-panel rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-[Space_Grotesk] text-lg font-semibold">Repositories</h3>
                <span className="theme-chip rounded-full border px-3 py-1 text-xs">{repos.length}</span>
              </div>

              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
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
                      className="theme-sub-panel block rounded-xl border p-3 transition"
                    >
                      <p className="font-semibold">{repo.name}</p>
                      <p className="theme-muted mt-1 text-xs">
                        {repo.language || 'Mixed'} � Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
              </div>
            </article>

            <div className="grid gap-4 md:grid-cols-2">
              {!loadingProjects &&
                !projectsError &&
                featuredRepos.map((repo) => (
                  <article key={repo.id} className="theme-panel rounded-2xl border p-5">
                    <h3 className="font-[Space_Grotesk] text-xl font-semibold">{repo.name}</h3>
                    <p className="theme-muted mt-2 min-h-16 text-sm leading-6">
                      {repo.description || 'No description available yet.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="theme-chip rounded-full border px-3 py-1">{repo.language || 'Mixed'}</span>
                      <span className="theme-chip rounded-full border px-3 py-1">Stars: {repo.stargazers_count}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <a href={repo.html_url} target="_blank" rel="noreferrer" className="theme-btn-outline rounded-full border px-4 py-2 text-xs font-semibold">
                        GitHub
                      </a>
                      {repo.homepage && (
                        <a href={repo.homepage} target="_blank" rel="noreferrer" className="theme-btn-primary rounded-full px-4 py-2 text-xs font-semibold">
                          Live
                        </a>
                      )}
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







