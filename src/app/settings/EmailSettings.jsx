"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Send, Mail } from "lucide-react";
import Button from "@/components/Button";
import { getEmailConfig, updateEmailConfig, sendTestEmail } from "@/utils/api";

const MASK = "********";

const INPUT_CLASS =
  "mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";

const SOURCE_LABEL = {
  database: { text: "Saved in database", cls: "bg-green-100 text-green-700" },
  env: { text: "From environment variables", cls: "bg-blue-100 text-blue-700" },
  none: { text: "Not configured", cls: "bg-gray-100 text-gray-600" },
};

const EMPTY = {
  provider: "none",
  smtp: { host: "", port: 587, user: "", pass: "" },
  resendApiKey: "",
  from: { name: "", email: "" },
  supportEmail: "",
};

export default function EmailSettings() {
  const [cfg, setCfg] = useState(EMPTY);
  const [meta, setMeta] = useState({
    source: "none",
    updatedAt: null,
    smtpPassSet: false,
    resendKeySet: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");

  const applyMasked = (body) => {
    setCfg({
      provider: body.provider || "none",
      smtp: {
        host: body.smtp?.host || "",
        port: body.smtp?.port || 587,
        user: body.smtp?.user || "",
        pass: "", // never prefill secrets
      },
      resendApiKey: "",
      from: { name: body.from?.name || "", email: body.from?.email || "" },
      supportEmail: body.supportEmail || "",
    });
    setMeta({
      source: body.source || "none",
      updatedAt: body.updatedAt || null,
      smtpPassSet: body.smtp?.pass === MASK,
      resendKeySet: body.resendApiKey === MASK,
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getEmailConfig();
        const body = await res.json();
        if (res.ok) applyMasked(body);
        else toast(body.message || "Failed to load email settings");
      } catch {
        toast("Failed to load email settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setProvider = (provider) => setCfg((c) => ({ ...c, provider }));
  const setSmtp = (key, value) =>
    setCfg((c) => ({ ...c, smtp: { ...c.smtp, [key]: value } }));
  const setFrom = (key, value) =>
    setCfg((c) => ({ ...c, from: { ...c.from, [key]: value } }));

  // Only send secret fields when the operator typed a new value, so a
  // save without re-entering them keeps the stored secrets intact.
  const buildPayload = () => {
    const payload = {
      provider: cfg.provider,
      from: { name: cfg.from.name.trim(), email: cfg.from.email.trim() },
      supportEmail: cfg.supportEmail.trim(),
    };
    if (cfg.provider === "smtp") {
      payload.smtp = {
        host: cfg.smtp.host.trim(),
        port: Number(cfg.smtp.port) || 587,
        user: cfg.smtp.user.trim(),
      };
      if (cfg.smtp.pass) payload.smtp.pass = cfg.smtp.pass;
    } else if (cfg.provider === "resend") {
      if (cfg.resendApiKey) payload.resendApiKey = cfg.resendApiKey;
    }
    return payload;
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const res = await updateEmailConfig(buildPayload());
      const body = await res.json();
      if (res.ok) {
        applyMasked(body);
        toast("Email settings saved");
      } else {
        toast(body.message || "Failed to save email settings");
      }
    } catch {
      toast("Failed to save email settings");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await sendTestEmail(testTo.trim() || undefined);
      const body = await res.json();
      if (res.ok)
        toast(`Test email sent via ${body.provider || "the configured provider"} ✓`);
      else toast(body.message || "Failed to send test email");
    } catch {
      toast("Failed to send test email");
    }
    setTesting(false);
  };

  const src = SOURCE_LABEL[meta.source] || SOURCE_LABEL.none;

  return (
    <div className="border-t border-gray-200 mt-10 pt-8">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={22} className="text-[#213055]" />
        <h2 className="text-2xl font-bold text-gray-900">Email Configuration</h2>
        <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${src.cls}`}>
          {src.text}
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-6">
        Configure how this instance sends email (password resets, verification).
        You can set or change it here at any time — useful if you skipped it
        during first-run setup.
      </p>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider */}
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
              Provider
            </label>
            <select
              id="provider"
              value={cfg.provider}
              onChange={(e) => setProvider(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="none">None (disable email)</option>
              <option value="smtp">SMTP</option>
              <option value="resend">Resend</option>
            </select>
          </div>

          {/* SMTP fields */}
          {cfg.provider === "smtp" && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700">
                    SMTP host
                  </label>
                  <input
                    id="smtpHost"
                    type="text"
                    value={cfg.smtp.host}
                    onChange={(e) => setSmtp("host", e.target.value)}
                    placeholder="smtp.example.com"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="w-32">
                  <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700">
                    Port
                  </label>
                  <input
                    id="smtpPort"
                    type="number"
                    value={cfg.smtp.port}
                    onChange={(e) => setSmtp("port", e.target.value)}
                    placeholder="587"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700">
                  SMTP user
                </label>
                <input
                  id="smtpUser"
                  type="text"
                  autoComplete="off"
                  value={cfg.smtp.user}
                  onChange={(e) => setSmtp("user", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700">
                  SMTP password
                </label>
                <input
                  id="smtpPass"
                  type="password"
                  autoComplete="new-password"
                  value={cfg.smtp.pass}
                  onChange={(e) => setSmtp("pass", e.target.value)}
                  placeholder={meta.smtpPassSet ? "•••••••• (leave blank to keep current)" : "Enter SMTP password"}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {/* Resend fields */}
          {cfg.provider === "resend" && (
            <div>
              <label htmlFor="resendKey" className="block text-sm font-medium text-gray-700">
                Resend API key
              </label>
              <input
                id="resendKey"
                type="password"
                autoComplete="off"
                value={cfg.resendApiKey}
                onChange={(e) => setCfg((c) => ({ ...c, resendApiKey: e.target.value }))}
                placeholder={meta.resendKeySet ? "•••••••• (leave blank to keep current)" : "re_..."}
                className={INPUT_CLASS}
              />
            </div>
          )}

          {/* From / Support — shown when a provider is selected */}
          {cfg.provider !== "none" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">
                  From name
                </label>
                <input
                  id="fromName"
                  type="text"
                  value={cfg.from.name}
                  onChange={(e) => setFrom("name", e.target.value)}
                  placeholder="FlexDocs"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700">
                  From email
                </label>
                <input
                  id="fromEmail"
                  type="email"
                  value={cfg.from.email}
                  onChange={(e) => setFrom("email", e.target.value)}
                  placeholder="no-reply@example.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={saving}
              className="flex items-center justify-center gap-2 max-w-[200px]"
            >
              <Check size={20} color="white" />
              Save Email Settings
            </Button>
          </div>
        </form>
      )}

      {/* Test email */}
      <div className="mt-8 rounded-xl bg-gray-50 border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Send a test email</h3>
        <p className="text-gray-500 text-xs mb-3">
          Sends a test message using the saved configuration to verify it works.
          Leave the field empty to send it to your own admin email.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="testTo" className="block text-sm font-medium text-gray-700">
              Recipient (optional)
            </label>
            <input
              id="testTo"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <Button
            onClick={handleTest}
            isLoading={testing}
            variant="secondary"
            className="flex items-center justify-center gap-2 max-w-[200px]"
          >
            <Send size={18} color="white" />
            Send test email
          </Button>
        </div>
      </div>
    </div>
  );
}
