import { useState } from "react";
import { Flag, CheckCircle2, AlertCircle } from "lucide-react";
import { apiPost } from "../lib/api";
import { useSettings } from "../store";
import { Modal } from "./ui";

const TYPES = ["WRONG_ANSWER", "TRANSLATION_PROBLEM", "AUDIO_PROBLEM", "OTHER"] as const;

export function ReportButton({ questionId }: { questionId: string }) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("WRONG_ANSWER");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const close = () => {
    setOpen(false);
    setState("idle");
    setMessage("");
  };

  const send = async () => {
    setState("sending");
    try {
      const res = await apiPost("/api/reports", { question_id: questionId, type, message: message.trim() || undefined });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        <span>{t("report.button")}</span>
      </button>
      {open && (
        <Modal title={t("report.title")} onClose={close}>
          {state === "sent" ? (
            <div className="space-y-4">
              <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 font-medium text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{t("report.thanks")}</span>
              </p>
              <button type="button" className="btn btn-primary w-full" onClick={close}>
                {t("common.close")}
              </button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <fieldset className="space-y-1.5">
                <legend className="mb-2 text-sm font-semibold text-zinc-900">{t("report.type")}</legend>
                {TYPES.map((ty) => (
                  <label
                    key={ty}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                      type === ty ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-type"
                      className="h-4 w-4 accent-indigo-600"
                      checked={type === ty}
                      onChange={() => setType(ty)}
                    />
                    <span>{t(`report.type_${ty}`)}</span>
                  </label>
                ))}
              </fieldset>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-900">{t("report.message")}</span>
                <textarea
                  className="field"
                  rows={3}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              {state === "failed" && (
                <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{t("report.failed")}</span>
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={state === "sending"}>
                {t("report.send")}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}