"use client"

import React from 'react'
import UserSidebar from './UserSidebar'
import { useLayoutContext } from '@/context/LayoutContext'

function AdminSidebarContent() {
  const {sidebarClosed} = useLayoutContext();
  return (
    <UserSidebar>
      {!sidebarClosed && <div className="relative z-10 py-16 px-4">
        <div className="space-y-4 mt-8">
          <div className="flex items-start space-x-3">
            <div className="bg-[#64748B] p-2 rounded-full mt-1">
              <svg
                className="w-5 h-5 text-[#0F172A]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Team Collaboration</h3>
              <p className="text-[#94A3B8]">
                Multi-project workflows
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-[#64748B] p-2 rounded-full mt-1">
              <svg
                className="w-5 h-5 text-[#0F172A]"
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
              <h3 className="font-semibold text-lg">Simple Management</h3>
              <p className="text-[#94A3B8]">
                Centralized resource control
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="bg-[#64748B] p-2 rounded-full mt-1">
              <svg
                className="w-5 h-5 text-[#0F172A]"
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
              <h3 className="font-semibold text-lg">Fast & Reliable</h3>
              <p className="text-[#94A3B8]">
                Optimized for scale
              </p>
            </div>
          </div>
        </div>
      </div>}
    </UserSidebar>
  )
}

export default AdminSidebarContent