/**
 * Novaforge Numerology — classical calculations (Vedic-style + Pythagorean).
 * Educational / spiritual guidance only. Not finance, not science-certified prediction.
 */

export type NumerologyInput = {
  fullName: string
  birthDate: string // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other' | ''
  question?: string
}

export type NumberProfile = {
  value: number
  isMaster: boolean
  label: string
  planet: string
  traits: string[]
  strengths: string[]
  challenges: string[]
  careerHints: string[]
  relationshipHints: string[]
  luckyColors: string[]
  luckyDays: string[]
}

export type NumerologyReport = {
  input: NumerologyInput
  mulank: NumberProfile // root from day of birth (Indian)
  bhagyank: NumberProfile // life path from full DOB
  nameNumber: NumberProfile // expression from name (Pythagorean)
  soulNumber: NumberProfile // vowels
  personalityNumber: NumberProfile // consonants
  personalYear: NumberProfile
  compound: {
    nameBirthHarmony: 'supportive' | 'neutral' | 'tension'
    note: string
  }
  dailyFocus: string[]
  disclaimer: string
}

const PYTH: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

/** Keep master 11, 22, 33; else reduce to single digit */
export function reduceNumber(n: number, allowMaster = true): { value: number; isMaster: boolean } {
  if (!Number.isFinite(n) || n <= 0) return { value: 0, isMaster: false }
  let x = Math.abs(Math.floor(n))
  while (x > 9) {
    if (allowMaster && (x === 11 || x === 22 || x === 33)) {
      return { value: x, isMaster: true }
    }
    x = String(x)
      .split('')
      .reduce((s, d) => s + Number(d), 0)
  }
  return { value: x, isMaster: false }
}

function sumDigits(n: number): number {
  return String(Math.abs(Math.floor(n)))
    .split('')
    .reduce((s, d) => s + Number(d), 0)
}

const LIBRARY: Record<
  number,
  Omit<NumberProfile, 'value' | 'isMaster' | 'label'> & { title: string }
