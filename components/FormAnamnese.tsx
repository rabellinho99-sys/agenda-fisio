"use client";

import { agrupar, type Answers, type Field } from "@/lib/anamnese";

export function FormAnamnese({ fields, answers, onChange }: { fields: Field[]; answers: Answers; onChange: (a: Answers) => void }) {
  const set = (k: string, v: Answers[string]) => onChange({ ...answers, [k]: v });
  return (
    <div className="space-y-6">
      {agrupar(fields).map((sec) => (
        <div key={sec.nome}>
          <p className="mb-2 text-sm font-bold text-moss-deep">{sec.nome}</p>
          <div className="space-y-3">
            {sec.campos.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}{f.required && <span className="text-danger"> *</span>}</label>
                {f.type === "text" && <input className="field" value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />}
                {f.type === "textarea" && <textarea className="field" rows={2} value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />}
                {f.type === "number" && <input type="number" className="field" value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))} />}
                {f.type === "date" && <input type="date" className="field" value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />}
                {f.type === "yesno" && (
                  <div className="flex gap-2">
                    {[["Sim", true], ["Não", false]].map(([l, v]) => (
                      <button key={String(v)} type="button" onClick={() => set(f.key, v as boolean)}
                        className={`rounded-lg px-4 py-2 font-semibold ${answers[f.key] === v ? "bg-moss text-white" : "border border-mist bg-white"}`}>{l}</button>
                    ))}
                  </div>
                )}
                {f.type === "select" && (
                  <select className="field" value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">Selecione</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.type === "scale" && (
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button key={i} type="button" onClick={() => set(f.key, i)}
                        className={`h-10 w-10 rounded-lg font-bold ${answers[f.key] === i ? "bg-amber text-ink" : "border border-mist bg-white"}`}>{i}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
