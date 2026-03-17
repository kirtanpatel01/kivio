import VideoCard from '#/components/video-card'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {Array.from({ length: 20 }).map((_, i) => (
          <Link to={`/videos/$videoId`} params={{ videoId: i.toString() }}>
            <VideoCard key={i} />
          </Link>
        ))}
      </div>
    </main>
  )
}
