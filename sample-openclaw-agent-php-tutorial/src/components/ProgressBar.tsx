interface ProgressBarProps {
  percent: number;
}

function ProgressBar({ percent }: ProgressBarProps) {
  return (
    <section className="progress-box" aria-label="Tutorial progress">
      <div className="progress-meta">
        <span>Progress</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

export default ProgressBar;