> = {
  1: {
    title: 'The Sun — Pioneer',
    planet: 'Sun (Surya)',
    traits: ['Leadership', 'Independence', 'Initiative', 'Willpower'],
    strengths: ['Courage to start', 'Clarity of self', 'Drive'],
    challenges: ['Ego clashes', 'Impatience', 'Working alone too much'],
    careerHints: ['Entrepreneurship', 'Management', 'Government', 'Creative direction'],
    relationshipHints: ['Needs respect and space', 'Attracted to loyal partners'],
    luckyColors: ['Red', 'Orange', 'Gold'],
    luckyDays: ['Sunday'],
  },
  2: {
    title: 'The Moon — Diplomat',
    planet: 'Moon (Chandra)',
    traits: ['Sensitivity', 'Cooperation', 'Intuition', 'Patience'],
    strengths: ['Empathy', 'Partnership skill', 'Listening'],
    challenges: ['Overthinking', 'Mood swings', 'Indecision'],
    careerHints: ['Counseling', 'Design', 'HR', 'Healing arts', 'Support roles'],
    relationshipHints: ['Needs emotional safety', 'Thrives in gentle bonds'],
    luckyColors: ['White', 'Cream', 'Light green'],
    luckyDays: ['Monday'],
  },
  3: {
    title: 'Jupiter — Expressor',
    planet: 'Jupiter (Guru)',
    traits: ['Creativity', 'Optimism', 'Communication', 'Teaching'],
    strengths: ['Inspiration', 'Social ease', 'Ideas'],
    challenges: ['Scattered focus', 'Exaggeration', 'Inconsistency'],
    careerHints: ['Writing', 'Media', 'Teaching', 'Sales', 'Arts'],
    relationshipHints: ['Needs fun and growth', 'Avoids dull routine'],
    luckyColors: ['Yellow', 'Purple'],
    luckyDays: ['Thursday'],
  },
  4: {
    title: 'Rahu — Builder',
    planet: 'Rahu',
    traits: ['Discipline', 'Structure', 'Practicality', 'Hard work'],
    strengths: ['Reliability', 'Systems thinking', 'Endurance'],
    challenges: ['Rigidity', 'Fear of change', 'Overwork'],
    careerHints: ['Engineering', 'Operations', 'Real estate', 'Process roles'],
    relationshipHints: ['Shows love through stability', 'Needs clear plans'],
    luckyColors: ['Blue', 'Grey'],
    luckyDays: ['Saturday'],
  },
  5: {
    title: 'Mercury — Explorer',
    planet: 'Mercury (Budh)',
    traits: ['Curiosity', 'Adaptability', 'Freedom', 'Wit'],
    strengths: ['Quick learning', 'Networking', 'Flexibility'],
    challenges: ['Restlessness', 'Commitment fears', 'Scattered energy'],
    careerHints: ['Travel', 'Trading', 'Marketing', 'Tech', 'Consulting'],
    relationshipHints: ['Needs variety and honesty', 'Dislikes control'],
    luckyColors: ['Green', 'Light tones'],
    luckyDays: ['Wednesday'],
  },
  6: {
    title: 'Venus — Nurturer',
    planet: 'Venus (Shukra)',
    traits: ['Responsibility', 'Harmony', 'Care', 'Aesthetics'],
    strengths: ['Loyalty', 'Service', 'Taste'],
    challenges: ['People-pleasing', 'Worry for others', 'Perfectionism'],
    careerHints: ['Hospitality', 'Healthcare', 'Design', 'Family business'],
    relationshipHints: ['Deeply devoted', 'Needs appreciation'],
    luckyColors: ['White', 'Light blue', 'Pink'],
    luckyDays: ['Friday'],
  },
  7: {
    title: 'Ketu — Seeker',
    planet: 'Ketu',
    traits: ['Analysis', 'Spirituality', 'Research', 'Depth'],
    strengths: ['Insight', 'Focus', 'Inner wisdom'],
    challenges: ['Isolation', 'Skepticism', 'Overthinking'],
    careerHints: ['Research', 'IT', 'Spirituality', 'Strategy', 'Investigation'],
    relationshipHints: ['Needs mental connection', 'Values solitude too'],
    luckyColors: ['Green', 'Sea green'],
    luckyDays: ['Tuesday', 'Thursday'],
  },
  8: {
    title: 'Saturn — Achiever',
    planet: 'Saturn (Shani)',
    traits: ['Ambition', 'Authority', 'Karma', 'Resilience'],
    strengths: ['Long-term vision', 'Discipline under pressure'],
    challenges: ['Delays', 'Heavy responsibility', 'Harsh self-judgment'],
    careerHints: ['Finance', 'Law', 'Industry', 'Leadership under stress'],
    relationshipHints: ['Slow to trust', 'Loyal once committed'],
    luckyColors: ['Black', 'Dark blue', 'Dark grey'],
    luckyDays: ['Saturday'],
  },
  9: {
    title: 'Mars — Humanitarian',
    planet: 'Mars (Mangal)',
    traits: ['Courage', 'Compassion', 'Idealism', 'Action'],
    strengths: ['Bravery', 'Generosity', 'Protective energy'],
    challenges: ['Impulsiveness', 'Emotional intensity', 'Burnout'],
    careerHints: ['Public service', 'Sports', 'Medicine', 'Activism', 'Defense'],
    relationshipHints: ['Passionate', 'Needs purpose shared with partner'],
    luckyColors: ['Red', 'Pink'],
    luckyDays: ['Tuesday'],
  },
  11: {
    title: 'Master 11 — Illuminator',
    planet: 'Moon elevated',
    traits: ['Intuition', 'Inspiration', 'Vision', 'Sensitivity'],
    strengths: ['Insight beyond logic', 'Inspiring others'],
    challenges: ['Nervous tension', 'Ideal vs reality gap'],
    careerHints: ['Coaching', 'Arts', 'Healing', 'Visionary roles'],
    relationshipHints: ['Needs spiritual/mental depth'],
    luckyColors: ['Silver', 'White'],
    luckyDays: ['Monday'],
  },
  22: {
    title: 'Master 22 — Master Builder',
    planet: 'Rahu elevated',
    traits: ['Large-scale vision', 'Practical mastery', 'Legacy'],
    strengths: ['Turning dreams into systems'],
    challenges: ['Pressure of responsibility', 'Burnout risk'],
    careerHints: ['Infrastructure', 'Institutions', 'Big projects'],
    relationshipHints: ['Needs a partner who respects mission'],
    luckyColors: ['Blue', 'Gold'],
    luckyDays: ['Saturday'],
  },
  33: {
    title: 'Master 33 — Master Teacher',
    planet: 'Jupiter elevated',
    traits: ['Compassion', 'Teaching', 'Healing service'],
    strengths: ['Uplifting many people'],
    challenges: ['Carrying others’ burdens'],
    careerHints: ['Education', 'Healing', 'Guidance roles'],
    relationshipHints: ['Love expressed as care and wisdom'],
    luckyColors: ['Yellow', 'Violet'],
    luckyDays: ['Thursday'],
  },
}

