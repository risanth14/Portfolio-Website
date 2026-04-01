const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const DEFAULT_FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjgpovgp'

function normalizePayload(event) {
  if (!event?.body) return {}
  if (typeof event.body === 'string') {
    try {
      return JSON.parse(event.body)
    } catch {
      return {}
    }
  }
  if (typeof event.body === 'object') return event.body
  return {}
}

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    }
  }

  const payload = normalizePayload(event)
  const name = String(payload.name ?? '').trim()
  const email = String(payload.email ?? '').trim()
  const message = String(payload.message ?? '').trim()

  if (!name || !email || !message) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'missing_required_fields' }),
    }
  }

  const endpoint = (process.env.CONTACT_FORM_ENDPOINT || DEFAULT_FORMSPREE_ENDPOINT).trim()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        subject: 'New portfolio contact form message',
        name,
        email,
        message,
      }),
    })

    const responseText = await response.text()
    let parsedResponse = null
    try {
      parsedResponse = responseText ? JSON.parse(responseText) : null
    } catch {
      parsedResponse = null
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          error: 'contact_forward_failed',
          status: response.status,
          provider_message:
            parsedResponse?.message ||
            parsedResponse?.errors?.[0]?.message ||
            parsedResponse?.error ||
            responseText ||
            'Contact provider rejected the request.',
        }),
      }
    }

    if (parsedResponse && parsedResponse.success === false) {
      return {
        statusCode: 502,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          error: 'contact_forward_failed',
          provider_message:
            parsedResponse?.message ||
            parsedResponse?.errors?.[0]?.message ||
            'Contact provider returned an unsuccessful response.',
        }),
      }
    }

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        success: true,
        provider_message: parsedResponse?.message || 'Message sent.',
      }),
    }
  } catch (error) {
    return {
      statusCode: 502,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'contact_request_failed', detail: String(error) }),
    }
  }
}

module.exports = {
  handler,
  JSON_HEADERS,
}
