import React from 'react'

interface CalloutProps {
  type?: 'info' | 'tip' | 'warning'
  title?: string
  children: React.ReactNode
}

const Callout: React.FC<CalloutProps> = ({ type = 'info', title, children }) => (
  <div className={`callout ${type}`}>
    {title && <div className="callout-title">{title}</div>}
    <div>{children}</div>
  </div>
)

export default Callout
