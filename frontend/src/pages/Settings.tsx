import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";

export default function Settings() {
  const [params] = useSearchParams();
  const { push } = useToast();
  const [status, setStatus] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/calendar/status").then((res) => setStatus(res.data));
    if (params.get("calendar") === "connected") push("Google Calendar connected!", "success");
  }, [params, push]);

  async function connect() {
    setBusy(true);
    try {
      const { data } = await api.get("/calendar/connect");
      window.location.href = data.url;
    } catch (err) {
      push(extractErrorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">Preferences</span>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Settings</h1>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Google Calendar</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Connect your calendar so confirmed appointments automatically appear, update on reschedule, and disappear on cancellation.
        </p>

        {status && !status.configured && (
          <p className="mt-4 rounded-lg bg-gold-200 p-3 text-sm text-terracotta-800">
            This server hasn't configured Google Calendar credentials yet. Ask your admin to add them — see the README.
          </p>
        )}
        {status?.configured && (
          <div className="mt-4">
            {status.connected ? (
              <p className="font-mono text-sm text-pine-700">✓ Connected</p>
            ) : (
              <Button onClick={connect} loading={busy}>Connect Google Calendar</Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
