"use client";
import React from "react";

function LoadMorePagination({
  loadMore,
  showing,
  totalCount,
  canLoadMore = true,
}) {
  return (
    <div className="flex flex-col justify-center items-center space-x-2 mt-4 p-4 border-t">
      {canLoadMore && (
        <button
          onClick={loadMore}
          className={`w-30s cursor-pointer px-3 py-1 rounded hover:bg-gray-900 bg-gray-800 text-white`}
        >
          Load More
        </button>
      )}
      {typeof showing !== "undefined" && typeof totalCount !== "undefined" && (
        <span className="text-sm text-gray-600 my-2">
          Showing <span className="font-bold">{showing}</span> of{" "}
          <span className="font-bold">{totalCount}</span>
        </span>
      )}
    </div>
  );
}

export default LoadMorePagination;
