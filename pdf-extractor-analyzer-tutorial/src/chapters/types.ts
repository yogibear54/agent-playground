import type { Question } from '../components/Quiz';

export interface CodeExample {
  code: string;
  language: string;
  title: string;
  explanation: string;
}

export interface ChapterData {
  id: string;
  title: string;
  description: string;
  files: string[];
  content: React.ReactNode;
  diagram?: 'architecture' | 'data-flow' | 'cache-flow' | 'class-hierarchy';
  codeExamples?: CodeExample[];
  quiz?: Question[];
}