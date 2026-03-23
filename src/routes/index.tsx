import VideoCard from '#/components/video-card'
import { createFileRoute, Link } from '@tanstack/react-router'
import { fetchFeedForUser } from '#/actions/youtube'

export const Route = createFileRoute('/')({
  loader: async () => {
    const videos = await fetchFeedForUser()
    return { videos: videos || [] }
  },
  component: Dashboard,
})

function Dashboard() {
  const { videos } = Route.useLoaderData()

  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center gap-4">
        <h2 className="text-2xl font-bold">Your feed is empty</h2>
        <p className="text-muted-foreground">
          Add some YouTube handles in the Channels page to see videos here.
        </p>
        <Link
          to="/channels"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go to Channels
        </Link>
      </div>
    )
  }

  return (
    <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {videos.map((video: any) => (
          <Link
            to={`/videos/$videoId`}
            params={{ videoId: video.id }}
            key={video.id}
          >
            <VideoCard video={video} />
          </Link>
        ))}
      </div>
    </main>
  )
}