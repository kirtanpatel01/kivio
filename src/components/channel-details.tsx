import {
  IconBrandYoutube,
  IconEye,
  IconLoader2,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { useChannelStore } from "#/stores/channel-store";

function formatCount(count: string): string {
  const num = Number.parseInt(count, 10);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ChannelDetails() {
  const { selectedChannel, channelDetails, loading, error } = useChannelStore();

  if (!selectedChannel) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconBrandYoutube size={48} strokeWidth={1.2} className="opacity-30" />
        <p className="text-sm">Select a channel to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconLoader2 size={32} className="animate-spin opacity-50" />
        <p className="text-sm">Fetching channel details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 px-8">
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center max-w-md">
          {error}
        </div>
      </div>
    );
  }

  if (!channelDetails) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Channel Header */}
      <div className="flex items-start gap-5">
        <img
          src={channelDetails.thumbnails.high.url}
          alt={channelDetails.title}
          className="w-24 h-24 rounded-full border-2 border-primary/20 shadow-lg shadow-primary/5"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight truncate">
            {channelDetails.title}
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            {channelDetails.customUrl}
          </p>
          {channelDetails.country && (
            <span className="inline-block text-xs bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">
              {channelDetails.country}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<IconUsers size={20} className="text-primary/70" />}
          value={formatCount(channelDetails.statistics.subscriberCount)}
          label="Subscribers"
        />
        <StatCard
          icon={<IconEye size={20} className="text-primary/70" />}
          value={formatCount(channelDetails.statistics.viewCount)}
          label="Total Views"
        />
        <StatCard
          icon={<IconVideo size={20} className="text-primary/70" />}
          value={formatCount(channelDetails.statistics.videoCount)}
          label="Videos"
        />
      </div>

      {/* Channel Info */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Joined
          </h3>
          <p className="text-sm">{formatDate(channelDetails.publishedAt)}</p>
        </div>

        {channelDetails.description && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              About
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {channelDetails.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-1.5 transition-colors hover:bg-secondary/30">
      {icon}
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
