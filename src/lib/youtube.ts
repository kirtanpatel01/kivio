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
