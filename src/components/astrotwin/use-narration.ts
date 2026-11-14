import { useEffect, useMemo, useState } from 'react'
import { buildPayload, templateSbar, type Sbar } from '../../engine'
import { useI18n } from '../../i18n'
import { narrate } from '../../services/gemini'
import type { DataSource } from '../../services/http'
import { useMission } from '../../state/mission'

/**
 * SBAR + crew message for the selected crew member.
 * Shows the deterministic template immediately, then swaps in the LLM-narrated
 * wording only if the narrator answers with valid, number-faithful text.
 */
export function useNarration() {
  const { lang } = useI18n()
  const { current, privacy } = useMission()
  const payload = useMemo(() => buildPayload(current, privacy, lang), [current, privacy, lang])
  const template = useMemo(() => templateSbar(payload), [payload])
  const key = JSON.stringify(payload)
  const [live, setLive] = useState<{ key: string; sbar: Sbar } | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPending(true)
    narrate(payload).then((res) => {
      if (cancelled) return
      setPending(false)
      setLive(res.source === 'live' ? { key, sbar: res.data } : null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const narrated = live && live.key === key
  const source: DataSource = narrated ? 'live' : 'embedded'
  return { payload, sbar: narrated ? live.sbar : template, source, pending }
}
