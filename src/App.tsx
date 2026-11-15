import { useEffect, useMemo } from 'react'
import gsap from 'gsap'
import { Scene, webglAvailable } from './scene/Scene'
import { TopBar } from './ui/TopBar'
import { TourPanel } from './ui/TourPanel'
import { ExplorePanel } from './ui/ExplorePanel'
import { ControlPanel } from './ui/ControlPanel'
import { Sources } from './ui/Sources'
import { LAST_CHAPTER, useStore } from './state/store'
import { resolveView } from './state/view'
import { live } from './state/live'
import { useT } from './i18n'

/** Chapter 3's mechanical animation: the wicket gates close and reopen in unison. */
function useGateDemo() {
  const key = useStore((s) => `${s.mode}|${s.step}|${s.replay}`)
  useEffect(() => {
    const s = useStore.getState()
    if (!resolveView(s).demo) { const tw = gsap.to(live, { demo: 0.85, duration: 0.6 }); return () => { tw.kill() } }
    const tl = gsap.timeline({ repeat: s.reduced ? 0 : 1, repeatDelay: 1.2, delay: s.reduced ? 0.2 : 1.6 })
    tl.to(live, { demo: 0.08, duration: 2.6, ease: 'power2.inOut' }).to(live, { demo: 0.08, duration: 0.9 })
      .to(live, { demo: 1, duration: 2.6, ease: 'power2.inOut' }).to(live, { demo: 0.85, duration: 1.2, ease: 'power1.inOut' }, '+=0.8')
    return () => { tl.kill() }
  }, [key])
}

export function App() {
  const t = useT()
  const mode = useStore((s) => s.mode), step = useStore((s) => s.step), lang = useStore((s) => s.lang)
  const sourcesOpen = useStore((s) => s.sourcesOpen)
  const hasGL = useMemo(webglAvailable, [])
  useGateDemo()

  useEffect(() => { document.documentElement.lang = lang; document.title = t.title }, [lang, t])
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => useStore.getState().set({ reduced: mq.matches })
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState(), el = e.target as HTMLElement
      if (e.key === 'Escape') { if (s.sourcesOpen) s.set({ sourcesOpen: false }); else if (s.selected) s.select(null) }
      if (s.mode !== 'tour' || s.sourcesOpen || ['INPUT', 'BUTTON', 'A'].includes(el.tagName)) return
      if (e.key === 'ArrowRight' && s.step <= LAST_CHAPTER) s.goStep(s.step + 1)
      if (e.key === 'ArrowLeft' && s.step > 0) s.goStep(s.step - 1)
    }
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey)
  }, [])

  const intro = mode === 'tour' && step === 0
  return (
    <div className={`app mode-${mode}${intro ? ' is-intro' : ''}`}>
      <div className="stage" aria-hidden={sourcesOpen}>
        {hasGL ? <Scene /> : (
          <div className="fallback" role="status"><h2>{t.fallback.title}</h2><p>{t.fallback.body}</p></div>
        )}
      </div>
      <TopBar />
      <main className="panel" aria-live="polite">
        {mode === 'tour' && <TourPanel />}
        {mode === 'explore' && <ExplorePanel />}
        {mode === 'control' && <ControlPanel />}
      </main>
      {sourcesOpen && <Sources />}
    </div>
  )
}
