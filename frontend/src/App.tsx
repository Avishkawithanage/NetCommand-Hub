import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import { EmptyState } from "./components/ui";
import { CatalogProvider } from "./lib/catalog";
import { themeStore, useStore } from "./lib/store";
import About from "./pages/About";
import Builder from "./pages/Builder";
import DiffPage from "./pages/DiffPage";
import Favourites from "./pages/Favourites";
import Glossary from "./pages/Glossary";
import Library from "./pages/Library";
import MyTemplates from "./pages/MyTemplates";
import Overview from "./pages/Overview";
import TemplateDetail from "./pages/TemplateDetail";
import { VendorDetail, VendorList } from "./pages/Vendors";

export default function App() {
  const theme = useStore(themeStore);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ToastProvider>
      <CatalogProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="library" element={<Library />} />
            <Route path="library/:id" element={<TemplateDetail />} />
            <Route path="vendors" element={<VendorList />} />
            <Route path="vendors/:vendorId" element={<VendorDetail />} />
            <Route path="builder" element={<Builder />} />
            <Route path="diff" element={<DiffPage />} />
            <Route path="favourites" element={<Favourites />} />
            <Route path="my-templates" element={<MyTemplates />} />
            <Route path="glossary" element={<Glossary />} />
            <Route path="about" element={<About />} />
            <Route
              path="*"
              element={
                <EmptyState title="Page not found" action={<Link className="btn" to="/">Go to overview</Link>}>
                  That address does not exist.
                </EmptyState>
              }
            />
          </Route>
        </Routes>
      </CatalogProvider>
    </ToastProvider>
  );
}
