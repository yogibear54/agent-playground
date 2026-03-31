import React, { useState, useEffect, useCallback } from 'react'
import { chapters } from './chapters'
import Quiz from './components/Quiz'

const STORAGE_KEY = 'tutorial-progress'

function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

const App: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState(0)
  const [completed, setCompleted] = useState<Record<string, boolean>>(loadProgress)

  useEffect(() => {
    saveProgress(completed)
  }, [completed])

  const markComplete = useCallback((chapterId: string) => {
    setCompleted((prev) => ({ ...prev, [chapterId]: true }))
  }, [])

  const completedCount = Object.values(completed).filter(Boolean).length
  const totalCount = chapters.length
  const progressPct = Math.round((completedCount / totalCount) * 100)

  const chapter = chapters[activeChapter]!
  const ChapterComponent = chapter.render

  const goNext = () => {
    markComplete(chapter.id)
    if (activeChapter < chapters.length - 1) {
      setActiveChapter(activeChapter + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goPrev = () => {
    if (activeChapter > 0) {
      setActiveChapter(activeChapter - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const selectChapter = (idx: number) => {
    setActiveChapter(idx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>📚 simple-pi-mono-agent-ts</h1>
          <p>Interactive Codebase Tutorial</p>
        </div>

        <div className="sidebar-progress">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="progress-label">
            {completedCount}/{totalCount} chapters completed ({progressPct}%)
          </div>
        </div>

        <ul className="chapter-list">
          {chapters.map((ch, idx) => {
            const isActive = idx === activeChapter
            const isDone = completed[ch.id]
            return (
              <li
                key={ch.id}
                className={`chapter-item${isActive ? ' active' : ''}${isDone ? ' completed' : ''}`}
                onClick={() => selectChapter(idx)}
              >
                <span className="chapter-check">
                  {isDone ? '✓' : ''}
                </span>
                <div className="chapter-meta">
                  <span className="chapter-num">Chapter {ch.number}</span>
                  <span className="chapter-title">{ch.title}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* ── Main Content ── */}
      <main className="main">
        <div className="content-wrapper" key={chapter.id}>
          <ChapterComponent />

          {chapter.quiz.length > 0 && <Quiz questions={chapter.quiz} />}

          <div className="nav-footer">
            <button
              className="nav-btn"
              onClick={goPrev}
              disabled={activeChapter === 0}
            >
              ← Previous
            </button>

            {!completed[chapter.id] && (
              <button
                className="nav-btn"
                onClick={() => markComplete(chapter.id)}
              >
                ✓ Mark as Complete
              </button>
            )}

            <button
              className="nav-btn primary"
              onClick={goNext}
              disabled={activeChapter === chapters.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
