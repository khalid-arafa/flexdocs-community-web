// DropdownButton.js
import { useState, useRef, useEffect } from "react";

const DropdownButton = ({ button, choices }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [position, setPosition] = useState("bottom");
  const [menuStyles, setMenuStyles] = useState({});
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Toggle dropdown visibility with animation sequence
  const toggleDropdown = () => {
    if (!isVisible) {
      // First render the menu
      calculatePosition();
      setIsRendered(true);
      // Then trigger the animation after a brief delay
      setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      // First make it invisible with animation
      setIsVisible(false);
      // Then remove it from DOM after animation completes
      setTimeout(() => {
        setIsRendered(false);
      }, 300); // Match this with animation duration
    }
  };

  // Calculate the best position for the dropdown and specific coordinates
  const calculatePosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Calculate average text width based on menu items
    const longestItemWidth = calculateLongestItemWidth(choices);
    // Minimum 180px width, or wider if content requires it (add padding)
    const minMenuWidth = Math.max(180, longestItemWidth + 48); // 24px padding on each side

    // Set a max width to prevent extremely wide menus
    const maxMenuWidth = 320;
    const menuWidth = Math.min(minMenuWidth, maxMenuWidth);

    // Rough estimations for space needed
    const menuHeight = choices.length * 40; // Estimate each choice to be 40px tall

    // Check available space in all directions
    const spaceBelow = windowHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const spaceRight = windowWidth - buttonRect.right;
    const spaceLeft = buttonRect.left;

    // Custom styles object to position the menu exactly where we want
    const customStyles = {
      minWidth: `${minMenuWidth}px`,
      maxWidth: `${maxMenuWidth}px`,
      width: "max-content",
    };

    // Determine best position and set specific coordinates
    if (spaceBelow >= menuHeight) {
      setPosition("bottom");
      // Center horizontally if possible, otherwise align to keep on screen
      if (buttonRect.left + menuWidth > windowWidth) {
        // Align right edge of menu with right edge of screen with some padding
        customStyles.right = "0";
        customStyles.left = "auto";
      } else {
        customStyles.left = "0";
      }
      customStyles.top = "100%";
    } else if (spaceAbove >= menuHeight) {
      setPosition("top");
      if (buttonRect.left + menuWidth > windowWidth) {
        customStyles.right = "0";
        customStyles.left = "auto";
      } else {
        customStyles.left = "0";
      }
      customStyles.bottom = "100%";
    } else if (spaceRight >= menuWidth) {
      setPosition("right");
      customStyles.left = "100%";

      // Ensure menu doesn't go below bottom of screen
      if (buttonRect.top + menuHeight > windowHeight) {
        const adjustedTop = Math.max(0, windowHeight - menuHeight - 10);
        customStyles.top = `${adjustedTop - buttonRect.top}px`;
      } else {
        customStyles.top = "0";
      }
    } else if (spaceLeft >= menuWidth) {
      setPosition("left");
      customStyles.right = "100%";

      // Ensure menu doesn't go below bottom of screen
      if (buttonRect.top + menuHeight > windowHeight) {
        const adjustedTop = Math.max(0, windowHeight - menuHeight - 10);
        customStyles.top = `${adjustedTop - buttonRect.top}px`;
      } else {
        customStyles.top = "0";
      }
    } else {
      // Find the direction with most space
      const maxSpace = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);

      if (maxSpace === spaceBelow) {
        setPosition("bottom");
        customStyles.top = "100%";
        customStyles.maxHeight = `${spaceBelow - 10}px`;
        customStyles.overflowY = "auto";
      } else if (maxSpace === spaceAbove) {
        setPosition("top");
        customStyles.bottom = "100%";
        customStyles.maxHeight = `${spaceAbove - 10}px`;
        customStyles.overflowY = "auto";
      } else if (maxSpace === spaceRight) {
        setPosition("right");
        customStyles.left = "100%";
        customStyles.maxWidth = `${Math.min(maxMenuWidth, spaceRight - 10)}px`;
      } else {
        setPosition("left");
        customStyles.right = "100%";
        customStyles.maxWidth = `${Math.min(maxMenuWidth, spaceLeft - 10)}px`;
      }
    }

    // Set the calculated styles
    setMenuStyles(customStyles);
  };

  // Helper function to estimate width based on text content
  const calculateLongestItemWidth = (items) => {
    // Estimate text width based on character count (rough approximation)
    // Average char width in px (varies by font)
    const avgCharWidth = 8;

    let maxWidth = 0;
    items.forEach((item) => {
      // Calculate text width
      const labelWidth = item.label ? item.label.length * avgCharWidth : 0;
      // Add icon width if present
      const iconWidth = item.icon ? 24 : 0;
      // Total width with spacing
      const totalWidth = labelWidth + iconWidth + (item.icon ? 8 : 0);

      maxWidth = Math.max(maxWidth, totalWidth);
    });

    return maxWidth;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        isVisible
      ) {
        // First make it invisible with animation
        setIsVisible(false);
        // Then remove it from DOM after animation completes
        setTimeout(() => {
          setIsRendered(false);
        }, 300); // Match this with animation duration
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", () => {
      if (isRendered) {
        calculatePosition();
      }
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isVisible, isRendered]);

  // Get animation and base classes for the dropdown menu
  const getMenuClasses = () => {
    const baseStyles =
      "absolute bg-white rounded shadow-lg overflow-hidden z-50 transition-all duration-300 ease-in-out cursor-pointer ";

    // Spacing classes based on position
    const spacingStyles = {
      bottom: "mt-2",
      top: "mb-2",
      right: "ml-2",
      left: "mr-2",
    };

    // Origin point for scaling animation
    const originStyles = {
      bottom: "origin-top",
      top: "origin-bottom",
      right: "origin-left",
      left: "origin-right",
    };

    // Animation classes based on position
    let animationStyles;

    switch (position) {
      case "bottom":
        animationStyles = isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-2 scale-95";
        break;
      case "top":
        animationStyles = isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95";
        break;
      case "right":
        animationStyles = isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 -translate-x-2 scale-95";
        break;
      case "left":
        animationStyles = isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-2 scale-95";
        break;
      default:
        animationStyles = isVisible
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95";
    }

    return `${baseStyles} ${spacingStyles[position]} ${originStyles[position]} ${animationStyles}`;
  };

  if (!choices.length) return <>!</>;
  return (
    <div className="relative inline-block">
      {/* Button wrapper */}
      <div ref={buttonRef} onClick={toggleDropdown}>
        {button}
      </div>

      {/* Dropdown menu */}
      {isRendered && (
        <div ref={dropdownRef} className={getMenuClasses()} style={menuStyles}>
          <div className="py-1">
            {choices.map((choice, index) => (
              <button
                key={index}
                className="flex cursor-pointer items-center w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  // First animate closing
                  setIsVisible(false);
                  // Then remove from DOM and execute action after animation
                  setTimeout(() => {
                    setIsRendered(false);
                    choice.onClick();
                  }, 300);
                }}
              >
                {choice.icon && (
                  <span className="mr-2 flex-shrink-0">{choice.icon}</span>
                )}
                {choice.label && (
                  <span className="truncate">{choice.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownButton;
