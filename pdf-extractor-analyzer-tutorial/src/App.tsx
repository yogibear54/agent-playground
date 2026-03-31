import { useState, useEffect, useCallback } from 'react';
import Sidebar, { chapters } from './components/Sidebar';
import ProgressBar from './components/ProgressBar';
import Quiz from './components/Quiz';
import CodeBlock from './components/CodeBlock';
import Diagram from './components/Diagram';
import './App.css';

interface Progress {
  completedChapters: string[];
  quizScores: Record<string, number>;
  currentChapter: string;
}

const STORAGE_KEY = 'pdf-extractor-tutorial-progress';

function App() {
  const [currentChapter, setCurrentChapter] = useState('architecture');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>({
    completedChapters: [],
    quizScores: {},
    currentChapter: 'architecture',
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProgress(parsed);
        setCurrentChapter(parsed.currentChapter || 'architecture');
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: Progress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  }, []);

  const markChapterComplete = useCallback((chapterId: string) => {
    if (!progress.completedChapters.includes(chapterId)) {
      saveProgress({
        ...progress,
        completedChapters: [...progress.completedChapters, chapterId],
      });
    }
  }, [progress, saveProgress]);

  const saveQuizScore = useCallback((chapterId: string, score: number) => {
    saveProgress({
      ...progress,
      quizScores: { ...progress.quizScores, [chapterId]: score },
      completedChapters: progress.completedChapters.includes(chapterId)
        ? progress.completedChapters
        : [...progress.completedChapters, chapterId],
    });
  }, [progress, saveProgress]);

  const navigateChapter = useCallback((chapterId: string) => {
    setCurrentChapter(chapterId);
    saveProgress({ ...progress, currentChapter: chapterId });
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [progress, saveProgress]);

  const currentChapterData = chapters.find(c => c.id === currentChapter);
  const currentIndex = chapters.findIndex(c => c.id === currentChapter);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const overallProgress = (progress.completedChapters.length / chapters.length) * 100;

  return (
    <div className="app">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger"></span>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>PDF Extractor Analyzer</h2>
          <p className="subtitle">Codebase Tutorial</p>
        </div>
        <ProgressBar progress={overallProgress} />
        <Sidebar
          currentChapter={currentChapter}
          progress={progress}
          onSelectChapter={navigateChapter}
        />
      </aside>

      <main className="main-content">
        {currentChapterData && (
          <article className="chapter">
            <header className="chapter-header">
              <span className="chapter-number">Chapter {currentIndex + 1}</span>
              <h1>{currentChapterData.title}</h1>
              <p className="chapter-description">{currentChapterData.description}</p>
            </header>

            <section className="files-covered">
              <h2>Files Covered</h2>
              <ul className="file-list">
                {currentChapterData.files.map(file => (
                  <li key={file} className="file-item">
                    <code>{file}</code>
                  </li>
                ))}
              </ul>
            </section>

            <div className="chapter-content">
              {currentChapterData.content}
            </div>

            {currentChapterData.diagram && (
              <section className="diagram-section">
                <h2>Architecture Diagram</h2>
                <Diagram type={currentChapterData.diagram} />
              </section>
            )}

            {currentChapterData.codeExamples?.map((example, idx) => (
              <CodeBlock
                key={idx}
                code={example.code}
                language={example.language}
                title={example.title}
                explanation={example.explanation}
              />
            ))}

            {currentChapterData.quiz && (
              <section className="quiz-section">
                <h2>Knowledge Check</h2>
                <Quiz
                  questions={currentChapterData.quiz}
                  chapterId={currentChapter}
                  onSaveScore={saveQuizScore}
                  savedScore={progress.quizScores[currentChapter]}
                />
              </section>
            )}

            <footer className="chapter-footer">
              <div className="navigation-buttons">
                {prevChapter && (
                  <button
                    className="nav-btn prev"
                    onClick={() => navigateChapter(prevChapter.id)}
                  >
                    ← Previous: {prevChapter.title}
                  </button>
                )}
                <button
                  className="nav-btn complete"
                  onClick={() => markChapterComplete(currentChapter)}
                  disabled={progress.completedChapters.includes(currentChapter)}
                >
                  {progress.completedChapters.includes(currentChapter)
                    ? '✓ Chapter Completed'
                    : 'Mark as Complete'}
                </button>
                {nextChapter && (
                  <button
                    className="nav-btn next"
                    onClick={() => navigateChapter(nextChapter.id)}
                  >
                    Next: {nextChapter.title} →
                  </button>
                )}
              </div>
            </footer>
          </article>
        )}
      </main>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

export default App;