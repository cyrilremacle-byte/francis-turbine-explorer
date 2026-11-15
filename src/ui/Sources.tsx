import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { useT } from '../i18n'
import { SOURCES, STUDIED } from '../content/sources'

export function Sources() {
  const t = useT().sources
  const set = useStore((s) => s.set)
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="scrim" onClick={() => set({ sourcesOpen: false })}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{t.title}</h2><button ref={ref} className="btn" onClick={() => set({ sourcesOpen: false })}>{t.close}</button></div>
        <p className="body small">{t.intro}</p>
        <div className="cols">
          <div><h4 className="v">{t.verified}</h4><ul>{t.verifiedItems.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><h4 className="a">{t.assumed}</h4><ul>{t.assumedItems.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
        <h4>{t.refs}</h4>
        <ul className="links">{Object.values(SOURCES).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul>
        <h4>{t.studied}</h4>
        <ul className="links">{STUDIED.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul>
      </div>
    </div>
  )
}
