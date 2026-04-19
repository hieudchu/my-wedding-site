/**
 * Placeholder images for the wedding site.
 * These show when no photos have been uploaded to Supabase Storage yet.
 * Replace with real photos by uploading to the media bucket.
 */

// Using picsum.photos for beautiful placeholder images
// Each ID gives a consistent, repeatable image
export const PLACEHOLDERS = {
  // Carousel photos
  carousel: [
    { url: 'https://picsum.photos/seed/wedding-01/640/860', cap: 'Đà Lạt · 2024', type: 'tall' },
    { url: 'https://picsum.photos/seed/wedding-02/1120/700', cap: 'Mùa hè đầu tiên', type: 'wide' },
    { url: 'https://picsum.photos/seed/wedding-03/840/840', cap: 'Buổi chiều Sài Gòn', type: 'sq' },
    { url: 'https://picsum.photos/seed/wedding-04/640/860', cap: 'Nụ cười', type: 'tall' },
    { url: 'https://picsum.photos/seed/wedding-05/1120/700', cap: 'Hoàng hôn', type: 'wide' },
    { url: 'https://picsum.photos/seed/wedding-06/840/840', cap: 'Tay trong tay', type: 'sq' },
    { url: 'https://picsum.photos/seed/wedding-07/640/860', cap: 'Một ngày bình yên', type: 'tall' },
  ],

  // Portraits
  groom: 'https://picsum.photos/seed/groom-portrait/600/750',
  bride: 'https://picsum.photos/seed/bride-portrait/600/750',

  // Timeline moments
  timeline: {
    'timeline/photo.jpg': 'https://picsum.photos/seed/tl-photo/440/590',
    'timeline/welcome.jpg': 'https://picsum.photos/seed/tl-welcome/440/590',
    'timeline/ceremony.jpg': 'https://picsum.photos/seed/tl-ceremony/440/590',
    'timeline/vows.jpg': 'https://picsum.photos/seed/tl-vows/440/590',
    'timeline/reception.jpg': 'https://picsum.photos/seed/tl-reception/440/590',
  },

  // Background photos (info section)
  background: {
    'background/left.jpg': 'https://picsum.photos/seed/bg-left/560/750',
    'background/right.jpg': 'https://picsum.photos/seed/bg-right/640/800',
    'background/moment-1.jpg': 'https://picsum.photos/seed/bg-moment1/400/400',
    'background/moment-2.jpg': 'https://picsum.photos/seed/bg-moment2/360/480',
  },
};
