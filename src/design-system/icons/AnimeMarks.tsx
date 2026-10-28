import type { SVGProps } from 'react';

/** Original, lightweight SVG marks. No third-party icon assets or remote fonts. */
type IconProps = SVGProps<SVGSVGElement>;

export function WaifuMark(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5.5 8.5 10 23l6-9 6 9 4.5-14.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 3.5v5m-2.5-2.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SakuraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <g fill="currentColor" opacity=".92">
        <path d="M16 14.5C10.4 9.8 11.9 4.6 16 3c4.1 1.6 5.6 6.8 0 11.5Z" />
        <path d="M17.5 16C22.2 10.4 27.4 11.9 29 16c-1.6 4.1-6.8 5.6-11.5 0Z" />
        <path d="M16 17.5c5.6 4.7 4.1 9.9 0 11.5-4.1-1.6-5.6-6.8 0-11.5Z" />
        <path d="M14.5 16C9.8 21.6 4.6 20.1 3 16c1.6-4.1 6.8-5.6 11.5 0Z" />
        <path d="M14.9 14.9C7.6 14.4 6 9.2 8.4 6c4.4-.7 8 3.3 6.5 8.9Z" />
      </g>
      <circle cx="16" cy="16" r="3" fill="#FFE6A7" />
      <circle cx="15" cy="15" r=".8" fill="#A45079" />
    </svg>
  );
}

export function TsukiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path d="M23.6 24.1A11 11 0 0 1 14.2 4.5a10.9 10.9 0 1 0 9.4 19.6Z" fill="currentColor" />
      <path
        d="m23 5 .9 2.9L27 8.8l-3.1 1L23 12.7l-.9-2.9-3.1-1 3.1-.9L23 5Zm5 10 .5 1.5L30 17l-1.5.5L28 19l-.5-1.5L26 17l1.5-.5L28 15Z"
        fill="currentColor"
      />
    </svg>
  );
}
