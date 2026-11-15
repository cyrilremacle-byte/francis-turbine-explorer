import { useEffect, useId, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { fmt, useT } from '../i18n'
import { ETA_ASSUMED, G, HEAD_MAX, HEAD_MIN, RHO, operatingPoint } from '../physics/hydro'

/** Eases a displayed number toward its target so readouts glide instead of jumping. */
function useSmooth(v: number) {
  const reduced = useStore((s) => s.reduced)
  const [d, setD] = useState(v); const cur = useRef(v)
  useEffect(() => {
    if (reduced) { cur.current = v; setD(v); return }
    let raf = 0
    const tick = () => {
      cur.current += (v - cur.current) * 0.22
      if (Math.abs(v - cur.current) < 5e-4) { cur.current = v; setD(v); return }
      setD(cur.current); raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [v, reduced])
  return d
}

const BAR_MAX = operatingPoint(1, HEAD_MAX).hydraulicMW

export function ControlPanel() {
  const t = useT(), c = t.control
  const { opening, head, vizSpeed, lang, set } = useStore()
  const [tip, setTip] = useState(false)
  const tipId = useId()
  const op = operatingPoint(opening, head)
  const q = useSmooth(op.q), pe = useSmooth(op.electricalMW), ph = useSmooth(op.hydraulicMW)
  const closed = opening <= 0.004
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / BAR_MAX) * 100))}%`

  return (
    <section className="card control">
      <h2>{c.title}</h2>
      <p className="body small">{c.lead}</p>

      <div className="field">
        <label htmlFor="gate"><span>{c.gate}</span><output>{fmt(opening * 100, lang, 0)} %</output></label>
        <input id="gate" type="range" min={0} max={100} step={1} value={Math.round(opening * 100)} style={{ ['--v' as any]: `${opening * 100}%` }}
          onChange={(e) => set({ opening: +e.target.value / 100 })} className="amber" />
      </div>
      <div className="field">
        <label htmlFor="head">
          <span>{c.head}
            <button className="tipbtn" aria-label={c.headTipLabel} aria-expanded={tip} aria-controls={tipId}
              onClick={() => setTip(!tip)} onBlur={() => setTip(false)}>i</button>
          </span>
          <output>{fmt(head, lang, 0)} m</output>
        </label>
        <div id={tipId} className={`tip${tip ? ' open' : ''}`} role="tooltip"><b>{c.headTipLabel}</b>{c.headTip}</div>
        <input id="head" type="range" min={HEAD_MIN} max={HEAD_MAX} step={1} value={head} style={{ ['--v' as any]: `${((head - HEAD_MIN) / (HEAD_MAX - HEAD_MIN)) * 100}%` }}
          onChange={(e) => set({ head: +e.target.value })} className="cyan" />
      </div>

      <div className="hero-read" aria-live="off">
        <span className="lab">{c.rPower}</span>
        <span className="big" data-testid="power">{fmt(pe, lang, 2)}<small>MW</small></span>
      </div>
      <dl className="reads">
        <div><dt>{c.rGate}</dt><dd>{fmt(opening * 100, lang, 0)} %</dd></div>
        <div><dt>{c.rFlow}</dt><dd data-testid="flow">{fmt(q, lang, 1)} m³/s</dd></div>
        <div><dt>{c.rHead}</dt><dd>{fmt(head, lang, 0)} m</dd></div>
        <div><dt>{c.rEta}</dt><dd>{fmt(ETA_ASSUMED * 100, lang, 0)} %</dd></div>
      </dl>

      <div className="eq" aria-label={c.equation}>
        <span className="eq-sym">P = ρ × g × Q × H<sub>net</sub> × η</span>
        <span className="eq-num" data-testid="equation">{RHO} × {fmt(G, lang, 2)} × {fmt(op.q, lang, 2)} × {fmt(head, lang, 0)} × {fmt(ETA_ASSUMED, lang, 2)} = {fmt(op.electricalMW, lang, 3)} MW</span>
      </div>

      <h4>{c.energy}</h4>
      <div className={`flow${closed ? ' idle' : ''}`}>
        <div className="flow-row"><span>{c.hydraulic}</span><b>{fmt(ph, lang, 1)} MW</b></div>
        <div className="track"><div className="bar water" style={{ width: pct(ph) }} /></div>
        <div className="flow-row"><span>{c.electrical}</span><b>{fmt(pe, lang, 1)} MW</b></div>
        <div className="track"><div className="bar elec" style={{ width: pct(pe) }} /><div className="bar loss" style={{ width: pct(ph - pe) }} title={c.losses} /></div>
        <div className="flow-row dim"><span>{c.losses}</span><b>{fmt(ph - pe, lang, 1)} MW</b></div>
        <div className="scale"><span>0</span><span>{fmt(BAR_MAX, lang, 0)} MW</span></div>
      </div>

      <p className={`status${closed ? ' off' : ''}`} role="status"><i aria-hidden="true" />{closed ? c.statusClosed : c.statusSync}</p>
      <p className="note">{c.speedNote}</p>

      <div className="field">
        <label htmlFor="viz"><span>{c.viz}</span><output>{fmt(vizSpeed, lang, 2)}×</output></label>
        <input id="viz" type="range" min={0.25} max={2} step={0.25} value={vizSpeed} style={{ ['--v' as any]: `${((vizSpeed - 0.25) / 1.75) * 100}%` }}
          onChange={(e) => set({ vizSpeed: +e.target.value })} />
        <p className="note">{c.vizNote}</p>
      </div>

      <p className="note">{c.flowNote}</p>
      <p className="note">{c.etaNote}</p>
      <p className="disclaimer">{c.disclaimer}</p>
    </section>
  )
}
