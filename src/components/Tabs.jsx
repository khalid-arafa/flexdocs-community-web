"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

// Main Tabs component
export default function Tabs({ tabs = [], trailing }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);

  // Handle tab selection
  const handleTabClick = (index) => {
    setActiveTab(index);
  };

  // Check if tabs exist and have length before rendering
  if (!tabs || tabs.length === 0) {
    return <div className="p-4 text-gray-500">No tabs provided</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto rounded-lg p-2 md:p-6">
      {/* Tab navigation with content-based width and trailing section */}
      <div className="flex border-b border-gray-200 relative">
        <div className="flex flex-grow">
          {tabs.map((tab, index) => (
            <div
              key={index}
              className="relative"
              ref={(el) => (tabRefs.current[index] = el)}
            >
              <button
                className={`px-4 py-3 font-medium text-sm focus:outline-none cursor-pointer transition-colors duration-300 ease-in-out mr-2
                  ${
                    activeTab === index
                      ? "text-brand font-semibold"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                onClick={() => handleTabClick(index)}
              >
                {tab.label}
              </button>
              {activeTab === index && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand mx-1"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Trailing section for additional functionality */}
        <div className="flex items-center ml-auto">{trailing}</div>
      </div>

      {/* Tab content with animation */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pt-6"
      >
        {tabs[activeTab] && tabs[activeTab].content}
      </motion.div>
    </div>
  );
}
