import { useStore, type Mode } from '../state/store'
import { useT } from '../i18n'

const MODES: Mode[] = ['tour', 'explore', 'control']

export function TopBar() {
  const t = useT()
  const { mode, lang, setMode, set } = useStore()
  return (
    <header className="topbar">
      <div className="brand" aria-label={t.title}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d="M12 9 C 13.5 6.5, 16 5.5, 18.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${k * 60} 12 12)`} />)}
        </svg>
        <span>{t.title}</span>
      </div>
      <nav className="seg modes" role="tablist" aria-label={t.nav.modes}>
        {MODES.map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t.nav[m]}</button>
        ))}
      </nav>
      <div className="top-right">
        <button className="ghost" onClick={() => set({ sourcesOpen: true })}>{t.nav.sources}</button>
        <div className="seg lang" role="group" aria-label={t.nav.language}>
          <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => set({ lang: 'en' })} lang="en" aria-label="English">EN</button>
          <button aria-pressed={lang === 'fr'} className={lang === 'fr' ? 'on' : ''} onClick={() => set({ lang: 'fr' })} lang="fr" aria-label="Français">FR</button>
        </div>
      </div>
    </header>
  )
}
