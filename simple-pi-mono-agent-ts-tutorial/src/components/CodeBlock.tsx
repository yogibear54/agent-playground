import React from 'react'
import { Highlight, themes } from 'prism-react-renderer'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'typescript', filename }) => (
  <div className="code-block-wrapper">
    {filename && (
      <div className="code-block-header">
        <span className="filename">{filename}</span>
        <span>{language}</span>
      </div>
    )}
    <div className="code-block-body">
      <Highlight theme={themes.vsLight} code={code.trimEnd()} language={language}>
        {({ style, tokens, getTokenProps }) => (
          <pre style={{ ...style, background: 'transparent' }}>
            {tokens.map((line, i) => (
              <div key={i} className="token-line">
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  </div>
)

export default CodeBlock
