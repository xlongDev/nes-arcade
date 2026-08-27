import { describe, it, expect } from 'vitest'
import { validateLibrarySearch } from './librarySearch'

describe('validateLibrarySearch', () => {
  it('applies safe defaults for empty input', () => {
    expect(validateLibrarySearch({})).toEqual({
      q: '',
      cat: 'all',
      sort: 'title',
      dir: 'asc',
      fav: false,
      recent: false,
    })
  })

  it('trims q to 60 chars', () => {
    const long = 'a'.repeat(120)
    expect(validateLibrarySearch({ q: long }).q).toHaveLength(60)
  })

  it('clamps invalid enum values to defaults', () => {
    const r = validateLibrarySearch({ cat: 'bogus', sort: 'nope', dir: 'sideways' })
    expect(r.cat).toBe('all')
    expect(r.sort).toBe('title')
    expect(r.dir).toBe('asc')
  })

  it('accepts boolean and string "true" for flags', () => {
    expect(validateLibrarySearch({ fav: true }).fav).toBe(true)
    expect(validateLibrarySearch({ fav: 'true' }).fav).toBe(true)
    expect(validateLibrarySearch({ fav: false }).fav).toBe(false)
  })
})
