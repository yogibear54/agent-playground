import { Highlight, themes } from 'prism-react-renderer';

interface PreProps {
  lang?: string;
  children: string;
}

function Pre({ lang = 'python', children }: PreProps) {
  const code = typeof children === 'string' ? children : String(children);

  return (
    <Highlight theme={themes.vsLight} code={code.trimEnd()} language={lang}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          style={{
            ...style,
            backgroundColor: '#ffffff',
            color: '#393a34',
            fontFamily: "'Source Code Pro', monospace",
            fontSize: '0.875rem',
            lineHeight: 1.6,
            padding: '16px',
            margin: '16px 0',
            borderRadius: 'var(--radius-md, 8px)',
            overflowX: 'auto',
            whiteSpace: 'pre',
            border: '1px solid var(--border, #e2e8f0)',
          }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

export default Pre;
