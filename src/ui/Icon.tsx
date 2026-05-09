import type { ReactNode } from "react";

export type IconName =
  | "ban"
  | "check"
  | "close"
  | "copy"
  | "cube"
  | "download"
  | "eye"
  | "github"
  | "heart"
  | "menu"
  | "moon"
  | "more"
  | "package"
  | "search"
  | "share"
  | "sheet"
  | "tag"
  | "terminal"
  | "trash"
  | "upload"
  | "user"
  | "x"
  | "play"
  | "link"
  | "sparkle"
  | "sun";

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    ban: (
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M4.2 11.8 L11.8 4.2" />
      </>
    ),
    check: <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" />,
    close: (
      <>
        <path d="M4 4 L12 12" />
        <path d="M12 4 L4 12" />
      </>
    ),
    copy: (
      <>
        <rect x="5" y="5" width="8" height="8" rx="1" />
        <path d="M3 10.5 V3 H10.5" />
      </>
    ),
    cube: (
      <>
        <path d="M8 2 L13.5 5 V11 L8 14 L2.5 11 V5 Z" />
        <path d="M2.5 5 L8 8 L13.5 5" />
        <path d="M8 8 V14" />
      </>
    ),
    download: (
      <>
        <path d="M8 2 V11" />
        <path d="M4.5 7.5 L8 11 L11.5 7.5" />
        <path d="M3 13.5 H13" />
      </>
    ),
    eye: (
      <>
        <path d="M1.8 8 C3.3 4.9 5.3 3.5 8 3.5 C10.7 3.5 12.7 4.9 14.2 8 C12.7 11.1 10.7 12.5 8 12.5 C5.3 12.5 3.3 11.1 1.8 8 Z" />
        <circle cx="8" cy="8" r="2" />
      </>
    ),
    github: (
      <>
        <path d="M5.8 13.5 C3.2 14.3 3.2 12.2 2.1 11.9" />
        <path d="M11.8 13.5 V11.1 C11.85 10.35 11.55 9.75 11.1 9.35 C12.6 9.15 14.2 8.6 14.2 6.1 C14.2 5.35 13.9 4.65 13.35 4.1 C13.5 3.5 13.5 2.8 13.15 2.1 C13.15 2.1 12.5 1.9 11.05 2.9 C9.8 2.55 8.45 2.55 7.2 2.9 C5.75 1.9 5.1 2.1 5.1 2.1 C4.75 2.8 4.75 3.5 4.9 4.1 C4.35 4.65 4.05 5.35 4.05 6.1 C4.05 8.6 5.65 9.15 7.15 9.35 C6.75 9.7 6.5 10.2 6.45 10.8 V13.5" />
      </>
    ),
    heart: (
      <path d="M8 13.3 C5.35 11.1 2.5 8.85 2.5 5.85 C2.5 4.15 3.7 3 5.25 3 C6.25 3 7.15 3.55 8 4.55 C8.85 3.55 9.75 3 10.75 3 C12.3 3 13.5 4.15 13.5 5.85 C13.5 8.85 10.65 11.1 8 13.3 Z" />
    ),
    menu: (
      <>
        <path d="M3 4.5 H13" />
        <path d="M3 8 H13" />
        <path d="M3 11.5 H13" />
      </>
    ),
    moon: (
      <path d="M12.5 10.8 C11.55 11.95 10.1 12.7 8.45 12.7 C5.6 12.7 3.3 10.4 3.3 7.55 C3.3 5.45 4.55 3.6 6.35 2.8 C6.05 3.55 5.9 4.35 5.9 5.2 C5.9 8.25 8.35 10.7 11.4 10.7 C11.78 10.7 12.15 10.67 12.5 10.8 Z" />
    ),
    more: (
      <>
        <circle cx="4" cy="8" r="0.75" />
        <circle cx="8" cy="8" r="0.75" />
        <circle cx="12" cy="8" r="0.75" />
      </>
    ),
    package: (
      <>
        <path d="M2.5 4.5 L8 2 L13.5 4.5 V11.5 L8 14 L2.5 11.5 Z" />
        <path d="M2.5 4.5 L8 7 L13.5 4.5" />
        <path d="M8 7 V14" />
      </>
    ),
    search: (
      <>
        <circle cx="7.5" cy="7.5" r="5.25" />
        <path d="M11.5 11.5 L14.5 14.5" />
      </>
    ),
    share: (
      <>
        <circle cx="4" cy="8" r="1.6" />
        <circle cx="11.5" cy="4" r="1.6" />
        <circle cx="11.5" cy="12" r="1.6" />
        <path d="M5.4 7.25 L10.1 4.75" />
        <path d="M5.4 8.75 L10.1 11.25" />
      </>
    ),
    sheet: (
      <>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
        <path d="M2.5 6 H13.5 M2.5 9.5 H13.5 M6 2.5 V13.5 M9.5 2.5 V13.5" />
      </>
    ),
    tag: (
      <>
        <path d="M2.5 3.5 V7.5 L8.7 13.7 L13.7 8.7 L7.5 2.5 H3.5 C2.95 2.5 2.5 2.95 2.5 3.5 Z" />
        <circle cx="5.6" cy="5.6" r="0.8" />
      </>
    ),
    terminal: (
      <>
        <path d="M3 4.5 L6.2 8 L3 11.5" />
        <path d="M7.5 11.5 H13" />
      </>
    ),
    trash: (
      <>
        <path d="M3.5 4.5 H12.5" />
        <path d="M6.5 4.5 V3 H9.5 V4.5" />
        <path d="M5 6.5 L5.5 13 H10.5 L11 6.5" />
        <path d="M7.25 7.75 V11.25" />
        <path d="M8.75 7.75 V11.25" />
      </>
    ),
    upload: (
      <>
        <path d="M8 14 V5" />
        <path d="M4.5 8.5 L8 5 L11.5 8.5" />
        <path d="M3 2.5 H13" />
      </>
    ),
    user: (
      <>
        <circle cx="8" cy="6" r="2.5" />
        <path d="M3.5 13 C4.5 10.5 11.5 10.5 12.5 13" />
      </>
    ),
    x: (
      <>
        <path d="M3 3 L13 13" />
        <path d="M13 3 L3 13" />
      </>
    ),
    play: (
      <path d="M5 3.5 L12.5 8 L5 12.5 Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
    ),
    link: (
      <>
        <path d="M9 6 L11 4 C12.4 2.6 14.4 2.6 15 3.2 C15.6 3.8 15.6 5.6 14 7 L12 9" transform="scale(0.85) translate(0.6 0.5)" />
        <path d="M7 10 L5 12 C3.6 13.4 1.6 13.4 1 12.8 C0.4 12.2 0.4 10.4 2 9 L4 7" transform="scale(0.85) translate(0.6 0.5)" />
        <path d="M6 10 L10 6" />
      </>
    ),
    sparkle: (
      <>
        <path d="M8 2 L9 6.5 L13.5 8 L9 9.5 L8 14 L7 9.5 L2.5 8 L7 6.5 Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.8 V3.2" />
        <path d="M8 12.8 V14.2" />
        <path d="M1.8 8 H3.2" />
        <path d="M12.8 8 H14.2" />
        <path d="M3.6 3.6 L4.6 4.6" />
        <path d="M11.4 11.4 L12.4 12.4" />
        <path d="M12.4 3.6 L11.4 4.6" />
        <path d="M4.6 11.4 L3.6 12.4" />
      </>
    )
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
