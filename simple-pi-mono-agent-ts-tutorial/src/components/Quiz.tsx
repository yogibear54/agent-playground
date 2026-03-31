import React, { useState } from 'react'
import type { QuizQuestion } from '../data/types'

interface QuizProps {
  questions: QuizQuestion[]
}

const QUIZ_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const Quiz: React.FC<QuizProps> = ({ questions }) => {
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  const allSelected = questions.every((_, i) => selected[i] !== undefined)

  const handleCheck = () => {
    if (allSelected) setChecked(true)
  }

  const handleReset = () => {
    setSelected({})
    setChecked(false)
  }

  return (
    <div className="quiz-section">
      <h3>📝 Knowledge Check</h3>
      {questions.map((q, qi) => (
        <div key={qi} className="quiz-question">
          <p>{qi + 1}. {q.question}</p>
          {q.options.map((opt, oi) => {
            let cls = 'quiz-option'
            if (selected[qi] === oi) cls += ' selected'
            if (checked && oi === q.correctIndex) cls += ' correct'
            if (checked && selected[qi] === oi && oi !== q.correctIndex) cls += ' incorrect'
            return (
              <div
                key={oi}
                className={cls}
                onClick={() => {
                  if (!checked) setSelected((s) => ({ ...s, [qi]: oi }))
                }}
              >
                <span className="quiz-option-marker">{QUIZ_LABELS[oi]}</span>
                <span>{opt}</span>
              </div>
            )
          })}
          {checked && (
            <div className={`quiz-feedback ${selected[qi] === q.correctIndex ? 'correct' : 'incorrect'}`}>
              {q.explanation}
            </div>
          )}
        </div>
      ))}
      {!checked ? (
        <button className="quiz-check-btn" disabled={!allSelected} onClick={handleCheck}>
          ✓ Check Answers
        </button>
      ) : (
        <button className="quiz-check-btn" onClick={handleReset}>
          ↻ Try Again
        </button>
      )}
    </div>
  )
}

export default Quiz
