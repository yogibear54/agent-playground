import type { ReactNode } from 'react';
import type { DiagramType } from '../components/Diagram';
import type { QuizQuestion } from '../components/Quiz';

export interface ChapterData {
  id: string;
  title: string;
  description: string;
  files: string[];
  content: ReactNode;
  diagram?: DiagramType;
  quiz: QuizQuestion[];
}
