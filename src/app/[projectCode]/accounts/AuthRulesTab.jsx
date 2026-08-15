"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader } from "lucide-react";
import Switch from "@/components/Switch";
import { loadAuthRules, saveAuthRules } from "@/utils/api";
import { useProjectsContext } from "@/context/ProjectsContext";
import { toast } from "react-toastify";

const AUTH_RULES_CONFIG = [
  {
    key: "allowEmailRegistration",
    label: "Allow Email Registration",
    description: "Allow new users to register with email and password.",
  },
  {
    key: "allowAnonymousLogin",
    label: "Allow Anonymous Login",
    description: "Allow users to sign in anonymously without credentials.",
  },
  {
    key: "requireStrongPassword",
    label: "Require Strong Password",
    description:
      "Enforce passwords with 8+ characters, uppercase, lowercase, number, and symbol.",
  },
  {
    key: "allowPasswordReset",
    label: "Allow Password Reset",
    description: "Allow users to reset their password via email.",
  },
  {
    key: "allowEmailVerification",
    label: "Allow Email Verification",
    description: "Allow users to request email verification links.",
  },
  {
    key: "requireEmailVerification",
    label: "Require Email Verification",
    description: "Require users to verify their email before logging in.",
  },
];

export default function AuthRulesTab() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { activeProject } = useProjectsContext();

  // A failed load used to leave `rules` at null while the render below read
  // `rules[key]` for every switch — a TypeError that took the whole tab to the
  // error boundary. The failure is now state the tab can render: an explicit
  // error message plus a retry, never an empty-looking list of switches that
  // would misreport every rule as "off".
  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadAuthRules({ code: activeProject.code });
      const body = await result.json();
      if (result.ok) setRules(body || {});
      else setError(body?.message || "Failed to load auth rules");
    } catch (err) {
      setError("Failed to load auth rules");
    }
    setLoading(false);
  }, [activeProject]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key, value) => {
    const prev = { ...rules };
    const updated = { ...rules, [key]: value };
    setRules(updated);
    setSaving(true);
    try {
      const result = await saveAuthRules({
        code: activeProject.code,
        rules: updated,
      });
      const body = await result.json();
      if (result.ok) {
        toast("Auth rules updated successfully!");
      } else {
        setRules(prev);
        toast(body.message);
      }
    } catch (error) {
      setRules(prev);
      toast(error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <Loader className="w-6 h-6 animate-spin text-gray-800" />
      </div>
    );
  }

  // `!rules` is folded in here on purpose: with no rules object there is nothing
  // truthful to render, so it gets the error state rather than a row of switches
  // that would all read as disabled.
  if (error || !rules) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 px-4 text-center">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-gray-500">
          {error || "Failed to load auth rules"}
        </p>
        <button
          onClick={load}
          className="cursor-pointer px-3 py-1 rounded hover:bg-gray-900 bg-gray-800 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {AUTH_RULES_CONFIG.map(({ key, label, description }) => (
        <div
          key={key}
          className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 mr-4">
            <div className="text-sm font-medium text-gray-900">{label}</div>
            <div className="text-sm text-gray-500 mt-0.5">{description}</div>
          </div>
          <Switch
            checked={!!rules[key]}
            onChange={(value) => handleToggle(key, value)}
            disabled={saving}
          />
        </div>
      ))}
    </div>
  );
}
