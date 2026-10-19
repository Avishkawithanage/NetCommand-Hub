import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Disclaimer, PageHeader, VerificationBadge } from "../components/ui";
import { useToast } from "../components/Toast";
import { useDocumentTitle } from "../lib/hooks";
import { STATUS_HELP } from "../lib/labels";
import { favouritesStore, personalStore, recentStore, themeStore, useStore } from "../lib/store";
import type { VerificationStatus } from "../types";

const STATUSES: VerificationStatus[] = ["draft", "unverified", "reviewed", "lab-tested", "needs-review"];

export default function About() {
  useDocumentTitle("Settings and About");
  const theme = useStore(themeStore);
  const favs = useStore(favouritesStore);
  const personal = useStore(personalStore);
  const recent = useStore(recentStore);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();

  return (
    <>
      <PageHeader title="Settings and About" description="Preferences, how your data is stored, and how to read verification labels." />

      <section className="section" aria-labelledby="h-pref">
        <h2 id="h-pref">Preferences</h2>
        <div className="field narrow">
          <label htmlFor="pref-theme">Theme</label>
          <select id="pref-theme" value={theme} onChange={(e) => themeStore.set(e.target.value === "light" ? "light" : "dark")}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </section>

      <section className="section" aria-labelledby="h-data">
        <h2 id="h-data">Your data</h2>
        <p>
          Favourites, recently viewed items, personal templates and preferences are saved in <strong>this browser only</strong> (local
          storage). There are no accounts, nothing is uploaded, and clearing site data removes them. Use
          {" "}<Link to="/my-templates">My Templates → Export all</Link> to keep a backup.
        </p>
        <ul className="list">
          <li>{favs.length} favourite(s)</li>
          <li>{personal.length} personal template(s)</li>
          <li>{recent.length} recently viewed item(s)</li>
        </ul>
        <button className="btn btn-danger" onClick={() => setConfirm(true)}>Clear all saved data</button>
      </section>

      <section className="section" aria-labelledby="h-labels">
        <h2 id="h-labels">Verification labels</h2>
        <dl className="explain">
          {STATUSES.map((s) => (
            <div key={s}>
              <dt><VerificationBadge status={s} /></dt>
              <dd>{STATUS_HELP[s]}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">"Reviewed" never means guaranteed safe in production. Currently every bundled template is <strong>Unverified</strong>.</p>
      </section>

      <section className="section" aria-labelledby="h-scope">
        <h2 id="h-scope">What this application is - and is not</h2>
        <ul className="list">
          <li>A command <strong>library and configuration generator</strong>: it produces text for you to review.</li>
          <li>It does <strong>not</strong> connect to, log in to or change any device, and it stores no device passwords.</li>
          <li>It does not claim every model, OS version or feature is supported. Check the compatibility note on each entry.</li>
        </ul>
        <h3>Keyboard shortcuts</h3>
        <ul className="list">
          <li><kbd>/</kbd> focuses the global search box.</li>
          <li><kbd>Esc</kbd> closes dialogs and the mobile menu.</li>
          <li><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> move between controls; the code panels are focusable and scroll with the arrow keys.</li>
        </ul>
        <Disclaimer />
      </section>

      <ConfirmDialog
        open={confirm}
        title="Clear all saved data?"
        message="This removes your favourites, recently viewed list and personal templates from this browser. This cannot be undone."
        confirmLabel="Clear everything"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          favouritesStore.set([]);
          recentStore.set([]);
          personalStore.set([]);
          setConfirm(false);
          toast.show("Saved data cleared", "info");
        }}
      />
    </>
  );
}
