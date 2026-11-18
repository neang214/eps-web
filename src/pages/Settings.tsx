import { useState } from "react";
import {
  Languages,
  Type,
  Moon,
  Wifi,
  BarChart3,
  Database,
  Download,
  Upload,
  HardDrive,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { downloadPack, DownloadError, removePack, wifiBlocked } from "../lib/packs";
import { importProgress, parseProgress } from "../lib/progress";
import { saveBackup } from "../lib/backup";
import { useContent, useSettings } from "../store";
import { LoadingBlock, PageTitle, Switch } from "../components/ui";
import type { Lang } from "../types";

function PackRow({ id }: { id: string }) {
  const { t, settings } = useSettings();
  const content = useContent();
  const pack = content.packs.find((p) => p.id === id)!;
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const blocked = wifiBlocked(settings.wifiOnly);

  const download = async () => {
    setMessage(null);
    setProgress(0);
    try {
      await downloadPack(pack.info, setProgress);
      setMessage({ kind: "ok", text: t("settings.downloadDone") });
      content.reload();
    } catch (e) {
      setMessage({
        kind: "error",
        text:
          e instanceof DownloadError && e.kind === "checksum"
            ? t("settings.checksumFailed")
            : t("settings.downloadFailed"),
      });
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    await removePack(id);
    setMessage(null);
    content.reload();
  };

  return (
    <li className="card space-y-3.5" data-testid={`pack-${id}`}>
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
          <p className="font-bold text-zinc-900">{pack.info.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
          <span>
            {pack.downloadedVersion != null
              ? t("settings.downloaded", { v: pack.downloadedVersion })
              : t("settings.notDownloaded")}
          </span>
          {pack.updateAvailable && (
            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-bold text-indigo-800">
              {t("settings.updateAvailable")}
            </span>
          )}
        </div>
      </div>

      {blocked && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("settings.wifiBlocked")}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {(pack.downloadedVersion == null || pack.updateAvailable) && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={blocked || progress !== null || !content.online}
            onClick={() => void download()}
          >
            {progress !== null ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t("settings.downloading", { p: progress })}</span>
              </>
            ) : pack.updateAvailable ? (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>{t("settings.update")}</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>{t("settings.download")}</span>
              </>
            )}
          </button>
        )}
        {pack.downloadedVersion != null && (
          <button type="button" className="btn btn-secondary text-red-600 hover:border-red-200 hover:bg-red-50" onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>{t("settings.remove")}</span>
          </button>
        )}
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 text-sm font-medium ${
            message.kind === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {message.kind === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </p>
      )}
    </li>
  );
}

export default function SettingsPage() {
  const { t, settings, update, lang } = useSettings();
  const content = useContent();
  const [dataMsg, setDataMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const doExport = async () => {
    await saveBackup();
  };

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    const parsed = parseProgress(await f.text());
    if (!parsed) return setDataMsg({ kind: "error", text: t("settings.importBad") });
    if (!window.confirm(t("settings.importConfirm"))) return;
    await importProgress(parsed);
    setDataMsg({ kind: "ok", text: t("settings.importOk") });
  };

  return (
    <div className="space-y-6">
      <PageTitle>{t("settings.title")}</PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="card space-y-3.5" aria-labelledby="s-lang">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
            <Languages className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            <h2 id="s-lang" className="font-bold text-zinc-900">
              {t("settings.language")}
            </h2>
          </div>
          <div role="radiogroup" aria-labelledby="s-lang" className="flex flex-wrap gap-2.5">
            {(["km", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                lang={l}
                data-testid={`set-lang-${l}`}
                className={`btn flex-1 ${lang === l ? "btn-primary" : "btn-secondary"}`}
                onClick={() => update({ language: l })}
              >
                {t("languages." + l)}
              </button>
            ))}
          </div>
        </section>

        <section className="card space-y-3.5" aria-labelledby="s-font">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
            <Type className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            <h2 id="s-font" className="font-bold text-zinc-900">
              {t("settings.fontSize")}
            </h2>
          </div>
          <div role="group" aria-labelledby="s-font" className="flex flex-wrap gap-2.5">
            {([0, 1, 2] as const).map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={settings.fontStep === step}
                className={`btn flex-1 ${settings.fontStep === step ? "btn-primary" : "btn-secondary"}`}
                onClick={() => update({ fontStep: step })}
              >
                {t(`settings.font${step}`)}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="card divide-y divide-zinc-100 p-0 sm:p-0">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Moon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <span className="font-medium text-zinc-900">{t("settings.dark")}</span>
          </div>
          <Switch
            id="s-dark"
            checked={settings.dark}
            onChange={(v) => update({ dark: v })}
            label=""
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Wifi className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <span className="font-medium text-zinc-900">{t("settings.wifi")}</span>
          </div>
          <Switch
            id="s-wifi"
            checked={settings.wifiOnly}
            onChange={(v) => update({ wifiOnly: v })}
            label=""
          />
        </div>
      </section>

      <section className="card space-y-3" aria-labelledby="s-analytics">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <h2 id="s-analytics" className="font-medium text-zinc-900">
              {t("settings.analytics")}
            </h2>
          </div>
          <Switch
            id="s-an"
            checked={settings.analyticsOptIn}
            onChange={(v) => update({ analyticsOptIn: v })}
            label=""
          />
        </div>
        <p className="muted text-xs leading-relaxed">{t("settings.analyticsNotice")}</p>
      </section>

      <section className="card space-y-4" aria-labelledby="s-data">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
          <Database className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          <h2 id="s-data" className="font-bold text-zinc-900">
            {t("settings.data")}
          </h2>
        </div>
        <p className="muted text-sm leading-relaxed">{t("settings.dataNotice")}</p>
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button type="button" className="btn btn-secondary" onClick={() => void doExport()} data-testid="export">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>{t("settings.export")}</span>
          </button>
          <label className="btn btn-secondary cursor-pointer focus-within:ring-2 focus-within:ring-indigo-600">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{t("settings.import")}</span>
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void doImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {dataMsg && (
          <p
            role={dataMsg.kind === "error" ? "alert" : "status"}
            className={`flex items-center gap-2 text-sm font-medium ${
              dataMsg.kind === "error" ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {dataMsg.kind === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{dataMsg.text}</span>
          </p>
        )}
      </section>

      <section aria-labelledby="s-offline" className="space-y-3.5">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          <h2 id="s-offline" className="text-lg font-bold text-zinc-900">
            {t("settings.offline")}
          </h2>
        </div>
        {content.status === "loading" && <LoadingBlock />}
        {content.status !== "loading" && (
          <ul className="space-y-3">
            {content.packs.map((p) => (
              <PackRow key={p.id} id={p.id} />
            ))}
          </ul>
        )}
        {content.status === "ready" && content.packs.length === 0 && (
          <p className="card muted">{t("common.contentError")}</p>
        )}
      </section>
    </div>
  );
}