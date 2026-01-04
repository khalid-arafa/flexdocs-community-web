
import { Geist, Geist_Mono } from "next/font/google";
import { ProjectsContextProvider } from "@/context/ProjectsContext";
import { ProjectAuthContextProvider } from "@/context/ProjectAuthContext";
import { StorageContextProvider } from "@/context/StorageContext";
import { DatabaseContextProvider } from "@/context/DatabaseContext";
import { DialogsProvider } from "@/context/DialogsContext";

import "./globals.css";
import { ToastContainer } from "react-toastify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Multi Databses Project",
  description: "Multi Databses Project",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-gray-100">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
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
      </body>
    </html>
  );
}
