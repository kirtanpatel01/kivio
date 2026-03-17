function VideoCard() {
  return (
    <div className="w-full group cursor-pointer flex flex-col gap-3 relative">
      <div className="w-full h-full inset-0 absolute group-hover:bg-primary/10 z-10 group-hover:scale-[1.05] rounded-xl transition-all duration-300" />
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden rounded-2xl">
        <img
          src="https://i.ytimg.com/vi/s4I4JtOZNgg/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCuTGVp21C1lFY1HWGSufmDScQ7XQ"
          alt="Video Thumbnail"
          className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300 z-20"
        />

        {/* Duration */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs font-bold rounded-md backdrop-blur-sm z-20">
          14:32
        </div>
      </div>

      {/* Info Section */}
      <div className="flex gap-3 px-1 z-20">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3jkyDNHhRZzJFa2MWYV-ryfL6Rak6nAYAAA&s" alt="dp" className="size-10 rounded-full shrink-0 object-cover aspect-square" />
        <div className="flex flex-col gap-1 overflow-hidden">
          <h3 className="text-sm sm:text-base font-bold line-clamp-2">
            Building a Premium Video Platform with Next.js and Tailwind CSS
          </h3>
          <div className="flex justify-between items-center">
            <p className="text-xs sm:text-sm text-foreground-secondary font-semibold hover:text-primary cursor-pointer">
              Kivio Official
            </p>
            <p className="text-[10px] sm:text-xs text-foreground-secondary font-medium">
              250K views • 3 hours ago
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
