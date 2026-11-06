const paths = {
  overview: <><path d="M3 4h8v7H3zM13 4h8v4h-8zM13 10h8v10h-8zM3 13h8v7H3z" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19v-1.4a5.5 5.5 0 0 1 11 0V19zM16 5.3a3 3 0 0 1 0 5.8m1.3 3.3a4.4 4.4 0 0 1 3.2 4.2V19h-3" /></>,
  box: <><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="m4.3 7.4 7.7 4 7.7-4M12 11.5V21M8 5.1l8 4.2" /></>,
  record: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4" /></>,
  cart: <><path d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5L20 9H6" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" /></>,
  shelf: <><path d="M4 4h16v16H4zM4 10h16M4 15h16M9 10v5m6-5v5" /></>,
  return: <><path d="M8 8 4 12l4 4M4 12h10a5 5 0 0 1 0 10h-2" /><path d="M14 4h6v6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.5 15" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  edit: <><path d="m4 16-.8 4.8L8 20l11-11a2.8 2.8 0 0 0-4-4zM13.5 6.5l4 4" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  warning: <><path d="M12 3 2.8 20h18.4zM12 9v5m0 3h.01" /></>,
  sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 3 .5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3Z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9" /></>
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg className={className} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.record}
    </svg>
  );
}
