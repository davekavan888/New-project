import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  computeNumerology,
  narrativeFromReport,
  computeCompatibility,
  type NumerologyReport,
  type NumerologyInput,
} from '@/services/numerology'
import { Sparkles, ShieldAlert, BookOpen } from 'lucide-react'

function NumberCard({
  title,
  value,
  planet,
  traits,
  isMaster,
}: {
  title: string
  value: number
  planet: string
  traits: string[]
  isMaster?: boolean
}) {
  return (
    <Card>
      <div className="text-xs font-semibold text-[#7a6a5c]">{title}</div>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-3xl font-bold text-[#2c241c] tabular-nums">{value}</span>
        {isMaster && (
          <span className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#5a9a4c]">
            Master
          </span>
        )}
      </div>
      <div className="text-xs text-[#6b4f3a] mt-1">{planet}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {traits.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full border border-[#6b4f3a]/15 bg-[#fffdf9] px-2 py-0.5 text-[10px] text-[#4a3428]"
          >
            {t}
          </span>
        ))}
      </div>
    </Card>
  )
}

function DetailBlock({ p }: { p: NumerologyReport['mulank'] }) {
  return (
    <Card>
      <div className="font-semibold text-[#2c241c]">
        {p.label}: {p.value}
      </div>
      <div className="text-xs text-[#7a6a5c] mb-3">{p.planet}</div>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <div className="text-xs font-semibold text-[#5a9a4c]">Strengths</div>
          <ul className="mt-1 list-disc pl-4 text-[#2c241c]">
            {p.strengths.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-[#7a3a2e]">Challenges</div>
          <ul className="mt-1 list-disc pl-4 text-[#2c241c]">
            {p.challenges.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-[#2f6f9e]">Path hints</div>
          <ul className="mt-1 list-disc pl-4 text-[#2c241c]">
            {p.careerHints.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-[#6b4f3a]">Relationships</div>
          <ul className="mt-1 list-disc pl-4 text-[#2c241c]">
            {p.relationshipHints.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}


function CompatBox({ defaultName }: { defaultName: string }) {
  const [other, setOther] = useState('')
  const [res, setRes] = useState<ReturnType<typeof computeCompatibility> | null>(null)
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="h-10 rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm"
          value={defaultName}
          readOnly
        />
        <input
          className="h-10 rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm"
          placeholder="Other full name"
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!other.trim()) return
          setRes(computeCompatibility(defaultName, other))
        }}
      >
        Compare names
      </Button>
      {res && (
        <div className="text-sm text-[#2c241c] rounded-xl border border-[#6b4f3a]/15 bg-[#fffdf9] p-3">
          <div className="font-semibold">
            {res.label} · {res.score}/100
          </div>
          <div className="text-xs text-[#7a6a5c] mt-1">
            Numbers {res.a} × {res.b}
          </div>
          <p className="mt-1">{res.note}</p>
        </div>
      )}
    </div>
  )
}

export function NumerologyPage() {
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [question, setQuestion] = useState('')
  const [report, setReport] = useState<NumerologyReport | null>(null)
  const [error, setError] = useState('')

  const story = useMemo(() => (report ? narrativeFromReport(report) : ''), [report])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !birthDate) {
      setError('Please enter full name and date of birth.')
      return
    }
    const r = computeNumerology({
      fullName,
      birthDate,
      gender: (gender || '') as NumerologyInput['gender'],
      question,
    })
    setReport(r)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#2c241c] flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[#5a9a4c]" />
          Sanātana Numerology
        </h1>
        <p className="text-sm text-[#7a6a5c] mt-1">
          Mūlāṅka · Bhāgyāṅka · Nāma aṅka — classical number map for self-reflection
        </p>
      </div>

      <Card className="border border-[#6b4f3a]/15 bg-[#a8d4e6]/15">
        <div className="flex gap-2 text-sm text-[#2c241c]">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[#6b4f3a]" />
          <p>
            For cultural and personal reflection only. <strong>Not</strong> financial advice and{' '}
            <strong>not</strong> linked to Nifty/BankNifty signals. Numbers describe tendencies —
            they do not control markets or destiny.
          </p>
        </div>
      </Card>

      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[#4a3428]">Full name (as used daily)</label>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c] outline-none focus:border-[#7eb8d4]"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kavya Sharma"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a3428]">Date of birth</label>
              <input
                type="date"
                className="mt-1 h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c] outline-none focus:border-[#7cbc6e]"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a3428]">Gender (optional)</label>
              <select
                className="mt-1 h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c]"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4a3428]">
                Focus question (optional)
              </label>
              <input
                className="mt-1 h-11 w-full rounded-xl border border-[#6b4f3a]/25 bg-[#fffdf9] px-3 text-sm text-[#2c241c]"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Career, relationships, this year…"
              />
            </div>
          </div>
          {error && <p className="text-sm text-[#b45a46]">{error}</p>}
          <Button type="submit">Generate reading</Button>
        </form>
      </Card>

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumberCard
              title={report.mulank.label}
              value={report.mulank.value}
              planet={report.mulank.planet}
              traits={report.mulank.traits}
              isMaster={report.mulank.isMaster}
            />
            <NumberCard
              title={report.bhagyank.label}
              value={report.bhagyank.value}
              planet={report.bhagyank.planet}
              traits={report.bhagyank.traits}
              isMaster={report.bhagyank.isMaster}
            />
            <NumberCard
              title={report.nameNumber.label}
              value={report.nameNumber.value}
              planet={report.nameNumber.planet}
              traits={report.nameNumber.traits}
              isMaster={report.nameNumber.isMaster}
            />
            <NumberCard
              title={report.soulNumber.label}
              value={report.soulNumber.value}
              planet={report.soulNumber.planet}
              traits={report.soulNumber.traits}
              isMaster={report.soulNumber.isMaster}
            />
            <NumberCard
              title={report.personalityNumber.label}
              value={report.personalityNumber.value}
              planet={report.personalityNumber.planet}
              traits={report.personalityNumber.traits}
              isMaster={report.personalityNumber.isMaster}
            />
            <NumberCard
              title={report.personalYear.label}
              value={report.personalYear.value}
              planet={report.personalYear.planet}
              traits={report.personalYear.traits}
              isMaster={report.personalYear.isMaster}
            />
          </div>

          <Card>
            <div className="flex items-center gap-2 font-semibold text-[#2c241c] mb-2">
              <BookOpen className="h-4 w-4 text-[#5a9a4c]" />
              Name × birth harmony
            </div>
            <div className="text-sm capitalize font-semibold text-[#4a3428]">
              {report.compound.nameBirthHarmony}
            </div>
            <p className="text-sm text-[#2c241c] mt-1">{report.compound.note}</p>
          </Card>

          <Card>
            <div className="font-semibold text-[#2c241c] mb-2">Focus points</div>
            <ul className="space-y-1 text-sm text-[#2c241c]">
              {report.dailyFocus.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </Card>

          <DetailBlock p={report.mulank} />
          <DetailBlock p={report.bhagyank} />
          <DetailBlock p={report.nameNumber} />

          <Card>
            <div className="font-semibold text-[#2c241c] mb-2">Guided reading</div>
            <pre className="whitespace-pre-wrap text-sm text-[#2c241c] font-sans leading-relaxed">
              {story}
            </pre>
          </Card>


          <Card>
            <div className="font-semibold text-[#2c241c] mb-2">Name compatibility (optional)</div>
            <p className="text-xs text-[#7a6a5c] mb-3">
              Cultural name-number blend only — not a scientific or relationship guarantee.
            </p>
            <CompatBox defaultName={report.input.fullName} />
          </Card>

          <p className="text-[10px] text-[#7a6a5c]">{report.disclaimer}</p>
        </>
      )}
    </div>
  )
}
