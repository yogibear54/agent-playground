import type { ChapterData } from '../chapters/types';

interface SidebarProps {
  chapters: ChapterData[];
  currentChapterId: string;
  completedChapterIds: string[];
  quizScores: Record<string, number>;
  onSelectChapter: (chapterId: string) => void;
}

function Sidebar({
  chapters,
  currentChapterId,
  completedChapterIds,
  quizScores,
  onSelectChapter,
}: SidebarProps) {
  return (
    <nav className="sidebar-nav" aria-label="Tutorial chapters">
      <ul>
        {chapters.map((chapter, index) => {
          const isActive = currentChapterId === chapter.id;
          const isComplete = completedChapterIds.includes(chapter.id);
          const quizScore = quizScores[chapter.id];
          const quizPassed = quizScore !== undefined && quizScore >= 70;

          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={`chapter-link${isActive ? ' active' : ''}${isComplete ? ' complete' : ''}`}
                onClick={() => onSelectChapter(chapter.id)}
              >
                <span className="chapter-index">{index + 1}</span>
                <span className="chapter-text">
                  <span className="chapter-title">{chapter.title}</span>
                  {quizScore !== undefined ? (
                    <span className={`chapter-score${quizPassed ? ' pass' : ''}`}>Quiz: {quizScore}%</span>
                  ) : (
                    <span className="chapter-score">Quiz pending</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;