function profileFor(value: number, label: string): NumberProfile {
  const r = reduceNumber(value, true)
  const lib = LIBRARY[r.value] || LIBRARY[reduceNumber(r.value, false).value] || LIBRARY[9]
  return {
    value: r.value,
    isMaster: r.isMaster,
    label,
    planet: lib.planet,
    traits: lib.traits,
    strengths: lib.strengths,
    challenges: lib.challenges,
    careerHints: lib.careerHints,
    relationshipHints: lib.relationshipHints,
    luckyColors: lib.luckyColors,
    luckyDays: lib.luckyDays,
  }
}

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSum(name: string, mode: 'all' | 'vowels' | 'consonants'): number {
  const n = normalizeName(name).replace(/\s/g, '')
  let sum = 0
  for (const ch of n) {
    const isV = VOWELS.has(ch)
    if (mode === 'vowels' && !isV) continue
    if (mode === 'consonants' && isV) continue
    sum += PYTH[ch] || 0
  }
  return sum
}

export function computeNumerology(input: NumerologyInput): NumerologyReport {
  const name = input.fullName?.trim() || ''
  const [y, m, d] = (input.birthDate || '').split('-').map(Number)
  const day = d || 0
  const month = m || 0
  const year = y || 0

  const mulankRaw = day
  const bhagyankRaw = sumDigits(day) + sumDigits(month) + sumDigits(year)
  const nameRaw = nameSum(name, 'all')
  const soulRaw = nameSum(name, 'vowels')
  const persRaw = nameSum(name, 'consonants')

  const now = new Date()
  const personalYearRaw =
    sumDigits(day) + sumDigits(month) + sumDigits(now.getFullYear())

  const mulank = profileFor(mulankRaw, 'Mūlāṅka (Birth / Root number)')
  const bhagyank = profileFor(bhagyankRaw, 'Bhāgyāṅka (Life path)')
  const nameNumber = profileFor(nameRaw, 'Nāma aṅka (Name / Expression)')
  const soulNumber = profileFor(soulRaw, 'Soul urge (Vowels)')
  const personalityNumber = profileFor(persRaw, 'Personality (Consonants)')
  const personalYear = profileFor(personalYearRaw, `Personal year ${now.getFullYear()}`)

  const a = mulank.value > 9 ? reduceNumber(mulank.value, false).value : mulank.value
  const b = nameNumber.value > 9 ? reduceNumber(nameNumber.value, false).value : nameNumber.value
  const diff = Math.abs(a - b)
  let harmony: NumerologyReport['compound']['nameBirthHarmony'] = 'neutral'
  let note =
    'Name and birth numbers interact in a balanced way — neither strongly amplifying nor blocking each other.'
  if (diff === 0 || a + b === 9 || a === b) {
    harmony = 'supportive'
    note =
      'Name vibration aligns well with birth root — identity and outer path support each other when actions stay disciplined.'
  } else if (diff >= 5) {
    harmony = 'tension'
    note =
      'Name and birth numbers pull in different directions — growth often comes from balancing outer style with inner nature (not from forcing one side).'
  }

  const dailyFocus = [
    `Lead with ${mulank.traits[0]?.toLowerCase() || 'clarity'} (Mūlāṅka ${mulank.value}).`,
    `This year’s theme leans on ${personalYear.traits[0]?.toLowerCase() || 'learning'} (Personal year ${personalYear.value}).`,
    `Watch the shadow side: ${mulank.challenges[0] || 'imbalance'}.`,
    input.question?.trim()
      ? `On your question (“${input.question.trim().slice(0, 80)}”): weigh ${bhagyank.traits[0]} against patience — numerology guides attitude, not guaranteed outcomes.`
      : 'Use numbers as a mirror for character and timing — not as fixed fate.',
  ]

  return {
    input: { ...input, fullName: name },
    mulank,
    bhagyank,
    nameNumber,
    soulNumber,
    personalityNumber,
    personalYear,
    compound: { nameBirthHarmony: harmony, note },
    dailyFocus,
    disclaimer:
      'Sanātana-inspired numerology for reflection and culture-based guidance only. Not scientific proof, not medical/legal/financial advice, and not a market prediction system. Your effort and choices matter more than any number.',
  }
}

