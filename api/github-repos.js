import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const githubReposFunction = require('../server/github-repos-handler.cjs')

export default async function handler(req, res) {
  try {
    const queryUsername = typeof req.query?.username === 'string' ? req.query.username : ''
    const response = await githubReposFunction.handler({
      httpMethod: req.method ?? 'GET',
      queryStringParameters: {
        username: queryUsername,
      },
    })

    const statusCode = response?.statusCode ?? 500
    const headers = response?.headers ?? {}
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        res.setHeader(key, String(value))
      }
    }

    res.status(statusCode).send(response?.body ?? '')
  } catch (error) {
    res.status(500).json({
      error: 'vercel_api_error',
      detail: String(error),
    })
  }
}
