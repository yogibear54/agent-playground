import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  caption?: string;
}

const languageAliasMap: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  text: 'text',
};

function normalizeLanguage(language: string): string {
  const lowered = language.toLowerCase();
  return languageAliasMap[lowered] ?? lowered;
}

function CodeBlock({ code, language, filename, caption }: CodeBlockProps) {
  const prismLanguage = normalizeLanguage(language);

  return (
    <div className="code-block">
      <div className="code-block-header">
        {filename ? <span className="code-block-filename">{filename}</span> : <span />}
        <span className="code-block-language">{language}</span>
      </div>

      <Highlight theme={themes.vsLight} code={code.trim()} language={prismLanguage as never}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="code-block-pre"
            style={{
              ...style,
              margin: 0,
              backgroundColor: '#ffffff',
            }}
          >
            {tokens.map((line, lineIndex) => {
              const lineProps = getLineProps({ line, key: lineIndex });
              return (
                <div key={lineIndex} {...lineProps}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token, key: tokenIndex })} />
                  ))}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>

      {caption ? <p className="code-block-caption">{caption}</p> : null}
    </div>
  );
}

export default CodeBlock;
