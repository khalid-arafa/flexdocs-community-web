// utils/dialog.js
import { X } from "lucide-react";
import { createRoot } from "react-dom/client";

export function showDialog({ content, params }) {
  // Create container
  const dialogContainer = document.createElement("div");
  document.body.appendChild(dialogContainer);

  // Create root
  const root = createRoot(dialogContainer);

  // Close function - animates out and removes dialog from DOM
  const closeDialog = () => {
    const dialogElement = document.getElementById("dialog-backdrop");
    const dialogContent = document.getElementById("dialog-content");

    // Animate out
    dialogElement.classList.replace("bg-opacity-30", "bg-opacity-0");
    dialogElement.classList.replace("backdrop-blur-sm", "backdrop-blur-none");
    dialogContent.classList.replace("scale-100", "scale-95");
    dialogContent.classList.replace("opacity-100", "opacity-0");

    // Wait for animation to finish then remove
    setTimeout(() => {
      root.unmount();
      try {
        document.body.removeChild(dialogContainer);
      } catch (error) {}
    }, 300);
  };

  // Dialog component
  const DialogContent = () => {
    return (
      <div
        id="dialog-backdrop"
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 backdrop-blur-none z-50 transition-all duration-500 ease-in-out"
        style={{
          background: "#00000090",
        }}
        // onClick={handleBackdropClick}
      >
        <div
          id="dialog-content"
          className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 transform scale-95 opacity-0 transition-all duration-300 ease-in-out"
        >
          <div className="mb-2">
            <button
              className="absolute right-0 top-0 cursor-pointer p-4 hover:opacity-100 opacity-50 transition-all ease-in-out"
              onClick={closeDialog}
            >
              <X size={22} color="black" />
            </button>
            {content({ ...{ onDone: () => closeDialog() }, ...params })}
          </div>
        </div>
      </div>
    );
  };

  // Render dialog
  root.render(<DialogContent />);

  // Start the "appear" animation after a small delay
  setTimeout(() => {
    const dialogElement = document.getElementById("dialog-backdrop");
    const dialogContent = document.getElementById("dialog-content");

    if (dialogElement && dialogContent) {
      dialogElement.classList.replace("bg-opacity-0", "bg-opacity-30");
      dialogElement.classList.replace("backdrop-blur-none", "backdrop-blur-sm");
      dialogContent.classList.replace("scale-95", "scale-100");
      dialogContent.classList.replace("opacity-0", "opacity-100");
    }
  }, 10);

  // Return close function
  return closeDialog;
}
