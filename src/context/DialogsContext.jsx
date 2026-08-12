"use client";
import Button from "@/components/Button";
import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";

const DialogContext = createContext();

export function useDialogs() {
  const context = useContext(DialogContext);
  return context;
}

export function DialogsProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = ({ title = "Confirmation", msg = "Are you sure?" } = {}) => {
    return new Promise((rs) => {
      resolveRef.current = rs;
      setDialog(
        <ConfirmDialog
          title={title}
          msg={msg}
          onClick={(value) => {
            setDialog(null);
            resolveRef.current(value);
          }}
        />
      );
    });
  };

  const showAlert = ({ msg, type = "success" }) => {
    setDialog(
      <AlertDialog
        type={type}
        msg={msg}
        onDismiss={() => {
          if (resolveRef.current != null) return;
          setDialog(null);
        }}
      />
    );
  };

  return (
    <DialogContext.Provider value={{ confirm, showAlert }}>
      {children}
      {dialog}
    </DialogContext.Provider>
  );
}

// Confirm Dialog
//
// Accessibility: it is a real modal, so it says so (role="dialog",
// aria-modal), names itself via aria-labelledby/aria-describedby, closes on
// Escape, and moves focus to the safe default (Cancel) on open so a stray
// Enter/Space can't confirm a destructive action.
function ConfirmDialog({ title, msg, onClick }) {
  const [isVisible, setIsVisible] = useState(false);
  const cancelRef = useRef(null);
  const titleId = "confirm-dialog-title";
  const msgId = "confirm-dialog-msg";

  const handleClick = async (value) => {
    setIsVisible(false);
    await new Promise((rs) => setTimeout(() => rs(), 200));
    onClick(value);
  };

  useEffect(() => {
    setIsVisible(true);
    // Default focus to Cancel: for a destructive confirm the safe choice should
    // be the one a reflexive keypress hits.
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClick(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-all duration-300 ease-in-out
        ${isVisible ? "z-10 backdrop-blur-sm" : "-z-10 backdrop-blur-none"}`}
    >
      <div
        className={`fixed inset-0 transition-all duration-300 ease-in-out
          ${isVisible ? "bg-black/40" : "bg-transparent"}`}
        onClick={() => handleClick(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={msg ? msgId : undefined}
        className={`bg-white p-8 pb-6 rounded-3xl text-black z-20 transition-all duration-300 ease-in-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
      >
        {title && (
          <p id={titleId} className="font-bold text-black text-xl">
            {title}
          </p>
        )}
        {msg && (
          <p id={msgId} className="mt-2">
            {msg}
          </p>
        )}
        <div className="flex w-[80%]">
          <div className="flex justify-end gap-4 mt-6">
            <Button ref={cancelRef} variant="cancel" onClick={() => handleClick(false)}>
              No
            </Button>
            <Button onClick={() => handleClick(true)}>Yes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertDialog({ type = "success", msg, onDismiss }) {
  const [classNames, setClassNames] = useState("");
  const timerRef = useRef(null);

  const pauseTimer = () => clearTimeout(timerRef.current);

  const resetTimer = () => {
    pauseTimer();
    timerRef.current = setTimeout(() => handleClick(), 3000);
  };

  const handleClick = useCallback(async () => {
    if (classNames !== "dismissed") {
      setClassNames("dismissed");
      await new Promise((resolve) => setTimeout(resolve, 200));
      onDismiss();
    }
  }, [classNames, onDismiss]);

  useEffect(() => {
    setClassNames("active");
    timerRef.current = setTimeout(() => handleClick(), 3000);

    return () => {
      pauseTimer();
    };
  }, [handleClick]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={pauseTimer}
      onMouseLeave={resetTimer}
      className={`fixed top-24 left-0 w-full max-w-87.5 mx-4 ${bgColor} text-white rounded-2xl z-10 
        flex items-stretch transition-all duration-300 ease-in-out
        ${
          classNames === "active"
            ? "opacity-100 translate-y-0"
            : classNames === "dismissed"
            ? "opacity-0 -translate-y-2"
            : "opacity-0 translate-y-10"
        }`}
    >
      <div className="py-3 pl-6 pr-1.5 flex items-start justify-center font-bold text-base/8 grow text-right">
        {msg}
      </div>
      <div
        className="w-14 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
        onClick={handleClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    </div>
  );
}
