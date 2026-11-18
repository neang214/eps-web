import { Link } from "react-router-dom";
import { useSettings } from "../store";
import { PageTitle } from "../components/ui";

export function More() {
  const { t } = useSettings();
  const links = [
    { to: "/mistakes", label: t("nav.mistakes") },
    { to: "/settings", label: t("nav.settings") },
    { to: "/about", label: t("nav.about") },
    { to: "/privacy", label: t("nav.privacy") },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle>{t("nav.main")}</PageTitle>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="card flex min-h-13 items-center justify-between font-semibold text-zinc-900 hover:border-indigo-600"
            >
              <span>{l.label}</span>
              <span aria-hidden="true" className="muted text-lg">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function About() {
  const { t } = useSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle>{t("about.title")}</PageTitle>
      <div className="card space-y-4">
        <p className="text-zinc-700">{t("about.purpose")}</p>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-semibold text-amber-800">
          {t("about.disclaimer")}
        </p>
      </div>

      <section className="card space-y-1">
        <h2 className="text-base font-bold text-zinc-900">{t("about.support")}</h2>
        <a className="link-target" href={`mailto:${t("about.supportEmail")}`}>
          {t("about.supportEmail")}
        </a>
      </section>

      <section className="card space-y-2">
        <h2 className="text-base font-bold text-zinc-900">{t("about.privacyTitle")}</h2>
        <p className="muted text-sm">{t("about.privacySummary")}</p>
        <Link to="/privacy" className="link-target text-sm">
          {t("about.privacyLink")} →
        </Link>
      </section>

      <p className="muted text-center text-xs" data-testid="app-version">
        {t("about.version", { v: __APP_VERSION__ })}
      </p>
    </div>
  );
}

export function Privacy() {
  const { t } = useSettings();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle>{t("privacy.title")}</PageTitle>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-semibold text-amber-800">
        {t("privacy.placeholder")}
      </p>
      <div className="card space-y-3 text-zinc-700">
        <p>{t("privacy.p1")}</p>
        <p>{t("privacy.p2")}</p>
        <p>{t("privacy.p3")}</p>
        <p>{t("privacy.p4")}</p>
      </div>
    </div>
  );
}