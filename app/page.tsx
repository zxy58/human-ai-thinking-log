'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type PromptCategory = 'solution_request' | 'explanation' | 'debugging' | 'validation' | 'other'
type AppView = 'log' | 'dashboard' | 'teacher'
type SpecialType = 'none' | 'disruption' | 'assessment'

interface AIInteraction {
  id: string
  timestamp: string
  prompt: string
  category: PromptCategory
  responseSummary: string
  helpful: 'yes' | 'partial' | 'no' | ''
  dependency: number
}

interface WeekEntry {
  weekNumber: number
  specialType: SpecialType
  specialNotes: string
  preWork: {
    mainGoal: string
    priorKnowledge: string
    aiPlan: string
    dependencyExpected: number
  }
  interactions: AIInteraction[]
  authorship: {
    selfPct: number
    aiAssistedPct: number
    aiCopiedPct: number
    notes: string
  }
  postWork: {
    accomplished: string
    aiUseful: string
    aiNotUseful: string
    learned: string
    independenceRating: number
    nextStrategy: string
  }
}

type AllData = Record<number, WeekEntry>

// ── Curriculum Data ───────────────────────────────────────────────────────────

interface WeekMeta {
  week: number
  topic: string
  csConcepts: string[]
  aiStrategy: string
  strategyTip: string
}

const WEEKS: WeekMeta[] = [
  {
    week: 1, topic: 'Variables, Types & Python Setup',
    csConcepts: ['Data types (int, str, float, bool)', 'Variable assignment & naming', 'Type conversion', 'Using the REPL'],
    aiStrategy: 'Ask for explanations, not code',
    strategyTip: 'When confused, ask AI to explain the concept—don\'t ask it to write the code. You learn more by writing it yourself after understanding it.'
  },
  {
    week: 2, topic: 'Control Flow: Conditionals & Loops',
    csConcepts: ['if / elif / else', 'for loops & range()', 'while loops', 'Boolean operators (and, or, not)'],
    aiStrategy: 'Trace your logic before prompting',
    strategyTip: 'Walk through your code line-by-line before asking AI. Find the exact step where logic breaks, then ask a targeted question about that specific step.'
  },
  {
    week: 3, topic: 'Functions & Scope',
    csConcepts: ['Defining functions with def', 'Parameters vs. arguments', 'Return values', 'Local vs. global scope'],
    aiStrategy: 'Ask for multiple approaches',
    strategyTip: 'Ask AI to show you 2–3 ways to solve the problem. Compare them and explain in your log why you chose one—don\'t just copy the first answer.'
  },
  {
    week: 4, topic: 'Lists & Iteration',
    csConcepts: ['Indexing & slicing', 'List methods (.append, .sort, .pop)', 'List comprehensions', 'enumerate() and zip()'],
    aiStrategy: 'Test before you trust',
    strategyTip: 'Write 3 test cases for any code AI gives you. Does it handle edge cases—an empty list, a single item, duplicates? Prove it works before moving on.'
  },
  {
    week: 5, topic: 'Dictionaries & Data Structures',
    csConcepts: ['Key-value pairs & lookups', 'Nested dictionaries', 'Sets vs. lists', 'Choosing the right data structure'],
    aiStrategy: 'Ask AI to critique your design',
    strategyTip: 'Design your own solution first, then ask AI: "What are the weaknesses of this approach?" Use its critique to improve—not to replace your thinking.'
  },
  {
    week: 6, topic: 'File I/O & Error Handling',
    csConcepts: ['open() and file modes', 'try / except / finally', 'Common exceptions (FileNotFound, ValueError)', 'with statement context managers'],
    aiStrategy: 'Share your hypothesis when debugging',
    strategyTip: 'Don\'t just paste an error at AI. Tell it what you think is wrong and why, then ask if your theory is correct. This keeps your reasoning in the driver\'s seat.'
  },
  {
    week: 7, topic: 'OOP: Classes & Objects',
    csConcepts: ['__init__ and self', 'Instance vs. class attributes', 'Instance methods', 'Encapsulation principles'],
    aiStrategy: 'Ask about design before coding',
    strategyTip: 'Before writing a class, ask AI: "What should I consider when designing this?" Then make your own design decisions. Never let AI design the class for you.'
  },
  {
    week: 8, topic: 'OOP: Inheritance & Polymorphism',
    csConcepts: ['super() and method overriding', 'Abstract base classes', 'isinstance() and type checks', 'Polymorphism in practice'],
    aiStrategy: 'Push back when solutions don\'t fit',
    strategyTip: 'If AI gives a solution that doesn\'t match your constraints, push back explicitly. Practice saying: "That won\'t work because..." and re-prompting with specific context.'
  },
  {
    week: 9, topic: 'Recursion & Algorithm Thinking',
    csConcepts: ['Base case and recursive case', 'Call stack visualization', 'Divide & conquer strategy', 'Memoization intro'],
    aiStrategy: 'Ask AI to explain its reasoning',
    strategyTip: 'After AI gives an answer, ask: "Why does this approach work?" Don\'t adopt any solution you can\'t explain in your own words.'
  },
  {
    week: 10, topic: 'Sorting & Searching',
    csConcepts: ['Big O notation (O(n), O(log n), O(n²))', 'Binary search', 'Bubble sort, merge sort', 'When to choose which algorithm'],
    aiStrategy: 'Ask for tradeoff comparisons',
    strategyTip: 'When AI suggests an algorithm, ask: "What are the tradeoffs vs. [alternative]?" Understanding when NOT to use something is as important as how to use it.'
  },
  {
    week: 11, topic: 'APIs & Web Requests',
    csConcepts: ['HTTP methods (GET, POST, PUT, DELETE)', 'requests library & headers', 'JSON parsing', 'Status codes & error handling'],
    aiStrategy: 'Use AI for test data, not solutions',
    strategyTip: 'Ask AI to generate sample API responses or test JSON payloads. Write all the request logic yourself. Use AI as a data factory, not a code factory.'
  },
  {
    week: 12, topic: 'Databases & SQL',
    csConcepts: ['SELECT, INSERT, UPDATE, DELETE', 'WHERE clauses & filtering', 'JOIN operations', 'sqlite3 Python module'],
    aiStrategy: 'Design first, then get review',
    strategyTip: 'Design your own database schema first. Then ask AI to find weaknesses in it. Never let AI design the schema from scratch—schema design is a core skill to develop.'
  },
  {
    week: 13, topic: 'Testing & Debugging',
    csConcepts: ['unittest framework', 'Writing meaningful assertions', 'Edge case identification', 'Test-driven development basics'],
    aiStrategy: 'Use AI to stress-test your thinking',
    strategyTip: 'Write your own tests first, then ask AI: "What edge cases am I missing?" Use it to audit your test coverage—not to write the tests for you.'
  },
  {
    week: 14, topic: 'Git & Collaborative Development',
    csConcepts: ['Branching strategies', 'Pull requests & code review', 'Resolving merge conflicts', 'Good commit hygiene'],
    aiStrategy: 'AI for docs only — all code is yours',
    strategyTip: 'This week: use AI only for commit messages, comments, and README content. Write all code yourself. Notice how it feels to own 100% of the code.'
  },
  {
    week: 15, topic: 'Capstone Project Planning',
    csConcepts: ['Project scoping & MVP thinking', 'Architecture decisions', 'User stories & acceptance criteria', 'Presentation & documentation'],
    aiStrategy: 'Use AI to challenge your plan',
    strategyTip: 'Use AI to poke holes in your project plan. Ask: "What could go wrong?" and "What am I missing?" Make it a critic, not a planner.'
  }
]

