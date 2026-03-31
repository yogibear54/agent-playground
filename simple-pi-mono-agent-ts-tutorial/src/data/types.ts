export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChapterData {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  sourceFiles: string[];
  render: () => JSX.Element;
  quiz: QuizQuestion[];
}
