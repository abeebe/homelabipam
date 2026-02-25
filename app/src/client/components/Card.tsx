import { ReactNode } from 'react'

interface CardProps {
  title: string
  value: string | number
  subtitle?: string
  children?: ReactNode
}

export default function Card({ title, value, subtitle, children }: CardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="card-value">{value}</div>
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </div>
  )
}