const CAT_LABELS: Record<PromptCategory, string> = {
  solution_request: 'Solution Request',
  explanation: 'Explanation',
  debugging: 'Debugging',
  validation: 'Validation',
  other: 'Other'
}

const CAT_COLORS: Record<PromptCategory, string> = {
  solution_request: 'bg-rose-100 text-rose-800 border-rose-200',
  explanation: 'bg-teal-100 text-teal-800 border-teal-200',
  debugging: 'bg-amber-100 text-amber-800 border-amber-200',
  validation: 'bg-violet-100 text-violet-800 border-violet-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function categorize(prompt: string): PromptCategory {
  const t = prompt.toLowerCase()
  if (/\b(write|create|generate|give me|make me|build|code for|implement|complete|finish)\b/.test(t)) return 'solution_request'
  if (/\b(error|bug|fix|not working|broken|doesn't work|why isn't|wrong|crash|fail|issue)\b/.test(t)) return 'debugging'
  if (/\b(explain|what is|why|how does|help me understand|what are|what does|describe|define)\b/.test(t)) return 'explanation'
  if (/\b(is this|check|review|correct|right|better|should i|does this|am i|would this|look right|good)\b/.test(t)) return 'validation'
  return 'other'
}

function makeEmpty(w: number): WeekEntry {
  return {
    weekNumber: w, specialType: 'none', specialNotes: '',
    preWork: { mainGoal: '', priorKnowledge: '', aiPlan: '', dependencyExpected: 3 },
    interactions: [],
    authorship: { selfPct: 60, aiAssistedPct: 30, aiCopiedPct: 10, notes: '' },
    postWork: { accomplished: '', aiUseful: '', aiNotUseful: '', learned: '', independenceRating: 3, nextStrategy: '' }
  }
}

function isComplete(e: WeekEntry): boolean {
  return !!(e.postWork.accomplished && e.postWork.learned)
}

function hasAnyContent(e: WeekEntry): boolean {
  return !!(e.preWork.mainGoal || e.interactions.length > 0 || e.postWork.accomplished)
}

