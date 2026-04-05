import { CodeBlock } from "./CodeBlock";

export type ChapterTemplateProps = {
  title: string;
  overview: [string, string?];
  filesCovered: string[];
  snippet?: string;
  snippetLanguage?: string;
  prevTitle?: string;
  nextTitle?: string;
  onPrev?: () => void;
  onNext?: () => void;
  complete: boolean;
  onToggleComplete: () => void;
};

export type ChapterPageProps = Omit<ChapterTemplateProps, "snippet" | "snippetLanguage">;

export function ChapterTemplate({
  title,
  overview,
  filesCovered,
  snippet,
  snippetLanguage,
  prevTitle,
  nextTitle,
  onPrev,
  onNext,
  complete,
  onToggleComplete,
}: ChapterTemplateProps) {
  return (
    <article className="chapter">
      <header className="chapter-header">
        <h1>{title}</h1>
        {overview.map((paragraph) =>
          paragraph ? <p key={paragraph}>{paragraph}</p> : null,
        )}
      </header>

      <section className="chapter-section">
        <h2>Files Covered</h2>
        <ul className="files-list">
          {filesCovered.map((file) => (
            <li key={file}>
              <code>{file}</code>
            </li>
          ))}
        </ul>
      </section>

      {snippet ? (
        <section className="chapter-section">
          <h2>Surface Snapshot</h2>
          <CodeBlock code={snippet} language={snippetLanguage} />
        </section>
      ) : null}

      <section className="chapter-section callout">
        <p>🔍 This chapter will be expanded with detailed analysis via deep-dive.</p>
      </section>

      <section className="chapter-section placeholder-grid">
        <div className="placeholder-card">
          <h3>Quiz Placeholder (Pass 2)</h3>
          <p>Short knowledge checks will be added during deep-dive.</p>
        </div>
        <div className="placeholder-card">
          <h3>Diagram Placeholder (Pass 2)</h3>
          <p>Architecture and flow diagrams will be added during deep-dive.</p>
        </div>
      </section>

      <section className="chapter-section actions-row">
        <button className="btn" onClick={onToggleComplete}>
          {complete ? "Mark as not completed" : "Mark chapter complete"}
        </button>
      </section>

      <nav className="chapter-nav" aria-label="Chapter navigation">
        <button className="btn secondary" onClick={onPrev} disabled={!onPrev}>
          {prevTitle ? `← ${prevTitle}` : "← Start of tutorial"}
        </button>
        <button className="btn secondary" onClick={onNext} disabled={!onNext}>
          {nextTitle ? `${nextTitle} →` : "End of tutorial →"}
        </button>
      </nav>
    </article>
  );
}
