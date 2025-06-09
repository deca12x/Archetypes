export const metadata = {
  title: 'Archetypes Game',
  description: 'A multiplayer game built with Phaser and Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black">
        {children}
      </body>
    </html>
  )
}
