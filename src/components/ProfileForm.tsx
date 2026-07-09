import { useEffect, useState } from 'react'
import { searchCities, type CityResult } from '../lib/geocode'
import type { ProfileInput } from '../data/provider'

interface Props {
  initial?: ProfileInput
  submitLabel: string
  onSubmit: (input: ProfileInput) => Promise<void>
}

const inputCls =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-white/40'

export function ProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [city, setCity] = useState<CityResult | null>(
    initial ? { name: initial.city, region: '', lat: initial.lat, lng: initial.lng, tz: initial.tz } : null,
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityResult[]>([])
  const [noResults, setNoResults] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setNoResults(false)
      return
    }
    // stale 防護：先發的慢回應不能覆蓋後發的結果（debounce 降低機率但沒消除）
    let stale = false
    const timer = setTimeout(() => {
      searchCities(query.trim())
        .then(r => {
          if (stale) return
          setResults(r)
          setNoResults(r.length === 0)
        })
        .catch(() => {
          if (stale) return
          setResults([])
          setNoResults(true)
        })
    }, 400)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [query])

  const canSubmit = nickname.trim().length >= 1 && city !== null && !busy

  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={async e => {
        e.preventDefault()
        if (!canSubmit || !city) return
        setBusy(true)
        setError('')
        try {
          await onSubmit({ nickname: nickname.trim(), city: city.name, lat: city.lat, lng: city.lng, tz: city.tz })
        } catch {
          setError('沒能存起來，再試一次')
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="opacity-75">稱呼（讓對方看到的名字）</span>
        <input
          className={inputCls}
          value={nickname}
          maxLength={20}
          placeholder="阿寶"
          onChange={e => setNickname(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="opacity-75">城市</span>
        {city ? (
          <div className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2">
            <span>
              {city.name}
              <span className="ml-2 text-xs opacity-50">{city.tz}</span>
            </span>
            <button
              type="button"
              className="text-xs opacity-60 hover:opacity-90"
              onClick={() => {
                setCity(null)
                setQuery('')
              }}
            >
              重選
            </button>
          </div>
        ) : (
          <>
            <input
              className={inputCls}
              value={query}
              placeholder="搜尋城市…"
              onChange={e => setQuery(e.target.value)}
            />
            {noResults && (
              <p className="text-xs opacity-60">
                找不到這個城市——試試完整名稱（台北市）或英文（Taipei）
              </p>
            )}
            {results.length > 0 && (
              <ul className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
                {results.map((r, i) => (
                  <li key={`${r.name}-${i}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => setCity(r)}
                    >
                      {r.name}
                      <span className="ml-2 text-xs opacity-50">{r.region}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {error && <p className="text-xs opacity-70">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm text-white/90 backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </form>
  )
}
