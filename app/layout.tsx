import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Identity Governance & Administration',
  description: 'IGA Core Data Model',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
