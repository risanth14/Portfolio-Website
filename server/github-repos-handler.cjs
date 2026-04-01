const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const CORS_HEADERS = {
  ...JSON_HEADERS,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const GRAPHQL_QUERY = `
  query PortfolioRepos($login: String!, $repoCursor: String, $pinnedCursor: String) {
    user(login: $login) {
      login
      pinnedItems(first: 100, types: [REPOSITORY], after: $pinnedCursor) {
        nodes {
          ... on Repository {
            name
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      repositories(
        first: 100
        after: $repoCursor
        orderBy: { field: UPDATED_AT, direction: DESC }
        ownerAffiliations: OWNER
        privacy: PUBLIC
      ) {
        nodes {
          databaseId
          name
          description
          url
          homepageUrl
          stargazerCount
          forkCount
          isFork
          updatedAt
          pushedAt
          primaryLanguage {
            name
          }
          languages(first: 4, orderBy: { field: SIZE, direction: DESC }) {
            nodes {
              name
            }
          }
          repositoryTopics(first: 8) {
            nodes {
              topic {
                name
              }
            }
          }
          owner {
            login
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`

function toRepoView(repo, pinnedIndexMap) {
  const topLanguages = (repo.languages?.nodes ?? [])
    .map((item) => item?.name)
    .filter(Boolean)
    .slice(0, 4)

  const fallbackLanguage = repo.primaryLanguage?.name ?? null
  const normalizedTopLanguages = topLanguages.length > 0 ? topLanguages : (fallbackLanguage ? [fallbackLanguage] : [])
  const topics = (repo.repositoryTopics?.nodes ?? [])
    .map((item) => item?.topic?.name)
    .filter(Boolean)

  const pinnedIndex = pinnedIndexMap.get(repo.name.toLowerCase())

  return {
    id: typeof repo.databaseId === 'number' ? repo.databaseId : Math.abs(hashCode(`${repo.owner?.login}/${repo.name}`)),
    name: repo.name,
    description: repo.description ?? null,
    html_url: repo.url,
    homepage: repo.homepageUrl ?? null,
    stargazers_count: repo.stargazerCount ?? 0,
    forks_count: repo.forkCount ?? 0,
    language: fallbackLanguage,
    updated_at: repo.updatedAt,
    pushed_at: repo.pushedAt,
    topics,
    fork: !!repo.isFork,
    owner: {
      login: repo.owner?.login ?? '',
    },
    top_languages: normalizedTopLanguages,
    is_pinned: pinnedIndex !== undefined,
    pinned_index: pinnedIndex ?? null,
  }
}

function hashCode(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

async function runGraphQLQuery(token, login, repoCursor, pinnedCursor) {
  const graphqlResponse = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { login, repoCursor, pinnedCursor },
    }),
  })

  if (!graphqlResponse.ok) {
    return {
      ok: false,
      error: {
        statusCode: 502,
        body: JSON.stringify({ error: 'github_graphql_error', status: graphqlResponse.status }),
      },
    }
  }

  const payload = await graphqlResponse.json()
  if (payload?.errors || !payload?.data?.user) {
    return {
      ok: false,
      error: {
        statusCode: 502,
        body: JSON.stringify({ error: 'github_graphql_payload_error' }),
      },
    }
  }

  return { ok: true, user: payload.data.user }
}

async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    }
  }

  const username = (event.queryStringParameters?.username || process.env.GITHUB_USERNAME || '').trim()
  if (!username) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'missing_username' }),
    }
  }

  const token = (process.env.GITHUB_TOKEN || '').trim()
  if (!token) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'missing_token' }),
    }
  }

  try {
    const pinnedOrder = []
    const repoNodes = []

    let repoCursor = null
    let pinnedCursor = null
    let hasMoreRepos = true
    let hasMorePinned = true
    let firstUser = null

    while (hasMoreRepos || hasMorePinned) {
      const result = await runGraphQLQuery(token, username, hasMoreRepos ? repoCursor : null, hasMorePinned ? pinnedCursor : null)
      if (!result.ok) {
        return {
          ...result.error,
          headers: CORS_HEADERS,
        }
      }

      const user = result.user
      if (!firstUser) firstUser = user

      if (hasMorePinned) {
        for (const node of user.pinnedItems?.nodes ?? []) {
          if (node?.name) pinnedOrder.push(node.name)
        }
        hasMorePinned = user.pinnedItems?.pageInfo?.hasNextPage === true
        pinnedCursor = user.pinnedItems?.pageInfo?.endCursor ?? null
      }

      if (hasMoreRepos) {
        repoNodes.push(...(user.repositories?.nodes ?? []))
        hasMoreRepos = user.repositories?.pageInfo?.hasNextPage === true
        repoCursor = user.repositories?.pageInfo?.endCursor ?? null
      }
    }

    const pinnedIndexMap = new Map(
      pinnedOrder.map((name, index) => [name.toLowerCase(), index]),
    )

    const repos = repoNodes
      .filter((repo) => !repo?.isFork)
      .filter((repo) => repo?.owner?.login?.toLowerCase() === username.toLowerCase())
      .map((repo) => toRepoView(repo, pinnedIndexMap))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        username: firstUser?.login ?? username,
        pinned_order: pinnedOrder,
        total_count: repos.length,
        repos,
      }),
    }
  } catch {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'github_request_failed' }),
    }
  }
}

module.exports = {
  handler,
  JSON_HEADERS,
}
