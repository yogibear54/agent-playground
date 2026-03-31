import type { ChapterData } from '../chapters/types';
import {
  architectureContent,
  modulesContent,
  configContent,
  converterContent,
  cacheContent,
  analyzerContent,
  pipelineContent,
  schemasContent,
  exceptionsContent,
  cliContent,
} from '../chapters';

export const chapters: ChapterData[] = [
  architectureContent,
  modulesContent,
  configContent,
  converterContent,
  cacheContent,
  analyzerContent,
  pipelineContent,
  schemasContent,
  exceptionsContent,
  cliContent,
];

interface SidebarProps {
  currentChapter: string;
  progress: {
    completedChapters: string[];
    quizScores: Record<string, number>;
  };
  onSelectChapter: (id: string) => void;
}

function Sidebar({ currentChapter, progress, onSelectChapter }: SidebarProps) {
  return (
    <nav className="chapter-nav">
      <ul className="chapter-list">
        {chapters.map((chapter) => {
          const isActive = currentChapter === chapter.id;
          const isCompleted = progress.completedChapters.includes(chapter.id);
          const passedQuiz = progress.quizScores[chapter.id] && progress.quizScores[chapter.id] >= 70;
          
          return (
            <li
              key={chapter.id}
              className={`chapter-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${passedQuiz ? 'quiz-passed' : ''}`}
              onClick={() => onSelectChapter(chapter.id)}
            >
              <div className="chapter-title">{chapter.title}</div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;