/** Short expert-style narrative from structured numbers (no LLM required). */
export function narrativeFromReport(r: NumerologyReport): string {
  const lines = [
    `${r.input.fullName || 'Seekers'}, your Mūlāṅka is ${r.mulank.value} (${r.mulank.planet}) — ${r.mulank.traits.join(', ')}.`,
    `Bhāgyāṅka ${r.bhagyank.value} describes the longer arc: ${r.bhagyank.strengths[0]}. Growth edge: ${r.bhagyank.challenges[0]}.`,
    `Name number ${r.nameNumber.value} shapes how the world often meets you: ${r.nameNumber.traits.slice(0, 3).join(', ')}.`,
    `Soul urge ${r.soulNumber.value} vs personality ${r.personalityNumber.value}: inner need versus outer mask — honour both.`,
    `Personal year ${r.personalYear.value}: ${r.personalYear.traits.join(', ')}.`,
    `Harmony check: ${r.compound.nameBirthHarmony}. ${r.compound.note}`,
    `Lucky colours (traditional): ${r.mulank.luckyColors.join(', ')}. Days: ${r.mulank.luckyDays.join(', ')}.`,
    r.disclaimer,
  ]
  return lines.join('\n\n')
}


/** Simple name-number compatibility (cultural, not scientific). */
export function computeCompatibility(nameA: string, nameB: string): {
  a: number
  b: number
  score: number
  label: string
  note: string
} {
  const sumName = (name: string) => {
    const n = name.toUpperCase().replace(/[^A-Z]/g, '')
    let s = 0
    for (const ch of n) s += PYTH[ch] || 0
    return reduceNumber(s, false).value
  }
  const a = sumName(nameA)
  const b = sumName(nameB)
  const diff = Math.abs(a - b)
  let score = 100 - diff * 12
  if (a === b) score = 92
  if (a + b === 9 || a + b === 10) score = Math.max(score, 85)
  score = Math.max(35, Math.min(95, score))
  let label = 'Neutral balance'
  let note = 'Different rhythms can still work with respect and clear communication.'
  if (score >= 80) {
    label = 'Supportive blend'
    note = 'Name vibrations sit close — ease comes when both honour shared goals.'
  } else if (score < 55) {
    label = 'Growth through difference'
    note = 'Contrast is high — harmony needs patience, not force. Not a verdict on love or business success.'
  }
  return { a, b, score, label, note }
}
