import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { chapters } from './chapters';
import Sidebar from './components/Sidebar';
import ProgressBar from './components/ProgressBar';
import Diagram from './components/Diagram';
import Quiz from './components/Quiz';

interface TutorialProgress {
  currentChapterId: string;
  completedChapterIds: string[];
  quizScores: Record<string, number>;
}

const STORAGE_KEY = 'sample-openclaw-agent-php-tutorial-progress';

function loadInitialProgress(): TutorialProgress {
  const fallback: TutorialProgress = {
    currentChapterId: chapters[0]?.id ?? 'architecture-overview',
    completedChapterIds: [],
    quizScores: {},
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as TutorialProgress;
    return {
      currentChapterId: parsed.currentChapterId || fallback.currentChapterId,
      completedChapterIds: parsed.completedChapterIds ?? [],
      quizScores: parsed.quizScores ?? {},
    };
  } catch {
    return fallback;
  }
}

function App() {
  const [progress, setProgress] = useState<TutorialProgress>(() => loadInitialProgress());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const currentChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === progress.currentChapterId) ?? chapters[0],
    [progress.currentChapterId],
  );

  const currentChapterIndex = chapters.findIndex((chapter) => chapter.id === currentChapter.id);
  const previousChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  const completionPercent = (progress.completedChapterIds.length / chapters.length) * 100;

  function navigateToChapter(chapterId: string) {
    setProgress((previous) => ({ ...previous, currentChapterId: chapterId }));
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function markChapterComplete(chapterId: string) {
    setProgress((previous) => {
      if (previous.completedChapterIds.includes(chapterId)) {
        return previous;
      }

      return {
        ...previous,
        completedChapterIds: [...previous.completedChapterIds, chapterId],
      };
    });
  }

  function saveQuizScore(chapterId: string, score: number) {
    setProgress((previous) => ({
      ...previous,
      quizScores: {
        ...previous.quizScores,
        [chapterId]: score,
      },
      completedChapterIds: previous.completedChapterIds.includes(chapterId)
        ? previous.completedChapterIds
        : [...previous.completedChapterIds, chapterId],
    }));
  }

  if (!currentChapter) {
    return null;
  }

  return (
    <div className="app-shell">
      <button
        className="mobile-sidebar-toggle"
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label="Toggle chapter navigation"
      >
        ☰
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <header className="sidebar-header">
          <p className="sidebar-kicker">Interactive Tutorial</p>
          <h1>sample-openclaw-agent-php</h1>
          <p className="sidebar-subtitle">PHP Slack + Anthropic daemon architecture walkthrough</p>
        </header>

        <ProgressBar percent={completionPercent} />

        <Sidebar
          chapters={chapters}
          currentChapterId={currentChapter.id}
          completedChapterIds={progress.completedChapterIds}
          quizScores={progress.quizScores}
          onSelectChapter={navigateToChapter}
        />
      </aside>

      <main className="main-content">
        <article className="chapter-card">
          <header className="chapter-header">
            <span className="chapter-number">Chapter {currentChapterIndex + 1}</span>
            <h2>{currentChapter.title}</h2>
            <p className="chapter-description">{currentChapter.description}</p>
          </header>

          <section className="chapter-files">
            <h3>Source files covered</h3>
            <ul>
              {currentChapter.files.map((file) => (
                <li key={file}>
                  <code>{file}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="chapter-content">{currentChapter.content}</section>

          {currentChapter.diagram ? (
            <section className="chapter-diagram">
              <h3>Diagram</h3>
              <Diagram type={currentChapter.diagram} />
            </section>
          ) : null}

          <section className="chapter-quiz">
            <h3>Knowledge Check</h3>
            <Quiz
              chapterId={currentChapter.id}
              questions={currentChapter.quiz}
              savedScore={progress.quizScores[currentChapter.id]}
              onSaveScore={saveQuizScore}
            />
          </section>

          <footer className="chapter-footer">
            <div className="chapter-actions">
              {previousChapter ? (
                <button type="button" onClick={() => navigateToChapter(previousChapter.id)}>
                  ← {previousChapter.title}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                className="complete-button"
                onClick={() => markChapterComplete(currentChapter.id)}
                disabled={progress.completedChapterIds.includes(currentChapter.id)}
              >
                {progress.completedChapterIds.includes(currentChapter.id)
                  ? '✓ Completed'
                  : 'Mark Chapter Complete'}
              </button>

              {nextChapter ? (
                <button type="button" onClick={() => navigateToChapter(nextChapter.id)}>
                  {nextChapter.title} →
                </button>
              ) : (
                <span />
              )}
            </div>
          </footer>
        </article>
      </main>

      {sidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} /> : null}
    </div>
  );
}

export default App;
