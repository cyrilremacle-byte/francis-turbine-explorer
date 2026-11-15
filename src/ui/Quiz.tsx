import { LAST_CHAPTER, useStore } from '../state/store'
import { useT } from '../i18n'
import type { PartId } from '../scene/layout'

/** Correct option and the machine part each question points back to. */
const KEY: { answer: number; part: PartId | null }[] = [
  { answer: 1, part: 'gates' }, { answer: 1, part: 'draft' }, { answer: 1, part: null }, { answer: 1, part: 'stator' },
]

export function Quiz() {
  const t = useT()
  const { quizIndex: i, quizPicks: picks, set, goStep, focusPart, setMode } = useStore()
  const q = t.quiz
  if (i >= KEY.length) {
    const score = picks.filter((p, k) => p === KEY[k].answer).length
    return (
      <section className="card quiz">
        <p className="kicker">{q.title}</p>
        <h2>{q.doneTitle}</h2>
        <p className="score"><b>{score} / {KEY.length}</b> {q.score}</p>
        <div className="row wrap">
          <button className="btn primary" onClick={() => setMode('explore')}>{q.explore}</button>
          <button className="btn" onClick={() => setMode('control')}>{q.control}</button>
          <button className="btn" onClick={() => set({ quizIndex: 0, quizPicks: [null, null, null, null] })}>{q.again}</button>
        </div>
      </section>
    )
  }
  const item = q.items[i], pick = picks[i], done = pick !== null, right = pick === KEY[i].answer
  const choose = (k: number) => { if (done) return; const next = [...picks]; next[i] = k; set({ quizPicks: next }) }
  return (
    <section className="card quiz">
      <div className="chapter-head"><span className="of">{q.title}</span><span className="of">{q.question} {i + 1} / {KEY.length}</span></div>
      <h3>{item.q}</h3>
      <div className="options" role="group" aria-label={item.q}>
        {item.options.map((o, k) => (
          <button key={k} disabled={done} onClick={() => choose(k)}
            className={`opt${done && k === KEY[i].answer ? ' good' : ''}${done && k === pick && !right ? ' bad' : ''}`}>
            <span className="mark" aria-hidden="true">{String.fromCharCode(65 + k)}</span>{o}
          </button>
        ))}
      </div>
      <div className="feedback" role="status">
        {done && (<>
          <p><b className={right ? 'ok' : 'no'}>{right ? q.correct : q.incorrect}</b> {item.explain}</p>
          <div className="row wrap">
            {KEY[i].part
              ? <button className="btn" onClick={() => focusPart(KEY[i].part!)}>{q.show}</button>
              : <button className="btn" onClick={() => setMode('control')}>{q.control}</button>}
            <button className="btn primary" onClick={() => set({ quizIndex: i + 1 })}>{i === KEY.length - 1 ? q.finish : q.next}</button>
          </div>
        </>)}
      </div>
      {!done && <div className="row"><button className="btn" onClick={() => goStep(LAST_CHAPTER)}>{t.tour.prev}</button></div>}
    </section>
  )
}
