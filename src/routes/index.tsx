import VideoCard from '#/components/video-card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <VideoCard key={i} />
        ))}
      </div>
    </main>
  )
}
