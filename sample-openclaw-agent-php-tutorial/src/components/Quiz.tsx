import { useMemo, useState } from 'react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizProps {
  chapterId: string;
  questions: QuizQuestion[];
  savedScore?: number;
  onSaveScore: (chapterId: string, score: number) => void;
}

function Quiz({ chapterId, questions, savedScore, onSaveScore }: QuizProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(
    Array.from({ length: questions.length }, () => null),
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const activeScore = score ?? savedScore;
  const hasSavedScore = savedScore !== undefined && score === null && !submitted;

  const allAnswered = useMemo(
    () => selectedAnswers.every((answer) => answer !== null),
    [selectedAnswers],
  );

  function handleSelect(questionIndex: number, optionIndex: number) {
    if (submitted) {
      return;
    }

    const next = [...selectedAnswers];
    next[questionIndex] = optionIndex;
    setSelectedAnswers(next);
  }

  function handleSubmit() {
    if (!allAnswered) {
      return;
    }

    const correctCount = selectedAnswers.reduce<number>((count, answer, index) => {
      if (answer === questions[index]?.correctIndex) {
        return count + 1;
      }
      return count;
    }, 0);

    const nextScore = Math.round((correctCount / questions.length) * 100);
    setScore(nextScore);
    setSubmitted(true);
    onSaveScore(chapterId, nextScore);
  }

  function handleRetake() {
    setSelectedAnswers(Array.from({ length: questions.length }, () => null));
    setSubmitted(false);
    setScore(null);
  }

  if (hasSavedScore && activeScore !== undefined) {
    return (
      <div className="quiz-shell">
        <div className={`quiz-score ${activeScore >= 70 ? 'success' : ''}`}>
          <p className="quiz-score-number">{activeScore}%</p>
          <p className="quiz-score-text">
            {activeScore >= 70 ? 'You passed this quiz.' : 'You can retake this quiz to improve your score.'}
          </p>
        </div>
        <button className="quiz-action secondary" onClick={handleRetake}>
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      {questions.map((question, questionIndex) => {
        const selected = selectedAnswers[questionIndex];

        return (
          <div key={questionIndex} className="quiz-question">
            <p className="quiz-question-text">
              <strong>{questionIndex + 1}.</strong> {question.question}
            </p>

            <ul className="quiz-options">
              {question.options.map((option, optionIndex) => {
                let className = 'quiz-option';

                if (!submitted && selected === optionIndex) {
                  className += ' selected';
                }

                if (submitted && optionIndex === question.correctIndex) {
                  className += ' correct';
                }

                if (submitted && selected === optionIndex && optionIndex !== question.correctIndex) {
                  className += ' incorrect';
                }

                return (
                  <li key={optionIndex}>
                    <button
                      type="button"
                      className={className}
                      onClick={() => handleSelect(questionIndex, optionIndex)}
                      disabled={submitted}
                    >
                      <span className="quiz-marker">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {submitted ? (
              <p className={`quiz-explanation ${selected === question.correctIndex ? 'correct' : 'incorrect'}`}>
                {question.explanation}
              </p>
            ) : null}
          </div>
        );
      })}

      {!submitted ? (
        <button className="quiz-action primary" disabled={!allAnswered} onClick={handleSubmit}>
          Submit Answers
        </button>
      ) : (
        <>
          {activeScore !== undefined ? (
            <div className={`quiz-score ${activeScore >= 70 ? 'success' : ''}`}>
              <p className="quiz-score-number">{activeScore}%</p>
              <p className="quiz-score-text">
                {activeScore >= 70
                  ? 'Great work. You passed this quiz.'
                  : 'Review the chapter, then retake the quiz.'}
              </p>
            </div>
          ) : null}
          <button className="quiz-action secondary" onClick={handleRetake}>
            Retake Quiz
          </button>
        </>
      )}
    </div>
  );
}

export default Quiz;
