import { useEffect, useMemo, useState } from "react";
import { chapters } from "./data/chapters";

const STORAGE_KEY = "simple-pi-mono-agent-ts-tutorial-progress-v1";

type StoredProgress = {
  lastChapterId: string;
  completedChapterIds: string[];
};

function loadProgress(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastChapterId: chapters[0].id, completedChapterIds: [] };
    const parsed = JSON.parse(raw) as StoredProgress;
    return {
      lastChapterId: parsed.lastChapterId || chapters[0].id,
      completedChapterIds: Array.isArray(parsed.completedChapterIds)
        ? parsed.completedChapterIds
        : [],
    };
  } catch {
    return { lastChapterId: chapters[0].id, completedChapterIds: [] };
  }
}

function saveProgress(progress: StoredProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress());

  const chapterIndex = useMemo(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (fromHash) {
      const hashIndex = chapters.findIndex((c) => c.id === fromHash);
      if (hashIndex >= 0) return hashIndex;
    }

    const lastIndex = chapters.findIndex((c) => c.id === progress.lastChapterId);
    return lastIndex >= 0 ? lastIndex : 0;
  }, [progress.lastChapterId]);

  const [currentIndex, setCurrentIndex] = useState(chapterIndex);

  useEffect(() => {
    setCurrentIndex(chapterIndex);
  }, [chapterIndex]);

  const currentChapter = chapters[currentIndex];
  const ChapterView = currentChapter.component;
  const completionCount = progress.completedChapterIds.length;
  const percent = Math.round((completionCount / chapters.length) * 100);

  useEffect(() => {
    const nextProgress = { ...progress, lastChapterId: currentChapter.id };
    setProgress(nextProgress);
    saveProgress(nextProgress);
    window.location.hash = currentChapter.id;
  }, [currentChapter.id]);

  function goToChapter(index: number) {
    setCurrentIndex(index);
    setSidebarOpen(false);
  }

  function toggleComplete(chapterId: string) {
    setProgress((prev) => {
      const completed = new Set(prev.completedChapterIds);
      if (completed.has(chapterId)) completed.delete(chapterId);
      else completed.add(chapterId);

      const next = {
        ...prev,
        lastChapterId: chapterId,
        completedChapterIds: Array.from(completed),
      };
      saveProgress(next);
      return next;
    });
  }

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < chapters.length - 1;

  return (
    <div className="app-shell">
      <button
        className="menu-toggle btn"
        aria-expanded={isSidebarOpen}
        aria-controls="tutorial-sidebar"
        onClick={() => setSidebarOpen((s) => !s)}
      >
        {isSidebarOpen ? "Close chapters" : "Open chapters"}
      </button>

      <aside id="tutorial-sidebar" className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <h2>simple-pi-mono-agent-ts</h2>
          <p className="muted">Skeleton tutorial (Pass 1 of 2)</p>

          <div className="progress-card" role="status" aria-live="polite">
            <strong>Progress: {percent}%</strong>
            <p>
              {completionCount} / {chapters.length} chapter(s) completed
            </p>
          </div>

          <button
            className="btn secondary"
            onClick={() => {
              const idx = chapters.findIndex((c) => c.id === progress.lastChapterId);
              if (idx >= 0) goToChapter(idx);
            }}
          >
            Continue where you left off
          </button>

          <nav aria-label="Tutorial chapters">
            <ul className="chapter-list">
              {chapters.map((chapter, index) => {
                const done = progress.completedChapterIds.includes(chapter.id);
                const active = index === currentIndex;
                return (
                  <li key={chapter.id}>
                    <button
                      className={`chapter-link ${active ? "active" : ""}`}
                      onClick={() => goToChapter(index)}
                    >
                      <span>{chapter.title}</span>
                      <span aria-label={done ? "completed" : "not completed"}>{done ? "✓" : "○"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <main className="content" onClick={() => isSidebarOpen && setSidebarOpen(false)}>
        <ChapterView
          title={currentChapter.title}
          overview={currentChapter.overview}
          filesCovered={currentChapter.filesCovered}
          prevTitle={canGoPrev ? chapters[currentIndex - 1].title : undefined}
          nextTitle={canGoNext ? chapters[currentIndex + 1].title : undefined}
          onPrev={canGoPrev ? () => goToChapter(currentIndex - 1) : undefined}
          onNext={canGoNext ? () => goToChapter(currentIndex + 1) : undefined}
          complete={progress.completedChapterIds.includes(currentChapter.id)}
          onToggleComplete={() => toggleComplete(currentChapter.id)}
        />
      </main>
    </div>
  );
}
