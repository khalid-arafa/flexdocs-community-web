"use client";
import React from 'react'
import { motion } from "framer-motion";
import { useLayoutContext } from '@/context/LayoutContext';


function LayoutWrapper({sidebar, children}) {
  const {sidebarClosed} = useLayoutContext();

  const getClassnames = () => {
    let classnames = "min-h-screen bg-gray-100 w-full flex flex-col transition-all overflow-hidden duration-400 ease-in-out";
    classnames += !sidebarClosed ? "ml-0 md:ml-75 " : " ml-0 md:ml-16 md:w-[calc(100%-62px)]"
    return classnames;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-100 to-blue-50">
      <div className="mx-auto flex flex-col lg:flex-row">
        {sidebar}
          <div className={getClassnames()}>
            {/* right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              className="flex flex-col"
            >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LayoutWrapper