function exportCSV(data: AllData) {
  const headers = ['Week', 'Topic', 'Special', 'Dep. Expected', 'Independence', 'Self%', 'AI Assisted%', 'AI Copied%', 'Interactions', 'Solution Reqs', 'Explanations', 'Debugging', 'Validation', 'Accomplished', 'Learned']
  const rows = WEEKS.map(wm => {
    const e = data[wm.week]
    if (!e) return [String(wm.week), wm.topic, '', '', '', '', '', '', '', '', '', '', '', '', '']
    const cats = e.interactions.reduce((a, i) => { a[i.category] = (a[i.category] || 0) + 1; return a }, {} as Record<string, number>)
    return [
      String(wm.week), wm.topic, e.specialType,
      String(e.preWork.dependencyExpected), String(e.postWork.independenceRating),
      String(e.authorship.selfPct), String(e.authorship.aiAssistedPct), String(e.authorship.aiCopiedPct),
      String(e.interactions.length),
      String(cats.solution_request || 0), String(cats.explanation || 0), String(cats.debugging || 0), String(cats.validation || 0),
      e.postWork.accomplished.replace(/"/g, '""'), e.postWork.learned.replace(/"/g, '""')
    ]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'ai-thinking-log.csv'; a.click()
}

function exportJSON(data: AllData) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ weeks: WEEKS, entries: data }, null, 2)], { type: 'application/json' }))
  a.download = 'ai-thinking-log.json'; a.click()
}

// ── Base Components ───────────────────────────────────────────────────────────

function Textarea({ value, onChange, placeholder, rows = 2, className = '' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full resize-none border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder-gray-300 ${className}`}
    />
  )
}

function RatingDots({ value, max = 5, color = 'bg-indigo-500' }: { value: number; max?: number; color?: string }) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < value ? color : 'bg-gray-200'}`} />
      ))}
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400 mb-2 leading-relaxed">{children}</p>
}

