// Carousel of athlete review videos. Hosted on Vercel Blob (public store),
// compressed to ~1080p portrait H.264 with +faststart for progressive playback.
// To add/replace: upload the compressed .mp4 to the Blob store and paste its
// public URL here.

export interface Testimonial {
  id: number;
  video: string;
}

export const testimonials: Testimonial[] = [
  { id: 1, video: "https://8azpg4yt0gjxqxuj.public.blob.vercel-storage.com/testimonials/review-1-RNkxflFfRBWA03w5UbJ926lOHI7ESE.mp4" },
  { id: 2, video: "https://8azpg4yt0gjxqxuj.public.blob.vercel-storage.com/testimonials/zeus-belt-MCB4FLxSAylz5ONpc0Vw3QXMGnhjw4.mp4" },
  { id: 3, video: "https://8azpg4yt0gjxqxuj.public.blob.vercel-storage.com/testimonials/review-2-33RGJgnXT30RN7Z1u3T0ZnqG1Blwjz.mp4" },
];
