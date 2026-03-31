import { useState } from 'react';

export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizProps {
  questions: Question[];
  chapterId: string;
  onSaveScore: (chapterId: string, score: number) => void;
  savedScore?: number;
}

function Quiz({ questions, chapterId, onSaveScore, savedScore }: QuizProps) {
  const [selectedOptions, setSelectedOptions] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    const newSelected = [...selectedOptions];
    newSelected[questionIndex] = optionIndex;
    setSelectedOptions(newSelected);
  };

  const handleSubmit = () => {
    if (selectedOptions.some((s) => s === null)) return;

    let correctCount = 0;
    selectedOptions.forEach((selected, idx) => {
      if (selected === questions[idx].correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / questions.length) * 100);
    setScore(calculatedScore);
    setSubmitted(true);
    onSaveScore(chapterId, calculatedScore);
  };

  const handleReset = () => {
    setSelectedOptions(new Array(questions.length).fill(null));
    setSubmitted(false);
    setScore(null);
  };

  const allAnswered = selectedOptions.every((s) => s !== null);

  if (savedScore !== undefined && score === null) {
    // Display saved score
    return (
      <div className="quiz-section">
        <h2>Knowledge Check</h2>
        <div className={`score-display ${savedScore >= 70 ? 'success' : ''}`}>
          <div className="score-number">{savedScore}%</div>
          <p className="score-text">
            {savedScore >= 70
              ? 'Great job! You passed this quiz.'
              : 'Try again to improve your score.'}
          </p>
        </div>
        <div className="quiz-actions">
          <button className="quiz-reset" onClick={handleReset}>
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-section">
      <h2>Knowledge Check</h2>
      {questions.map((q, qIdx) => {
        const selected = selectedOptions[qIdx];
        const isCorrect = selected === q.correctIndex;

        return (
          <div key={qIdx} className="quiz-question">
            <p className="question-text">
              <strong>{qIdx + 1}.</strong> {q.question}
            </p>
            <ul className="options-list">
              {q.options.map((option, oIdx) => {
                let className = 'option-label';
                if (submitted) {
                  if (oIdx === q.correctIndex) {
                    className += ' correct';
                  } else if (oIdx === selected) {
                    className += ' incorrect';
                  }
                } else if (oIdx === selected) {
                  className += ' selected';
                }

                return (
                  <li key={oIdx} className="option-container">
                    <label className={className}>
                      <input
                        type="radio"
                        name={`question-${qIdx}`}
                        checked={oIdx === selected}
                        onChange={() => handleSelect(qIdx, oIdx)}
                        disabled={submitted}
                      />
                      <span className="option-marker">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="option-text">{option}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {submitted && (
              <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                <strong>{isCorrect ? '✓ Correct!' : '✗ Incorrect.'}</strong> {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <div className="quiz-actions">
          <button
            className="quiz-submit"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            Submit Answers
          </button>
        </div>
      )}

      {submitted && score !== null && (
        <>
          <div className={`score-display ${score >= 70 ? 'success' : ''}`}>
            <div className="score-number">{score}%</div>
            <p className="score-text">
              {score >= 70
                ? 'Great job! You passed this quiz.'
                : 'Review the chapter and try again to improve your score.'}
            </p>
          </div>
          <div className="quiz-actions">
            <button className="quiz-reset" onClick={handleReset}>
              Retake Quiz
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Quiz;