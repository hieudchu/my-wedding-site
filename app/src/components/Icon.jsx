/**
 * Icon nét cho trình phát nhạc "đĩa than".
 * Chỉ hiện ở giao diện trình phát mới trên điện thoại/tablet — xem CSS `.ico-svg`.
 * Desktop vẫn dùng ký tự cũ trong `.ico-txt`.
 */

const ICON_PATHS = {
  play: 'M8 5.6v12.8a.6.6 0 0 0 .9.5l10.2-6.4a.6.6 0 0 0 0-1L8.9 5.1a.6.6 0 0 0-.9.5z',
  pause: 'M7 5.5h3.2v13H7zM13.8 5.5H17v13h-3.2z',
  prev: 'M6.5 5.5h2.2v13H6.5zM19 6.1v11.8a.6.6 0 0 1-.9.5L9.8 12.5a.6.6 0 0 1 0-1l8.3-5.9a.6.6 0 0 1 .9.5z',
  next: 'M15.3 5.5h2.2v13h-2.2zM5 6.1v11.8a.6.6 0 0 0 .9.5l8.3-5.9a.6.6 0 0 0 0-1L5.9 5.6a.6.6 0 0 0-.9.5z',
  vol: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5',
  repeat: 'M17 3.5l3 3-3 3M4.5 11.5V10a3.5 3.5 0 0 1 3.5-3.5h12M7 20.5l-3-3 3-3M19.5 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4',
  note: 'M9 17.5V6.2l10-2v11.3M9 17.5a2.7 2.7 0 1 1-5.4 0 2.7 2.7 0 0 1 5.4 0zM19 15.5a2.7 2.7 0 1 1-5.4 0 2.7 2.7 0 0 1 5.4 0z',
};

const STROKE_ICONS = { vol: 1, mute: 1, repeat: 1, note: 1 };

export default function Ico({ name, className = '' }) {
  const line = !!STROKE_ICONS[name];
  return (
    <svg
      className={`ico-svg ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={line ? 'none' : 'currentColor'}
      stroke={line ? 'currentColor' : 'none'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
