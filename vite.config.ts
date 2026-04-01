import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const githubReposFunction = require('./server/github-repos-handler.cjs')
const contactFunction = require('./server/contact-handler.cjs')
const chatFunction = require('./server/chat-handler.cjs')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (!process.env.GITHUB_TOKEN && env.GITHUB_TOKEN) {
    process.env.GITHUB_TOKEN = env.GITHUB_TOKEN
  }
  if (!process.env.GITHUB_USERNAME && env.GITHUB_USERNAME) {
    process.env.GITHUB_USERNAME = env.GITHUB_USERNAME
  }
  if (!process.env.OPENAI_API_KEY && env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
  }
  if (!process.env.OPENAI_MODEL && env.OPENAI_MODEL) {
    process.env.OPENAI_MODEL = env.OPENAI_MODEL
  }

  return {
    plugins: [
    react(),
    {
      name: 'local-github-repos-api',
      configureServer(server) {
        server.middlewares.use('/api/github-repos', async (req, res) => {
          try {
            const url = new URL(req.url ?? '/', 'http://localhost')
            const username = url.searchParams.get('username') ?? ''

            const response = await githubReposFunction.handler({
              httpMethod: req.method ?? 'GET',
              queryStringParameters: {
                username,
              },
            })

            res.statusCode = response.statusCode ?? 500
            const headers = response.headers ?? {}
            for (const [key, value] of Object.entries(headers)) {
              if (value !== undefined) {
                res.setHeader(key, String(value))
              }
            }
            res.end(response.body ?? '')
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'local_api_error', detail: String(error) }))
          }
        })

        server.middlewares.use('/api/contact', async (req, res) => {
          try {
            if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'method_not_allowed' }))
              return
            }

            const bodyText = await new Promise<string>((resolve, reject) => {
              let data = ''
              req.on('data', (chunk) => {
                data += chunk
              })
              req.on('end', () => resolve(data))
              req.on('error', reject)
            })

            const parsedBody = bodyText ? JSON.parse(bodyText) : {}
            const response = await contactFunction.handler({
              httpMethod: 'POST',
              body: parsedBody,
            })

            res.statusCode = response.statusCode ?? 500
            const headers = response.headers ?? {}
            for (const [key, value] of Object.entries(headers)) {
              if (value !== undefined) {
                res.setHeader(key, String(value))
              }
            }
            res.end(response.body ?? '')
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'local_contact_api_error', detail: String(error) }))
          }
        })

        server.middlewares.use('/api/chat', async (req, res) => {
          try {
            if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'method_not_allowed' }))
              return
            }

            const bodyText = await new Promise<string>((resolve, reject) => {
              let data = ''
              req.on('data', (chunk) => {
                data += chunk
              })
              req.on('end', () => resolve(data))
              req.on('error', reject)
            })

            const parsedBody = bodyText ? JSON.parse(bodyText) : {}
            const response = await chatFunction.handler({
              httpMethod: 'POST',
              body: parsedBody,
            })

            res.statusCode = response.statusCode ?? 500
            const headers = response.headers ?? {}
            for (const [key, value] of Object.entries(headers)) {
              if (value !== undefined) {
                res.setHeader(key, String(value))
              }
            }
            res.end(response.body ?? '')
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'local_chat_api_error', detail: String(error) }))
          }
        })
      },
    },
  ],
  }
})
