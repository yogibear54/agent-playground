interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  explanation?: string;
}

function CodeBlock({ code, language, title, explanation }: CodeBlockProps) {
  // Simple syntax highlighting for Python
  const highlightPython = (code: string): string => {
    const keywords = [
      'from', 'import', 'class', 'def', 'return', 'if', 'else', 'elif', 'for', 'while',
      'try', 'except', 'finally', 'with', 'as', 'yield', 'lambda', 'pass', 'raise',
      'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'self', 'async', 'await',
      'type', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'Any',
    ];
    const decorators = ['dataclass', 'property', 'staticmethod', 'classmethod'];
    
    let highlighted = code
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Comments
      .replace(/(#.*)$/gm, '<span class="comment">$1</span>')
      // Strings (single quotes)
      .replace(/(['"])((?:\\.|[^'\\])*?)\1/g, '<span class="string">$1$2$1</span>')
      // Decorators
      .replace(new RegExp(`(@(${decorators.join('|')}))\\b`, 'g'), '<span class="decorator">$1</span>')
      // Keywords
      .replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span class="keyword">$1</span>')
      // Class names (Capitalized words)
      .replace(/\b([A-Z][a-zA-Z0-9]*)\b/g, '<span class="class">$1</span>')
      // Numbers
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');
    
    return highlighted;
  };

  const highlightCode = (code: string, lang: string): string => {
    if (lang === 'python' || lang === 'py') {
      return highlightPython(code);
    }
    // Return plain code for other languages
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  return (
    <div className="code-block">
      <div className="code-header">
        {title && <span className="code-title">{title}</span>}
        <span className="code-lang">{language}</span>
      </div>
      <div className="code-wrapper">
        <pre className="code-content">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} />
        </pre>
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