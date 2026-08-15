
// import { Geist, Geist_Mono } from "next/font/google";
import localFont from 'next/font/local';
import { ProjectsContextProvider } from "@/context/ProjectsContext";
import { ProjectAuthContextProvider } from "@/context/ProjectAuthContext";
import { StorageContextProvider } from "@/context/StorageContext";
import { DatabaseContextProvider } from "@/context/DatabaseContext";
import { DialogsProvider } from "@/context/DialogsContext";

import "./globals.css";
import { ToastContainer } from "react-toastify";
import { LayoutProvider } from '@/context/LayoutContext';

// Self-hosted so the build/runtime never depends on Google Fonts being reachable.
const montserrat = localFont({
  src: [
    { path: './fonts/Montserrat-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/Montserrat-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/Montserrat-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
});

export const metadata = {
  title: "FlexDocs Admin Dashboard",
  description: "Multi Databases Project",
  // This is a private admin console — the login screen and every page behind it
  // (dashboard, per-project database/storage/accounts, settings). Keep the whole
  // thing out of search results. next.config.mjs sends the same directive as an
  // X-Robots-Tag header, which additionally covers the middleware auth redirects
  // that never render this layout.
  robots: {
    index: false,
    follow: false,
  },
};

// Every app-wide context is mounted here and ONLY here. Nested layouts used to
// re-mount Layout/Projects/ProjectAuth/Dialogs, which split state ownership by
// accident: pages under /[projectCode] read the inner Projects instance but the
// root Storage/Database ones, and two LayoutProviders tracked `sidebarClosed`
// independently against the same localStorage key. One provider, one owner.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-gray-100">
      <body className={`${montserrat.className} antialiased`}>
        <LayoutProvider>
          <ProjectsContextProvider>
            <ProjectAuthContextProvider>
              <StorageContextProvider>
                <DatabaseContextProvider>
                  <DialogsProvider>{children}</DialogsProvider>
                </DatabaseContextProvider>
              </StorageContextProvider>
            </ProjectAuthContextProvider>
          </ProjectsContextProvider>
        </LayoutProvider>
        {/* The one and only toast host. react-toastify renders every toast in
            EVERY mounted container, so a second one anywhere in the tree shows
            each toast twice. */}
        <ToastContainer />
      </body>
    </html>
  );
}
