const PATHS: Record<string, string> = {
  overview: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  library: "M4 5h16M4 10h16M4 15h10M4 20h7",
  vendors: "M4 20V8l8-4 8 4v12M9 20v-6h6v6M9 10h.01M15 10h.01",
  builder: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z",
  diff: "M8 3v12M8 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM16 21V9M16 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z",
  templates: "M7 3h10l3 3v15H7zM17 3v4h4M10 12h7M10 16h7",
  glossary: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
  about: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7.5h.01",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  check: "M5 13l4 4L19 7",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  plus: "M12 5v14M5 12h14",
  chevron: "M9 6l6 6-6 6",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  warning: "M12 3l10 18H2zM12 10v5M12 18h.01",
  collapse: "M15 6l-6 6 6 6",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
