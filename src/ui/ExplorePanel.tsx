import { useStore, type Preset } from '../state/store'
import { useT } from '../i18n'
import { PART_IDS } from '../scene/layout'
import { PART_META, SOURCES } from '../content/sources'

const PRESETS: Preset[] = ['iso', 'top', 'side', 'section']
type Toggle = 'cutaway' | 'xray' | 'explode' | 'water' | 'labels'
const TOGGLES: Toggle[] = ['cutaway', 'xray', 'explode', 'water', 'labels']

export function ExplorePanel() {
  const t = useT()
  const s = useStore()
  const sel = s.selected

  return (
    <section className="card explore">
      <h2>{t.explore.title}</h2>
      <p className="body small">{t.explore.lead}</p>

      <h4>{t.explore.views}</h4>
      <div className="seg full" role="group" aria-label={t.explore.views}>
        {PRESETS.map((p) => <button key={p} className={!sel && !s.explode && s.preset === p ? 'on' : ''} aria-pressed={!sel && s.preset === p} onClick={() => s.setPreset(p)}>{t.explore[p]}</button>)}
      </div>

      <h4>{t.explore.display}</h4>
      <div className="chips" role="group" aria-label={t.explore.display}>
        {TOGGLES.map((k) => (
          <button key={k} className={`chip${s[k] ? ' on' : ''}`} aria-pressed={s[k]}
            onClick={() => s.set(k === 'explode' ? { explode: !s.explode, camKey: s.camKey + 1 } : { [k]: !s[k] })}>
            <i aria-hidden="true" />{t.explore[k]}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn" onClick={() => s.set({ playing: !s.playing })} aria-pressed={!s.playing}>{s.playing ? t.explore.pause : t.explore.play}</button>
        <button className="btn" onClick={() => s.set({ selected: null, explode: false, xray: false, cutaway: true, preset: 'iso', camKey: s.camKey + 1 })}>{t.explore.reset}</button>
      </div>

      {sel ? (
        <article className={`info accent-${PART_META[sel].accent}`} aria-live="polite">
          <button className="back" onClick={() => s.select(null)}>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{t.info.back}
          </button>
          <div className="info-head"><h3>{t.parts[sel].name}</h3><span className={`tag tag-${PART_META[sel].motion}`}>{t.motion[PART_META[sel].motion]}</span></div>
          <dl>
            <dt>{t.info.what}</dt><dd>{t.parts[sel].what}</dd>
            <dt>{t.info.does}</dt><dd>{t.parts[sel].does}</dd>
            <dt>{t.info.why}</dt><dd>{t.parts[sel].why}</dd>
            <dt>{t.info.source}</dt><dd><a href={SOURCES[PART_META[sel].source].url} target="_blank" rel="noopener noreferrer">{SOURCES[PART_META[sel].source].label}</a></dd>
          </dl>
        </article>
      ) : (<>
        <h4>{t.explore.components}</h4>
        <ul className="parts">
          {PART_IDS.map((id) => (
            <li key={id}>
              <button onClick={() => s.select(id)} onPointerEnter={() => s.set({ hovered: id })} onPointerLeave={() => s.set({ hovered: null })}
                onFocus={() => s.set({ hovered: id })} onBlur={() => s.set({ hovered: null })} className={`accent-${PART_META[id].accent}`}>
                <i aria-hidden="true" /><span>{t.parts[id].name}</span><span className={`tag tag-${PART_META[id].motion}`}>{t.motion[PART_META[id].motion]}</span>
              </button>
            </li>
          ))}
        </ul>
      </>)}
    </section>
  )
}
