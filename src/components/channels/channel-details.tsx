import {
  IconBrandYoutube,
  IconEye,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";

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

const routeApi = getRouteApi("/channels");

export default function ChannelDetails() {
  const { handle } = routeApi.useSearch();
  const { details } = routeApi.useLoaderData();

  if (!handle) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconBrandYoutube size={48} strokeWidth={1.2} className="opacity-30" />
        <p className="text-sm">Select a channel to view details</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
        <IconVideo size={48} strokeWidth={1.2} className="opacity-30" />
        <p className="text-sm">Channel not found or data is unavailable</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Channel Header */}
      <div className="flex items-start gap-5">
        <img
          src={details.thumbnails.high.url}
          alt={details.title}
          className="w-24 h-24 rounded-full border-2 border-primary/20 shadow-lg shadow-primary/5"
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight truncate">
            {details.title}
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            {details.customUrl}
          </p>
          {details.country && (
            <span className="inline-block text-xs bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">
              {details.country}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<IconUsers size={20} className="text-primary/70" />}
          value={formatCount(details.statistics.subscriberCount)}
          label="Subscribers"
        />
        <StatCard
          icon={<IconEye size={20} className="text-primary/70" />}
          value={formatCount(details.statistics.viewCount)}
          label="Total Views"
        />
        <StatCard
          icon={<IconVideo size={20} className="text-primary/70" />}
          value={formatCount(details.statistics.videoCount)}
          label="Videos"
        />
      </div>

      {/* Channel Info */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Joined
          </h3>
          <p className="text-sm">{formatDate(details.publishedAt)}</p>
        </div>

        {details.description && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              About
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {details.description}
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
    <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-1.5 hover:bg-secondary/30">
      {icon}
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
