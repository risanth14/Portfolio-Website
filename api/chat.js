import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const chatFunction = require('../server/chat-handler.cjs')

export default async function handler(req, res) {
  try {
    const response = await chatFunction.handler({
      httpMethod: req.method ?? 'POST',
      body: req.body ?? {},
    })

    const statusCode = response?.statusCode ?? 500
    const headers = response?.headers ?? {}
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        res.setHeader(key, String(value))
      }
    }

    let parsedBody = response?.body ?? '{}'
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody)
      } catch {
        parsedBody = { error: 'invalid_server_response' }
      }
    }

    res.status(statusCode).json(parsedBody)
  } catch (error) {
    res.status(500).json({
      error: 'vercel_chat_api_error',
      detail: String(error),
    })
  }
}

