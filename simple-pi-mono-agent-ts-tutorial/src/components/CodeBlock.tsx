import { Highlight, themes } from "prism-react-renderer";

type CodeBlockProps = {
  code: string;
  language?: string;
};

export function CodeBlock({ code, language = "ts" }: CodeBlockProps) {
  return (
    <div className="code-block-wrap">
      <Highlight code={code.trim()} language={language} theme={themes.vsLight}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
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
    </div>
  );
}
