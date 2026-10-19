// Apply the saved theme before first paint to avoid a flash. Kept as an external file so the
// server's Content-Security-Policy (script-src 'self') can stay strict.
try {
  var t = localStorage.getItem("nch.theme");
  if (t === '"light"' || t === '"dark"') t = JSON.parse(t);
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
    document.documentElement.setAttribute("data-theme", "light");
} catch (e) {
  /* storage blocked: default dark theme */
}
