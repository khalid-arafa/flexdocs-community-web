import React from 'react'

function Button({children, onClick, className = "", type = "button", variant = "primary", isLoading = false, ref}) {
  const getClasses = () => {
    let classes = "w-full cursor-pointer text-white py-3 px-4 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ";    
    if(variant === "primary") {
      classes += "bg-linear-to-r from-[#192542] to-[#213055] hover:to-purple-700 focus:ring-indigo-500 ";
    } else if(variant === "cancel") {
      classes += "bg-linear-to-r from-red-500 to-red-700 hover:to-red-600 focus:ring-red-500 ";
    } else if(variant === "secondary") {
      classes += "bg-linear-to-r from-gray-500 to-gray-600 hover:to-gray-700 focus:ring-gray-500 ";
    }    
    if(className) classes += className;    
    return classes;
  }
  
  return (
    <button
      ref={ref}
      type={type}
      className={getClasses()}
      disabled={isLoading}
      onClick={(e) => onClick(e)}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {"Wait ..."}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

export default Button