function SectionHead({ color, label, icon }: { color: string; label: string; icon: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${color} mb-5 w-fit`}>
      <span>{icon}</span> {label}
    </div>
  )
}

// ── Pre-Work Section ──────────────────────────────────────────────────────────

function PreWorkSection({ entry, update }: { entry: WeekEntry; update: (e: WeekEntry) => void }) {
  const set = useCallback((k: keyof WeekEntry['preWork'], v: string | number) =>
    update({ ...entry, preWork: { ...entry.preWork, [k]: v } }), [entry, update])

  return (
    <div className="space-y-5">
      <SectionHead color="bg-teal-50 text-teal-800" label="Pre-Work Reflection" icon="◎" />

      <div>
        <Label>What is the main coding challenge or goal for today&apos;s session?</Label>
        <Textarea value={entry.preWork.mainGoal} onChange={v => set('mainGoal', v)}
          placeholder="Describe what you're trying to build or fix today..." />
      </div>

      <div>
        <Label>What do you already know that&apos;s relevant to today&apos;s work?</Label>
        <Hint>Where do you feel confident? What feels unclear or new?</Hint>
        <Textarea value={entry.preWork.priorKnowledge} onChange={v => set('priorKnowledge', v)}
          placeholder="I already understand... / I'm less sure about..." />
      </div>

      <div>
        <Label>How do you plan to use AI today? (Be specific)</Label>
        <Hint>e.g. &quot;I&apos;ll ask AI to explain concepts but write all code myself&quot; or &quot;I&apos;ll only use AI to check my work after I&apos;ve attempted it.&quot;</Hint>
        <Textarea value={entry.preWork.aiPlan} onChange={v => set('aiPlan', v)}
          placeholder="My plan for using AI today is..." />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <Label>Expected AI dependency (1 = fully independent, 5 = heavy reliance)</Label>
          <span className="text-lg font-bold text-teal-700">{entry.preWork.dependencyExpected}</span>
        </div>
        <input type="range" min={1} max={5} value={entry.preWork.dependencyExpected}
          onChange={e => set('dependencyExpected', Number(e.target.value))}
          className="w-full accent-teal-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 — Fully independent</span><span>3 — Balanced</span><span>5 — Heavy AI use</span>
        </div>
      </div>
    </div>
  )
}

// ── Interaction Logger ─────────────────────────────────────────────────────────

function InteractionSection({ entry, update }: { entry: WeekEntry; update: (e: WeekEntry) => void }) {
  const [prompt, setPrompt] = useState('')
  const [summary, setSummary] = useState('')
  const [helpful, setHelpful] = useState<AIInteraction['helpful']>('')
  const [dep, setDep] = useState(3)
  const [catOverride, setCatOverride] = useState<PromptCategory | ''>('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const predictedCat = prompt.trim() ? categorize(prompt) : null
  const finalCat = (catOverride || predictedCat || 'other') as PromptCategory

  function addInteraction() {
    if (!prompt.trim()) return
    const item: AIInteraction = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      prompt: prompt.trim(),
      category: finalCat,
      responseSummary: summary.trim(),
      helpful,
      dependency: dep
    }
    update({ ...entry, interactions: [...entry.interactions, item] })
    setPrompt(''); setSummary(''); setHelpful(''); setDep(3); setCatOverride('')
  }

  function removeInteraction(id: string) {
    update({ ...entry, interactions: entry.interactions.filter(i => i.id !== id) })
  }

  const catCounts = entry.interactions.reduce((a, i) => {
    a[i.category] = (a[i.category] || 0) + 1; return a
  }, {} as Partial<Record<PromptCategory, number>>)

  return (
    <div className="space-y-5">
      <SectionHead color="bg-amber-50 text-amber-800" label="AI Interaction Log" icon="⚡" />

      {/* Quick-log form */}
      <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30 space-y-3">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Quick Log — Add a Prompt</p>

        <div>
          <Label>Your prompt to AI</Label>
          <Textarea value={prompt} onChange={setPrompt} rows={2}
            placeholder="Paste or type the prompt you gave to the AI..." />
          {predictedCat && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-gray-400">Auto-detected:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[finalCat]}`}>
                {CAT_LABELS[finalCat]}
              </span>
              <select value={catOverride} onChange={e => setCatOverride(e.target.value as PromptCategory | '')}
                className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 bg-white">
                <option value="">Auto-detect</option>
                {(Object.keys(CAT_LABELS) as PromptCategory[]).map(k => (
                  <option key={k} value={k}>{CAT_LABELS[k]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <Label>AI response summary (1–2 sentences)</Label>
          <Textarea value={summary} onChange={setSummary} rows={2}
            placeholder="What did the AI tell you? Summarize briefly..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Was it helpful?</Label>
            <div className="flex gap-2 mt-1">
              {(['yes', 'partial', 'no'] as const).map(h => (
                <button key={h} onClick={() => setHelpful(h)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    helpful === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>
                  {h === 'yes' ? 'Yes' : h === 'partial' ? 'Partial' : 'No'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label>Dependency level</Label>
              <span className="text-sm font-bold text-amber-700">{dep}/5</span>
            </div>
            <input type="range" min={1} max={5} value={dep}
              onChange={e => setDep(Number(e.target.value))}
              className="w-full accent-amber-600" />
          </div>
        </div>

        <button onClick={addInteraction} disabled={!prompt.trim()}
          className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          + Log This Interaction
        </button>
      </div>

      {/* Category summary */}
      {entry.interactions.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {(['solution_request', 'explanation', 'debugging', 'validation'] as PromptCategory[]).map(k => (
            <div key={k} className={`rounded-xl p-2.5 text-center border ${CAT_COLORS[k]}`}>
              <div className="text-xl font-bold">{catCounts[k] || 0}</div>
              <div className="text-xs leading-tight mt-0.5">{CAT_LABELS[k]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Interaction cards */}
      {entry.interactions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">{entry.interactions.length} interaction{entry.interactions.length !== 1 ? 's' : ''} logged</p>
          {entry.interactions.map(i => (
            <div key={i.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[i.category]}`}>
                      {CAT_LABELS[i.category]}
                    </span>
                    {i.helpful && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        i.helpful === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                        i.helpful === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {i.helpful === 'yes' ? 'Helpful' : i.helpful === 'partial' ? 'Partial' : 'Not helpful'}
                      </span>
                    )}
                    <RatingDots value={i.dependency} color="bg-amber-400" />
                    <span className="text-xs text-gray-400 ml-auto">{i.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{i.prompt}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); removeInteraction(i.id) }}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none shrink-0 transition-colors">×</button>
              </div>
              {expanded === i.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 bg-gray-50/50">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Full prompt</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{i.prompt}</p>
                  </div>
                  {i.responseSummary && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">AI response summary</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{i.responseSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
          No interactions logged yet. Use the form above to capture your first AI prompt.
        </p>
      )}
    </div>
  )
}

// ── Code Authorship ───────────────────────────────────────────────────────────

function AuthorshipSection({ entry, update }: { entry: WeekEntry; update: (e: WeekEntry) => void }) {
  const set = useCallback((k: keyof WeekEntry['authorship'], v: string | number) =>
    update({ ...entry, authorship: { ...entry.authorship, [k]: v } }), [entry, update])

  const { selfPct, aiAssistedPct, aiCopiedPct } = entry.authorship
  const total = selfPct + aiAssistedPct + aiCopiedPct
  const norm = total > 0 ? 100 / total : 1

  return (
    <div className="space-y-5">
      <SectionHead color="bg-violet-50 text-violet-800" label="Code Authorship" icon="✎" />
      <Hint>Estimate the breakdown of code written during this session. Approximate is fine—the goal is honest reflection.</Hint>

      <div className="space-y-4">
        {([
          ['selfPct', 'Written by me (independently)', 'accent-emerald-600', 'text-emerald-700', 'bg-emerald-500'],
          ['aiAssistedPct', 'AI-assisted (I understood and adapted it)', 'accent-violet-600', 'text-violet-700', 'bg-violet-500'],
          ['aiCopiedPct', 'AI-copied (pasted without fully adapting)', 'accent-rose-500', 'text-rose-600', 'bg-rose-400'],
        ] as const).map(([key, label, accent, textColor]) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <Label>{label}</Label>
              <span className={`text-sm font-bold ${textColor}`}>{entry.authorship[key]}%</span>
            </div>
            <input type="range" min={0} max={100} value={entry.authorship[key]}
              onChange={e => set(key, Number(e.target.value))}
              className={`w-full ${accent}`} />
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div>
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
          {[
            [selfPct * norm, 'bg-emerald-500'],
            [aiAssistedPct * norm, 'bg-violet-500'],
            [aiCopiedPct * norm, 'bg-rose-400'],
          ].filter(([p]) => (p as number) > 0).map(([p, color], i) => (
            <div key={i} className={`h-full ${color} transition-all`} style={{ width: `${p}%` }} />
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Independent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />AI-assisted</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />AI-copied</span>
        </div>
      </div>

      <div>
        <Label>Notes on authorship choices this session</Label>
        <Textarea value={entry.authorship.notes} onChange={v => set('notes', v)}
          placeholder="Where did you consciously write code yourself? Where did you lean on AI and why?" />
      </div>
    </div>
  )
}

// ── Post-Work Reflection ──────────────────────────────────────────────────────

function PostWorkSection({ entry, update }: { entry: WeekEntry; update: (e: WeekEntry) => void }) {
  const set = useCallback((k: keyof WeekEntry['postWork'], v: string | number) =>
    update({ ...entry, postWork: { ...entry.postWork, [k]: v } }), [entry, update])

  const gap = entry.postWork.independenceRating - (6 - entry.preWork.dependencyExpected)

  return (
    <div className="space-y-5">
      <SectionHead color="bg-emerald-50 text-emerald-800" label="Post-Work Reflection" icon="★" />

      <div>
        <Label>What did you actually accomplish today?</Label>
        <Textarea value={entry.postWork.accomplished} onChange={v => set('accomplished', v)}
          placeholder="What code did you write? What problems did you solve?" />
      </div>

      <div>
        <Label>Where was AI most useful today?</Label>
        <Hint>Be specific—not just &quot;it helped me.&quot; What exactly did it help with?</Hint>
        <Textarea value={entry.postWork.aiUseful} onChange={v => set('aiUseful', v)}
          placeholder="AI was most useful when..." />
      </div>

      <div>
        <Label>Where was AI NOT useful or misleading?</Label>
        <Textarea value={entry.postWork.aiNotUseful} onChange={v => set('aiNotUseful', v)}
          placeholder="AI wasn't helpful when... / AI was wrong about..." />
      </div>

      <div>
        <Label>What did YOU actually learn today (not just what AI did)?</Label>
        <Hint>This is the most important question. What understanding do you now have that you didn&apos;t before?</Hint>
        <Textarea value={entry.postWork.learned} onChange={v => set('learned', v)}
          placeholder="I now understand..." />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <Label>Actual independence rating (1 = relied heavily on AI, 5 = barely used AI)</Label>
          <span className="text-lg font-bold text-emerald-700">{entry.postWork.independenceRating}</span>
        </div>
        <input type="range" min={1} max={5} value={entry.postWork.independenceRating}
          onChange={e => set('independenceRating', Number(e.target.value))}
          className="w-full accent-emerald-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 — Needed AI for everything</span><span>5 — Barely touched AI</span>
        </div>
        {entry.preWork.dependencyExpected > 0 && entry.postWork.independenceRating > 0 && (
          <p className={`text-xs mt-2 font-medium ${gap > 0 ? 'text-emerald-600' : gap < 0 ? 'text-rose-500' : 'text-gray-500'}`}>
            {gap > 0
              ? '↑ More independent than you expected — nice work.'
              : gap < 0
              ? '↓ Leaned on AI more than planned. What got in the way?'
              : '→ Matched your plan.'}
          </p>
        )}
      </div>

      <div>
        <Label>Your AI strategy for next session</Label>
        <Hint>Based on what you learned today, what will you do differently?</Hint>
        <Textarea value={entry.postWork.nextStrategy} onChange={v => set('nextStrategy', v)}
          placeholder="Next time I will..." />
      </div>
    </div>
  )
}

// ── Special Entry ─────────────────────────────────────────────────────────────

function SpecialSection({ entry, update }: { entry: WeekEntry; update: (e: WeekEntry) => void }) {
  return (
    <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/40 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-rose-700">Mark as special entry:</p>
        <div className="flex gap-1.5">
          {(['none', 'disruption', 'assessment'] as SpecialType[]).map(t => (
            <button key={t} onClick={() => update({ ...entry, specialType: t })}
              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors ${
                entry.specialType === t
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
              }`}>
              {t === 'none' ? 'Normal week' : t === 'disruption' ? '⚠ Disruption' : '📋 Assessment'}
            </button>
          ))}
        </div>
      </div>
      {entry.specialType !== 'none' && (
        <Textarea value={entry.specialNotes}
          onChange={v => update({ ...entry, specialNotes: v })}
          placeholder={entry.specialType === 'disruption'
            ? 'What disrupted normal work this week? (sub teacher, sick day, fire drill, schedule change...)'
            : 'What was assessed? What did it cover? Any notes on how it went?'} />
      )}
    </div>
  )
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard({ data }: { data: AllData }) {
  const entries = WEEKS.map(w => data[w.week]).filter(Boolean) as WeekEntry[]
  const completed = entries.filter(isComplete)
  const allInteractions = entries.flatMap(e => e.interactions)
  const catTotals = allInteractions.reduce((a, i) => {
    a[i.category] = (a[i.category] || 0) + 1; return a
  }, {} as Partial<Record<PromptCategory, number>>)
  const total = allInteractions.length

  const indepData = WEEKS.map(w => data[w.week]?.postWork.independenceRating ?? null)
  const depData = WEEKS.map(w => data[w.week]?.preWork.dependencyExpected ?? null)

  const withAuth = entries.filter(e => e.authorship.selfPct + e.authorship.aiAssistedPct + e.authorship.aiCopiedPct > 0)
  const avgSelf = withAuth.length ? Math.round(withAuth.reduce((a, e) => a + e.authorship.selfPct, 0) / withAuth.length) : 0
  const avgAssisted = withAuth.length ? Math.round(withAuth.reduce((a, e) => a + e.authorship.aiAssistedPct, 0) / withAuth.length) : 0
  const avgCopied = withAuth.length ? Math.round(withAuth.reduce((a, e) => a + e.authorship.aiCopiedPct, 0) / withAuth.length) : 0
  const diverseWeeks = entries.filter(e => new Set(e.interactions.map(i => i.category)).size >= 3).length

  function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
    const pts = values.reduce<Array<{ x: number; y: number }>>((acc, v, i) => {
      if (v !== null) {
        acc.push({ x: 12 + (i / (values.length - 1)) * 376, y: 52 - ((v - 1) / 4) * 44 })
      }
      return acc
    }, [])
    if (pts.length < 2) return <p className="text-xs text-gray-400 py-4 text-center">Complete more weeks to see your trend</p>
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    return (
      <svg viewBox="0 0 400 64" className="w-full">
        {[1, 2, 3, 4, 5].map(v => (
          <line key={v} x1="12" y1={52 - ((v - 1) / 4) * 44} x2="388" y2={52 - ((v - 1) / 4) * 44}
            stroke="#f3f4f6" strokeWidth="1" />
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} />)}
      </svg>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Progress</h2>
        <p className="text-sm text-gray-500 mt-1">{completed.length} of 15 weeks complete · {total} AI interactions logged</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Weeks Complete', value: `${completed.length}/15`, color: 'text-emerald-600' },
          { label: 'AI Interactions', value: total, color: 'text-amber-600' },
          { label: 'Strategy Diversity', value: `${diverseWeeks} wk`, color: 'text-violet-600' },
          { label: 'Avg Self-Written', value: `${avgSelf}%`, color: 'text-teal-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Week completion grid */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Week Completion</h3>
        <div className="flex flex-wrap gap-2">
          {WEEKS.map(wm => {
            const e = data[wm.week]
            const done = e && isComplete(e)
            const started = e && hasAnyContent(e)
            return (
              <div key={wm.week} title={`Week ${wm.week}: ${wm.topic}`}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold cursor-default ${
                  done ? 'bg-emerald-500 text-white' : started ? 'bg-amber-300 text-amber-900' : 'bg-gray-100 text-gray-400'
                }`}>
                {wm.week}
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" />Complete</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-300" />In progress</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200" />Not started</span>
        </div>
      </div>

      {/* Growth charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Independence Rating Over Time</h3>
          <p className="text-xs text-gray-400 mb-3">Higher = more independent from AI (post-session self-report)</p>
          <Sparkline values={indepData} color="#10b981" />
          <div className="flex justify-between text-xs text-gray-300 mt-1 px-3"><span>Wk 1</span><span>Wk 15</span></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Expected Dependency Over Time</h3>
          <p className="text-xs text-gray-400 mb-3">Your pre-session self-assessment of expected AI reliance</p>
          <Sparkline values={depData} color="#6366f1" />
          <div className="flex justify-between text-xs text-gray-300 mt-1 px-3"><span>Wk 1</span><span>Wk 15</span></div>
        </div>
      </div>

      {/* Prompt strategy mix */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Prompt Strategy Mix</h3>
        {total === 0 ? (
          <p className="text-sm text-gray-400">Log AI interactions to see your strategy breakdown.</p>
        ) : (
          <div className="space-y-2.5">
            {(Object.keys(CAT_LABELS) as PromptCategory[]).map(cat => {
              const count = catTotals[cat] || 0
              const pct = Math.round((count / total) * 100)
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-right text-gray-500 shrink-0">{CAT_LABELS[cat]}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      cat === 'solution_request' ? 'bg-rose-400' :
                      cat === 'explanation' ? 'bg-teal-400' :
                      cat === 'debugging' ? 'bg-amber-400' :
                      cat === 'validation' ? 'bg-violet-400' : 'bg-gray-300'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-20 text-xs text-gray-400 shrink-0">{count} ({pct}%)</div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
          Aim for a healthy mix of explanations, debugging, and validation. Heavy solution requests may mean skipping the thinking step.
        </p>
      </div>

      {/* Average authorship */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Average Code Authorship</h3>
        {withAuth.length === 0 ? (
          <p className="text-sm text-gray-400">Track code authorship each week to see trends here.</p>
        ) : (
          <>
            <div className="h-5 rounded-full overflow-hidden flex bg-gray-100 mb-2">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${avgSelf}%` }} />
              <div className="bg-violet-500 h-full transition-all" style={{ width: `${avgAssisted}%` }} />
              <div className="bg-rose-400 h-full transition-all" style={{ width: `${avgCopied}%` }} />
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Self ~{avgSelf}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />AI-assisted ~{avgAssisted}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" />AI-copied ~{avgCopied}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Teacher Analytics ─────────────────────────────────────────────────────────

function TeacherView({ data, onExportCSV, onExportJSON }: {
  data: AllData
  onExportCSV: () => void
  onExportJSON: () => void
}) {
  const allInteractions = Object.values(data).flatMap(e => e.interactions)
  const completedEntries = WEEKS.filter(w => data[w.week] && isComplete(data[w.week]))
  const diverseWeeks = Object.values(data).filter(e => new Set(e.interactions.map(i => i.category)).size >= 3).length

  const atRisk = WEEKS.filter(wm => {
    const e = data[wm.week]
    if (!e || !isComplete(e)) return false
    const solReqs = e.interactions.filter(i => i.category === 'solution_request').length
    return e.postWork.independenceRating <= 2 && (e.interactions.length === 0 || solReqs / e.interactions.length > 0.5)
  })

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teacher Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Overview of AI use patterns across the 15-week curriculum</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExportCSV}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            Export CSV
          </button>
          <button onClick={onExportJSON}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Weeks Complete', value: completedEntries.length, sub: 'of 15', color: 'text-emerald-600' },
          { label: 'AI Interactions', value: allInteractions.length, sub: 'total prompts logged', color: 'text-amber-600' },
          { label: 'Strategy Diversity', value: `${diverseWeeks} wk`, sub: '3+ prompt types used', color: 'text-violet-600' },
          { label: 'At-Risk Patterns', value: atRisk.length, sub: 'weeks need attention', color: 'text-rose-600' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-sm font-medium text-gray-700">{c.label}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>

      {atRisk.length > 0 && (
        <div className="border border-rose-200 bg-rose-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-rose-800 mb-2">⚠ Weeks with High AI Dependency Pattern</p>
          <div className="space-y-1.5">
            {atRisk.map(wm => {
              const e = data[wm.week]!
              const solReqs = e.interactions.filter(i => i.category === 'solution_request').length
              return (
                <div key={wm.week} className="flex items-baseline gap-3 text-sm flex-wrap">
                  <span className="font-semibold text-rose-700 shrink-0">Week {wm.week}: {wm.topic}</span>
                  <span className="text-xs text-rose-500">
                    Independence: {e.postWork.independenceRating}/5 · {solReqs} solution request{solReqs !== 1 ? 's' : ''} of {e.interactions.length} total
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Wk', 'Topic', 'Status', 'Dep↑', 'Indep↑', 'Prompts', 'Sol.Req', 'Self%', 'Special'].map(h => (
                  <th key={h} className={`px-3 py-3 font-semibold text-gray-600 text-xs ${h === 'Wk' || h === 'Topic' ? 'text-left px-4' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKS.map(wm => {
                const e = data[wm.week]
                const done = e && isComplete(e)
                const started = e && hasAnyContent(e)
                const solReqs = e ? e.interactions.filter(i => i.category === 'solution_request').length : 0
                const isHighDep = e && e.postWork.independenceRating <= 2 && done
                return (
                  <tr key={wm.week} className={`border-b border-gray-100 ${isHighDep ? 'bg-rose-50/40' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-500 text-xs">{wm.week}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">{wm.topic}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-500' : started ? 'bg-amber-400' : 'bg-gray-200'}`} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{e ? e.preWork.dependencyExpected : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{e ? e.postWork.independenceRating : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{e ? e.interactions.length : '—'}</td>
                    <td className={`px-3 py-2.5 text-center text-xs font-medium ${solReqs > 3 ? 'text-rose-600' : 'text-gray-500'}`}>
                      {e ? solReqs : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{e ? `${e.authorship.selfPct}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400 capitalize">{e?.specialType !== 'none' ? e?.specialType : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Reading This Dashboard</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
          <li><strong>Dep↑</strong>: Expected AI dependency before session (1=low, 5=high). Consistently high may indicate low confidence.</li>
          <li><strong>Indep↑</strong>: Self-reported independence after session (1=relied heavily, 5=barely used AI). Low ratings warrant a check-in.</li>
          <li><strong>Sol.Req</strong>: Solution request prompts. Red if &gt;3 — may indicate the student is skipping the thinking step.</li>
          <li><strong>Highlighted rows</strong>: Independence ≤ 2 AND &gt;50% solution requests — potential at-risk pattern worth discussing.</li>
        </ul>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'human-ai-thinking-log-v2'

export default function Page() {
  const [data, setData] = useState<AllData>({})
  const [activeWeek, setActiveWeek] = useState(1)
  const [view, setView] = useState<AppView>('log')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 1500)
      return () => clearTimeout(t)
    } catch {}
  }, [data])

  const currentEntry = data[activeWeek] || makeEmpty(activeWeek)
  const currentMeta = WEEKS[activeWeek - 1]

  const updateEntry = useCallback((entry: WeekEntry) => {
    setData(prev => ({ ...prev, [entry.weekNumber]: entry }))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="shrink-0">
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">HUMAN × AI</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">15-Week CS Thinking Log</p>
          </div>
          <nav className="flex bg-gray-100 rounded-lg p-1">
            {([['log', 'Weekly Log'], ['dashboard', 'My Progress'], ['teacher', 'Teacher View']] as [AppView, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {saved && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
            <button
              onClick={() => {
                if (confirm('Clear all data for all 15 weeks? This cannot be undone.')) {
                  setData({})
                  localStorage.removeItem(STORAGE_KEY)
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">Reset</button>
            <button onClick={() => window.print()}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">Print</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar (desktop, log view only) */}
        {view === 'log' && (
          <aside className="hidden lg:block w-56 shrink-0 border-r border-gray-200 bg-white">
            <div className="p-3 sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Weeks</p>
              <div className="space-y-0.5">
                {WEEKS.map(wm => {
                  const e = data[wm.week]
                  const done = e && isComplete(e)
                  const started = e && hasAnyContent(e)
                  return (
                    <button key={wm.week} onClick={() => setActiveWeek(wm.week)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        activeWeek === wm.week ? 'bg-indigo-50 text-indigo-800' : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <span className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold shrink-0 ${
                        done ? 'bg-emerald-100 text-emerald-700' :
                        started ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>{wm.week}</span>
                      <span className={`text-xs leading-tight truncate ${activeWeek === wm.week ? 'font-semibold' : ''}`}>
                        {wm.topic}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-auto min-w-0">
          {view === 'log' && (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
              {/* Mobile week selector */}
              <select value={activeWeek} onChange={e => setActiveWeek(Number(e.target.value))}
                className="lg:hidden text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 w-full">
                {WEEKS.map(wm => {
                  const e = data[wm.week]
                  const status = e && isComplete(e) ? '✓' : e && hasAnyContent(e) ? '…' : '○'
                  return <option key={wm.week} value={wm.week}>{status} Week {wm.week}: {wm.topic}</option>
                })}
              </select>

              {/* Week header */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Week {currentMeta.week} of 15</p>
                    <h2 className="text-xl font-bold text-indigo-900 leading-tight">{currentMeta.topic}</h2>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setActiveWeek(w => Math.max(1, w - 1))} disabled={activeWeek === 1}
                      className="w-8 h-8 rounded-lg border border-indigo-200 bg-white text-indigo-400 disabled:opacity-30 hover:bg-indigo-50 text-sm font-bold transition-colors">‹</button>
                    <button onClick={() => setActiveWeek(w => Math.min(15, w + 1))} disabled={activeWeek === 15}
                      className="w-8 h-8 rounded-lg border border-indigo-200 bg-white text-indigo-400 disabled:opacity-30 hover:bg-indigo-50 text-sm font-bold transition-colors">›</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/60 rounded-xl p-3 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-2">CS Concepts</p>
                    <ul className="space-y-1">
                      {currentMeta.csConcepts.map(c => (
                        <li key={c} className="text-xs text-indigo-800 flex gap-1.5 leading-relaxed">
                          <span className="shrink-0">·</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">AI Strategy This Week</p>
                    <p className="text-sm font-bold text-indigo-900 mb-1.5">{currentMeta.aiStrategy}</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">{currentMeta.strategyTip}</p>
                  </div>
                </div>

                <SpecialSection entry={currentEntry} update={updateEntry} />

                {isComplete(currentEntry) && (
                  <div className="mt-3 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <span>✓</span> This week is marked complete
                  </div>
                )}
              </div>

              {/* Log sections */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <PreWorkSection entry={currentEntry} update={updateEntry} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <InteractionSection entry={currentEntry} update={updateEntry} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <AuthorshipSection entry={currentEntry} update={updateEntry} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <PostWorkSection entry={currentEntry} update={updateEntry} />
              </div>

              <p className="text-center text-xs text-gray-300 pb-4">All data is saved locally in your browser.</p>
            </div>
          )}

          {view === 'dashboard' && <StudentDashboard data={data} />}
          {view === 'teacher' && (
            <TeacherView data={data} onExportCSV={() => exportCSV(data)} onExportJSON={() => exportJSON(data)} />
          )}
        </main>
      </div>
    </div>
  )
}
