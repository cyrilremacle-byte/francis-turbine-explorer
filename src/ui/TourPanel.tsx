import { LAST_CHAPTER, QUIZ_STEP, useStore } from '../state/store'
import { useT } from '../i18n'
import { Quiz } from './Quiz'

/** Chapter 1 illustration: head is a difference in water level. */
function HeadDiagram() {
  const t = useT().tour.head
  return (
    <figure className="diagram">
      <svg viewBox="0 0 340 150" role="img" aria-label={t.caption}>
        <path d="M0 34 H96 V150 H0 Z" fill="rgba(70,211,255,.16)" /><path d="M0 34 H96" stroke="#46d3ff" strokeWidth="1.5" />
        <path d="M96 22 L120 22 L150 150 L96 150 Z" fill="#2a2e35" stroke="rgba(255,255,255,.14)" />
        <path className="dash-flow" d="M100 70 C 150 76, 190 108, 236 120" fill="none" stroke="#46d3ff" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 9" />
        <path d="M100 70 C 150 76, 190 108, 236 120" fill="none" stroke="rgba(70,211,255,.25)" strokeWidth="9" strokeLinecap="round" />
        <rect x="226" y="88" width="42" height="46" rx="3" fill="#2a2e35" stroke="rgba(255,255,255,.14)" /><circle cx="247" cy="120" r="7" fill="none" stroke="#ffae42" strokeWidth="1.5" />
        <path d="M262 118 H340 V150 H262 Z" fill="rgba(70,211,255,.1)" /><path d="M268 118 H340" stroke="#46d3ff" strokeWidth="1.5" opacity=".7" />
        <path d="M300 36 V116 M295 44 L300 36 L305 44 M295 108 L300 116 L305 108" fill="none" stroke="#eceef1" strokeWidth="1.2" />
        <path d="M100 34 H320" stroke="#eceef1" strokeWidth=".6" strokeDasharray="3 4" opacity=".5" />
        <text x="8" y="26">{t.reservoir}</text><text x="293" y="80" textAnchor="end">{t.gross}</text>
        <text x="336" y="134" textAnchor="end">{t.tailwater}</text><text x="148" y="76">{t.penstock}</text><text x="247" y="82" textAnchor="middle">{t.unit}</text>
      </svg>
      <figcaption>{t.caption}</figcaption>
    </figure>
  )
}

function EnergyChain() {
  const t = useT().tour.chain
  return (
    <ol className="chain" aria-label={`${t.hydraulic}, ${t.mechanical}, ${t.electrical}`}>
      <li className="c-water"><b>{t.hydraulic}</b><span>{t.water}</span></li>
      <li className="c-mech"><b>{t.mechanical}</b><span>{t.shaft}</span></li>
      <li className="c-elec"><b>{t.electrical}</b><span>{t.gen}</span></li>
    </ol>
  )
}

export function TourPanel() {
  const t = useT()
  const step = useStore((s) => s.step), goStep = useStore((s) => s.goStep)

  if (step === 0) return (
    <section className="intro">
      <p className="kicker">{t.intro.kicker}</p>
      <h1>{t.intro.title}</h1>
      <p className="lede">{t.intro.body}</p>
      <button className="cta" onClick={() => goStep(1)}>{t.intro.cta}<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <p className="hint">{t.intro.hint}</p>
    </section>
  )
  if (step === QUIZ_STEP) return <Quiz />

  const c = t.tour.steps[step - 1]
  return (
    <section className="card chapter" key={step}>
      <div className="chapter-head">
        <span className="num">{String(step).padStart(2, '0')}</span>
        <span className="of">{t.tour.chapter} {step} / {LAST_CHAPTER}</span>
      </div>
      <h2>{c.title}</h2>
      <p className="body">{c.body}</p>
      {step === 1 && <HeadDiagram />}
      {step === 5 && <EnergyChain />}
      <p className="watch"><b>{t.tour.watch}</b>{c.watch}</p>
      <div className="dots" role="group" aria-label={t.tour.chapter}>
        {t.tour.steps.map((st, i) => (
          <button key={i} className={i + 1 === step ? 'on' : ''} aria-label={`${t.tour.chapter} ${i + 1}: ${st.title}`} aria-current={i + 1 === step ? 'step' : undefined} onClick={() => goStep(i + 1)} />
        ))}
      </div>
      <div className="row nav-row">
        <button className="btn" onClick={() => goStep(step - 1)}>{t.tour.prev}</button>
        <button className="btn" onClick={() => goStep(step)}>{t.tour.replay}</button>
        <button className="btn primary" onClick={() => goStep(step + 1)}>{step === LAST_CHAPTER ? t.tour.quiz : t.tour.next}</button>
      </div>
    </section>
  )
}
