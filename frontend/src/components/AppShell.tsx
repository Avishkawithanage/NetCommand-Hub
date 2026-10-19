import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { favouritesStore, sidebarStore, themeStore, useStore } from "../lib/store";
import { Icon, type IconName } from "./Icon";

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Overview", icon: "overview", end: true },
  { to: "/library", label: "Command Library", icon: "library" },
  { to: "/vendors", label: "Vendors", icon: "vendors" },
  { to: "/builder", label: "Configuration Builder", icon: "builder" },
  { to: "/diff", label: "Configuration Diff", icon: "diff" },
  { to: "/favourites", label: "Favourites", icon: "star" },
  { to: "/my-templates", label: "My Templates", icon: "templates" },
  { to: "/glossary", label: "Glossary", icon: "glossary" },
  { to: "/about", label: "Settings / About", icon: "about" },
];

export function ThemeToggle() {
  const theme = useStore(themeStore);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => themeStore.set(next)}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

export function GlobalSearch() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    nav(term ? `/library?q=${encodeURIComponent(term)}` : "/library");
  };

  return (
    <form className="search" role="search" onSubmit={submit}>
      <Icon name="search" size={16} />
      <input
        ref={ref}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search commands and templates   ( / )"
        aria-label="Search commands and templates"
        maxLength={200}
      />
    </form>
  );
}

export function AppShell() {
  const collapsed = useStore(sidebarStore);
  const favs = useStore(favouritesStore);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`shell${collapsed ? " is-collapsed" : ""}${open ? " nav-open" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" id="sidebar" aria-label="Primary">
        <div className="brand">
          <Link to="/" className="brand-link" aria-label="NetCommand Hub - overview">
            <span className="brand-mark" aria-hidden="true">&gt;_</span>
            <span className="brand-name">NetCommand Hub</span>
          </Link>
          <button
            type="button"
            className="icon-btn only-mobile"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav>
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} title={n.label}>
                  <Icon name={n.icon} />
                  <span className="nav-label">{n.label}</span>
                  {n.to === "/favourites" && favs.length > 0 && <span className="nav-count">{favs.length}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          className="collapse-btn only-desktop"
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => sidebarStore.set(!collapsed)}
        >
          <span className={collapsed ? "flip" : ""}><Icon name="collapse" /></span>
          <span className="nav-label">Collapse</span>
        </button>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="main-col">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn only-mobile"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="sidebar"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <GlobalSearch />
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
