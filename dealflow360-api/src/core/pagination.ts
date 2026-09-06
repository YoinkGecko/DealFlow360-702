export function paginateParams(page = 1, limit = 20) {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const safePage = Math.max(page, 1)
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  }
}

export function paginatedResult<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  }
}
