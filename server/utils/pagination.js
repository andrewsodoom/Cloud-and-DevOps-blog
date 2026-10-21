function parsePagination(query = {}, defaultLimit = 9) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))

  return { page, limit, skip: (page - 1) * limit }
}

function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  }
}

module.exports = { parsePagination, paginationMeta }
