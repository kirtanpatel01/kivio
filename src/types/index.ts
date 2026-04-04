export interface YouTubeChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  country?: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
  uploadsPlaylistId: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  duration: string | null;
  channelAvatar?: string;
  description?: string;
  viewCount?: string;
  likeCount?: string;
  subscriberCount?: string;
  uploadsPlaylistId?: string;
  isShort?: boolean;
}

export interface YouTubeFeedResponse {
  videos: YouTubeVideo[];
  nextPageTokens: Record<string, string>;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  itemCount: number;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
}
