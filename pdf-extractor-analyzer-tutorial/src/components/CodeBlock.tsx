import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  explanation?: string;
}

// Map our language labels to prism-react-renderer language identifiers
const getLanguage = (lang: string): string => {
  const map: Record<string, string> = {
    py: 'python',
    ts: 'typescript',
    js: 'javascript',
    yml: 'yaml',
    sh: 'bash',
    shell: 'bash',
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
};

function CodeBlock({ code, language, title, explanation }: CodeBlockProps) {
  const lang = getLanguage(language);

  return (
    <div className="code-block">
      <div className="code-header">
        {title && <span className="code-title">{title}</span>}
        <span className="code-lang">{language}</span>
      </div>
      <div className="code-wrapper">
        <Highlight theme={themes.vsLight} code={code.trim()} language={lang}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="code-content"
              style={{
                ...style,
                backgroundColor: '#ffffff',
                color: '#393a34',
              }}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line, key: i });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
      {explanation && (
        <div className="code-explanation">
          <h4>Explanation</h4>
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
}

export default CodeBlock;
