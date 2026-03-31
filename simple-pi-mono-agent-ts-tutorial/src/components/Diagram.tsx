import React from 'react'

interface DiagramProps {
  title?: string
  children: React.ReactNode
}

const Diagram: React.FC<DiagramProps> = ({ title, children }) => (
  <div className="diagram-container">
    <div>
      {title && <p style={{ textAlign: 'center', fontWeight: 600, marginBottom: 16, fontSize: '0.9rem', color: '#64647a' }}>{title}</p>}
      {children}
    </div>
  </div>
)

export default Diagram
