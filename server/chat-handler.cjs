const fs = require('node:fs')
const path = require('node:path')

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const KNOWLEDGE_PATH = path.join(__dirname, '..', 'data', 'portfolio_rag.json')
const DEFAULT_MODEL = 'gpt-4.1-mini'

let knowledgeCache = null

function loadKnowledge() {
  if (knowledgeCache) return knowledgeCache
  const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf8')
  knowledgeCache = JSON.parse(raw)
  return knowledgeCache
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text) {
  const baseTokens = normalize(text)
    .split(' ')
    .filter((token) => token.length > 1)

  const variants = new Set(baseTokens)
  for (const token of baseTokens) {
    if (token.length > 3 && token.endsWith('s')) {
      variants.add(token.slice(0, -1))
    }
    if (token.length > 4 && token.endsWith('es')) {
      variants.add(token.slice(0, -2))
    }
  }

  return Array.from(variants)
}

function scoreChunk(questionTokens, chunk) {
  const textTokens = new Set(tokenize(chunk.text))
  const tagTokens = new Set((chunk.tags || []).flatMap((tag) => tokenize(tag)))
  let score = 0

  for (const token of questionTokens) {
    if (textTokens.has(token)) score += 1
    if (tagTokens.has(token)) score += 2
  }

  return score
}

function retrieveContext(question, chunks, topK = 6) {
  const questionTokens = tokenize(question)
  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(questionTokens, chunk) }))
    .sort((a, b) => b.score - a.score)

  const positives = ranked.filter((item) => item.score > 0).slice(0, topK)
  if (positives.length > 0) return positives.map((item) => item.chunk)
  return ranked.slice(0, Math.min(4, ranked.length)).map((item) => item.chunk)
}

function hasAnyToken(questionTokens, words) {
  const set = new Set(questionTokens)
  return words.some((word) => set.has(word))
}

function buildCategoryAnswer(question, chunks) {
  const qTokens = tokenize(question)

  if (hasAnyToken(qTokens, ['experience', 'experiences', 'work', 'internship', 'internships', 'co', 'op', 'coop'])) {
    return 'He has full-stack experience at SGMC Canada, Solora Tech, LEX Marketing, and Brazily Fitness, plus operations experience at Walmart. His work focuses on React/Node systems, APIs, databases, and cloud deployment.'
  }

  if (hasAnyToken(qTokens, ['project', 'projects', 'build', 'built'])) {
    return 'His highlighted projects are RotateOps, NovaPrep, and ForgeFit. They focus on workflow automation, AI-assisted learning, and fitness tracking using React/Node, Supabase, Express, and OpenAI APIs.'
  }

  if (hasAnyToken(qTokens, ['education', 'university', 'school', 'degree'])) {
    return 'He is a Software Engineering Co-op student at Ontario Tech University (BEng, Sep 2023 to Apr 2027), with coursework in algorithms, databases, AI, and systems programming.'
  }

  if (hasAnyToken(qTokens, ['contact', 'email', 'linkedin', 'github', 'phone'])) {
    return 'You can reach him at risanth14@gmail.com, on LinkedIn at /in/risanth-sivarajah, on GitHub at risanth14, or by phone at 647-781-8615.'
  }

  if (hasAnyToken(qTokens, ['skill', 'skills', 'tech', 'stack', 'tools'])) {
    return 'He mainly works with React, Next.js, Node.js, Express, TypeScript, Python, PostgreSQL, and MySQL, plus AWS/Azure, Docker, Kubernetes, Terraform, and CI/CD.'
  }

  return ''
}

function buildContextText(selectedChunks) {
  return selectedChunks
    .map((chunk, index) => `${index + 1}. [${chunk.category}] ${chunk.title}\n${chunk.text}`)
    .join('\n\n')
}

async function queryOpenAI({ apiKey, model, question, contextText }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'You are Risanth Sivarajah\'s portfolio assistant. Use only the provided context. Sound natural and conversational, like a real person. Keep answers short (2-4 sentences) unless asked for more detail. If the answer is not in context, say you are not sure and suggest contacting Risanth.',
        },
        {
          role: 'user',
          content: `Question:\n${question}\n\nContext:\n${contextText}`,
        },
      ],
      max_output_tokens: 140,
    }),
  })

  const raw = await response.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!response.ok) {
    const errMessage =
      data?.error?.message ||
      data?.message ||
      `OpenAI request failed with status ${response.status}`
    throw new Error(errMessage)
  }

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const outputItems = Array.isArray(data.output) ? data.output : []
  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : []
    for (const content of contentItems) {
      if (content?.type === 'output_text' && typeof content?.text === 'string' && content.text.trim()) {
        return content.text.trim()
      }
    }
  }

  return ''
}

function buildFallbackAnswer(selectedChunks) {
  if (!selectedChunks || selectedChunks.length === 0) {
    return 'I could not find a confident answer in my portfolio context.'
  }

  const combinedTitles = selectedChunks
    .slice(0, 2)
    .map((chunk) => chunk.title)
    .filter(Boolean)

  if (combinedTitles.length === 0) {
    return 'I could not find a confident answer in my portfolio context.'
  }

  return `The most relevant info I found is around ${combinedTitles.join(' and ')}.`
}

function limitAnswerBySentences(answer, maxSentences = 4) {
  const clean = String(answer || '').replace(/\s+/g, ' ').trim()
  if (!clean) return clean

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean]
  const limited = sentences.slice(0, maxSentences).join(' ').trim()
  return limited
}

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...JSON_HEADERS,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    }
  }

  let payload = {}
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {})
  } catch {
    payload = {}
  }

  const question = String(payload.question || '').trim()
  if (!question) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'missing_question' }),
    }
  }

  try {
    const knowledge = loadKnowledge()
    const allChunks = knowledge.chunks || []
    const categoryAnswer = buildCategoryAnswer(question, allChunks)
    if (categoryAnswer) {
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          answer: limitAnswerBySentences(categoryAnswer),
          retrieved_chunks: [],
        }),
      }
    }

    const selectedChunks = retrieveContext(question, allChunks)
    const contextText = buildContextText(selectedChunks)

    const apiKey = (process.env.OPENAI_API_KEY || '').trim()
    const model = (process.env.OPENAI_MODEL || DEFAULT_MODEL).trim()

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          answer: buildFallbackAnswer(selectedChunks),
          retrieved_chunks: selectedChunks.map((chunk) => ({
            id: chunk.id,
            title: chunk.title,
            category: chunk.category,
          })),
        }),
      }
    }

    const answer = await queryOpenAI({
      apiKey,
      model,
      question,
      contextText,
    })

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        answer: limitAnswerBySentences(answer || buildFallbackAnswer(selectedChunks)),
        retrieved_chunks: selectedChunks.map((chunk) => ({
          id: chunk.id,
          title: chunk.title,
          category: chunk.category,
        })),
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        error: 'chat_request_failed',
        detail: String(error),
      }),
    }
  }
}

module.exports = {
  handler,
  JSON_HEADERS,
}
