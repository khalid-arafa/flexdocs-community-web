
// import { Geist, Geist_Mono } from "next/font/google";
import { Montserrat } from 'next/font/google';
import { ProjectsContextProvider } from "@/context/ProjectsContext";
import { ProjectAuthContextProvider } from "@/context/ProjectAuthContext";
import { StorageContextProvider } from "@/context/StorageContext";
import { DatabaseContextProvider } from "@/context/DatabaseContext";
import { DialogsProvider } from "@/context/DialogsContext";

import "./globals.css";
import { ToastContainer } from "react-toastify";
import { LayoutProvider } from '@/context/LayoutContext';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata = {
  title: "FastDb Admin Dashboard",
  description: "Multi Databses Project",
};

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
          <ToastContainer />
        </ProjectsContextProvider>
        </LayoutProvider>
      </body>
    </html>
  );
}
