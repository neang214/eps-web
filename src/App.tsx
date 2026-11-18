import { useEffect, useState } from "react";
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes, Link, useLocation, useParams } from "react-router-dom";
import {
  Home as HomeIcon,
  BookOpen,
  PenTool,
  Timer,
  BookX,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { flushAnalyticsQueue } from "./lib/analytics";
import { loadRules } from "./lib/rules";
import { Logo } from "./components/Logo";
import { useSettings } from "./store";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import { LessonsHub, SituationsList, UnitPage } from "./pages/Lessons";
import { VocabPage, VocabReview, WordsByIndustry } from "./pages/Vocab";
import GrammarPage from "./pages/Grammar";
import GrammarQuizPage from "./pages/GrammarQuiz";
import HangulPage from "./pages/Hangul";
import NumbersPage from "./pages/Numbers";
import { PracticeRun, PracticeSet, PracticeSetup } from "./pages/Practice";
import ExamGuide from "./pages/ExamGuide";
import ExamRun from "./pages/ExamRun";
import Results from "./pages/Results";
import { History, MistakesPage, MistakesRetry } from "./pages/Notebook";
import SettingsPage from "./pages/Settings";
import { About, More, Privacy } from "./pages/Info";
import InterviewPrep from "./pages/InterviewPrep";

function OldUnitRedirect() {
  const { unitId } = useParams();
  return <Navigate to={`/lessons/situations/${unitId}`} replace />;
}

function Shell() {
  const { t, settings, update } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const mainNav = [
    { to: "/", label: t("nav.home"), icon: HomeIcon, end: true },
    { to: "/lessons", label: t("nav.lessons"), icon: BookOpen },
    { to: "/practice", label: t("nav.practice"), icon: PenTool },
    { to: "/exam", label: t("nav.exam"), icon: Timer },
  ];
  const secondaryNav = [
    { to: "/mistakes", label: t("nav.mistakes"), icon: BookX },
    { to: "/settings", label: t("nav.settings"), icon: SettingsIcon },
    { to: "/about", label: t("nav.about"), icon: InfoIcon },
  ];

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2.5 focus:font-semibold focus:text-white focus:shadow-lg"
      >
        {t("a11y.skip")}
      </a>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:border-r md:border-zinc-200 md:bg-white">
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-6">
          <Link to="/" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-zinc-900">
            <Logo className="h-9 w-9 rounded-[10px] shadow-sm" />
            <span>{t("app.name")}</span>
          </Link>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            onClick={() => update({ dark: !settings.dark })}
            aria-label={t("settings.dark")}
          >
            {settings.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <nav aria-label={t("a11y.navLabel")} className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
          <div className="space-y-1">
            {mainNav.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-800"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{n.label}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-1 border-t border-zinc-200 pt-4">
            {secondaryNav.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-100 font-semibold text-zinc-900"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{n.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Mobile Sticky Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
          <Link to="/" className="link-target text-base font-bold tracking-tight text-zinc-900 no-underline hover:no-underline">
            <Logo className="mr-2 inline-block h-8 w-8 rounded-[9px] align-middle shadow-sm" />
            <span>{t("app.name")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              onClick={() => update({ dark: !settings.dark })}
              aria-label={t("settings.dark")}
            >
              {settings.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="btn btn-secondary min-h-9 min-w-9 px-2.5 py-1.5"
              onClick={() => setDrawerOpen((prev) => !prev)}
              aria-label={t("nav.more")}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 right-0 flex w-72 max-w-full flex-col border-l border-zinc-200 bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <span className="font-bold text-zinc-900">{t("nav.main")}</span>
                <button
                  type="button"
                  className="btn btn-secondary min-h-8 min-w-8 p-1 text-zinc-500"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("common.close")}
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto py-4">
                <div className="space-y-1">
                  {mainNav.map((n) => {
                    const Icon = n.icon;
                    return (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.end}
                        className={({ isActive }) =>
                          `flex min-h-11 items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                            isActive ? "bg-indigo-50 text-indigo-800" : "text-zinc-700 hover:bg-zinc-100"
                          }`
                        }
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{n.label}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-40" />
                      </NavLink>
                    );
                  })}
                </div>

                <div className="my-3 border-t border-zinc-100 pt-3">
                  {secondaryNav.map((n) => {
                    const Icon = n.icon;
                    return (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        className={({ isActive }) =>
                          `flex min-h-11 items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                            isActive ? "bg-zinc-100 font-semibold text-zinc-900" : "text-zinc-600 hover:bg-zinc-100"
                          }`
                        }
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{n.label}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-40" />
                      </NavLink>
                    );
                  })}
                  <NavLink
                    to="/privacy"
                    className="flex min-h-11 items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <span>{t("nav.privacy")}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instant Page Outlet without redundant global spinner */}
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-24 sm:px-6 md:px-10 md:py-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          aria-label={t("a11y.navLabel")}
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white/95 px-1 py-1 backdrop-blur-md md:hidden"
        >
          {mainNav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-13 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[11px] font-semibold leading-tight transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{n.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  const { ready, settings } = useSettings();

  useEffect(() => {
    if (!ready) return;
    void loadRules();
    if (settings.analyticsOptIn) void flushAnalyticsQueue();
  }, [ready, settings.analyticsOptIn]);

  // The loading splash lives in index.html so it shows before any script runs. Fade it out once ready.
  useEffect(() => {
    if (!ready) return;
    const el = document.getElementById("splash");
    if (!el) return;
    el.classList.add("hide");
    const id = window.setTimeout(() => el.remove(), 300);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (!ready) return null;
  if (!settings.language) return <Onboarding />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/exam/run" element={<ExamRun />} />
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="lessons" element={<LessonsHub />} />
          <Route path="lessons/words" element={<VocabPage />} />
          <Route path="lessons/words/review" element={<VocabReview />} />
          <Route path="lessons/words/:tag" element={<WordsByIndustry />} />
          <Route path="lessons/hangul" element={<HangulPage />} />
          <Route path="lessons/numbers" element={<NumbersPage />} />
          <Route path="lessons/grammar" element={<GrammarPage />} />
          <Route path="lessons/grammar/quiz" element={<GrammarQuizPage />} />
          <Route path="lessons/situations" element={<SituationsList />} />
          <Route path="lessons/situations/:unitId" element={<UnitPage />} />
          <Route path="lessons/interview" element={<InterviewPrep />} />
          {/* Old addresses keep working. */}
          <Route path="vocab" element={<Navigate to="/lessons/words" replace />} />
          <Route path="vocab/review" element={<Navigate to="/lessons/words/review" replace />} />
          <Route path="grammar" element={<Navigate to="/lessons/grammar" replace />} />
          <Route path="lessons/:unitId" element={<OldUnitRedirect />} />
          <Route path="practice" element={<PracticeSetup />} />
          <Route path="practice/run" element={<PracticeRun />} />
          <Route path="practice/set/:section/:n" element={<PracticeSet />} />
          <Route path="exam" element={<ExamGuide />} />
          <Route path="exam/results/:attemptId" element={<Results />} />
          <Route path="history" element={<History />} />
          <Route path="mistakes" element={<MistakesPage />} />
          <Route path="mistakes/retry" element={<MistakesRetry />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="more" element={<More />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}