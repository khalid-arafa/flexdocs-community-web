"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import UserInfoView from "@/components/UserInfoView";
import { useDialogs } from "@/context/DialogsContext";
import { logout } from "@/utils/auth";

function UserSideSection({ withBack = false }) {
  const router = useRouter();
  const { confirm } = useDialogs();
  return (
    <div className="lg:w-1/3 relative h-full lg:min-h-screen flex items-center bg-gray-800">
      {withBack && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute top-3 left-3 z-11 hover:scale-110 transition-all ease-in-out"
        >
          <button
            className="cursor-pointer"
            onClick={(e) => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/projects");
              }
            }}
          >
            <ChevronLeftIcon size={40} color="white" />
          </button>
        </motion.div>
      )}

      <div className="flex flex-col justify-center lg:min-h-screen">
        <div className="z-10 px-8">
          <UserInfoView sidebarOpen={false} withSettings={true} />
        </div>
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="overflow-hidden p-8 flex flex-col flex-1 justify-center text-white"
        >
          <div className="absolute inset-0 bg-gray-800" />

          <div className="relative z-10 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6 inline-block border-b-4 border-emerald-400 pb-2">
                Database Platform
              </h2>
              <p className="text-lg mb-6 leading-relaxed">
                Create, manage and scale your database projects with our
                powerful infrastructure. Build once, deploy anywhere.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="space-y-4 mt-8"
            >
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-400 p-2 rounded-full mt-1">
                  <svg
                    className="w-5 h-5 text-indigo-800"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Create & Collaborate
                  </h3>
                  <p className="text-blue-100">
                    Build multiple projects with team-based workflows
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-emerald-400 p-2 rounded-full mt-1">
                  <svg
                    className="w-5 h-5 text-indigo-800"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                      clipRule="evenodd"
                    />
                    <path d="M10 9a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z" />
                    <path d="M14 13a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Powerful Management</h3>
                  <p className="text-blue-100">
                    Track and organize all your database resources
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-emerald-400 p-2 rounded-full mt-1">
                  <svg
                    className="w-5 h-5 text-indigo-800"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">High Performance</h3>
                  <p className="text-blue-100">
                    Optimized for speed and reliability at scale
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-12"
            />
          </div>
        </motion.div>
        <div className="border-t border-gray-700 mb-4">
          <button
            className="flex items-center justify-center text-white w-full cursor-pointer opacity-60 transition-opacity duration-300"
            onClick={async (e) => {
              const confirmed = await confirm({
                title: "Logout",
                msg: "Are you sure you want to logout?",
              });
              if (!confirmed) return;
              logout();
              router.replace("/login");
            }}
          >
            <ExternalLink size={22} color="white" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserSideSection;
