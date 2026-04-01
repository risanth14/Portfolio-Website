import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const contactFunction = require('../server/contact-handler.cjs')

export default async function handler(req, res) {
  try {
    const response = await contactFunction.handler({
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
        parsedBody = { ok: false }
      }
    }

    res.status(statusCode).json(parsedBody)
  } catch (error) {
    res.status(500).json({
      error: 'vercel_contact_api_error',
      detail: String(error),
    })
  }
}

