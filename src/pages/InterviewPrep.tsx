import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, Copy, Eye, EyeOff } from "lucide-react";
import { AudioButton } from "../components/Audio";
import { Ko, PageTitle, Tr } from "../components/ui";
import { apiJson } from "../lib/api";
import { useSettings } from "../store";

interface ExaminerCommand {
  id: string;
  ko: string;
  roman: string;
  pronunciation_km: string;
  km: string;
  en: string;
  audio_file?: string | null;
}

interface InterviewQA {
  id: string;
  question_ko: string;
  question_km: string;
  question_en: string;
  answer_ko: string;
  answer_km: string;
  answer_en: string;
  question_audio_file?: string | null;
  answer_audio_file?: string | null;
}

interface InterviewPayload {
  version?: number;
  commands: ExaminerCommand[];
  qas: InterviewQA[];
}

const INDUSTRIES = [
  { id: "manufacturing", ko: "제조업", km: "វិស័យផលិតកម្ម (រោងចក្រ)", en: "manufacturing" },
  { id: "construction", ko: "건설업", km: "វិស័យសំណង់", en: "construction" },
  { id: "agriculture", ko: "농축산업", km: "វិស័យកសិកម្ម និងចិញ្ចឹមសត្វ", en: "agriculture and livestock" },
  { id: "fishery", ko: "어업", km: "វិស័យនេសាទ", en: "fishery" },
] as const;

const DEFAULT_INTERVIEW: InterviewPayload = {
  commands: [
    { id: "CMD-01", ko: "차렷!", roman: "cha-ryeot!", pronunciation_km: "ឆា-រយ៉ត", km: "ប្រុង! (ឈរត្រង់ខ្លួន)", en: "Attention! (Stand straight)" },
    { id: "CMD-02", ko: "경례!", roman: "gyeong-nye!", pronunciation_km: "ខ្យង់-រយេ", km: "គោរព! (ឱនគោរព ហើយនិយាយថា អាន់ញ៉ង់ហាសេយ៉ូ)", en: "Bow / Salute! (Bow and say Annyeonghaseyo)" },
    { id: "CMD-03", ko: "바로!", roman: "ba-ro!", pronunciation_km: "ផា-រ៉ូ", km: "ងើបឈរត្រង់វិញ!", en: "Stand straight again! (Recover)" },
    { id: "CMD-04", ko: "열중쉬어!", roman: "yeol-jung-swi-eo!", pronunciation_km: "យ៉ល់-ជុង-ស្វី-អ", km: "សម្រាក! (ឈរកន្ធែកជើងដាក់ដៃក្រោយខ្នង)", en: "At ease! (Hands behind your back)" },
    { id: "CMD-05", ko: "뒤로 돌아!", roman: "dwi-ro do-ra!", pronunciation_km: "ទ្វី-រ៉ូ តូ-រ៉ា", km: "បែរក្រោយ!", en: "Turn around! (About face)" },
    { id: "CMD-06", ko: "오른쪽으로 돌아!", roman: "o-reun-jjo-geu-ro do-ra!", pronunciation_km: "អូ-រឹន-ចុក-គឺ-រ៉ូ តូ-រ៉ា", km: "បែរស្តាំ!", en: "Turn right!" },
    { id: "CMD-07", ko: "왼쪽으로 돌아!", roman: "oen-jjo-geu-ro do-ra!", pronunciation_km: "វ៉េន-ចុក-គឺ-រ៉ូ តូ-រ៉ា", km: "បែរឆ្វេង!", en: "Turn left!" },
    { id: "CMD-08", ko: "앞으로 가세요!", roman: "a-peu-ro ga-se-yo!", pronunciation_km: "អាប់-ភឺ-រ៉ូ ខា-សេ-យ៉ូ", km: "សូមដើរទៅមុខ!", en: "Please walk forward!" },
    { id: "CMD-09", ko: "의자에 앉으세요.", roman: "ui-ja-e an-jeu-se-yo.", pronunciation_km: "អ៊ឺយ-ចា-អេ អាន់-ជឺ-សេ-យ៉ូ", km: "សូមអង្គុយលើកៅអី។", en: "Please sit on the chair." },
    { id: "CMD-10", ko: "양손을 앞으로 뻗으세요.", roman: "yang-so-neul a-peu-ro ppeo-deu-se-yo.", pronunciation_km: "យ៉ាង-សូន-អ៊ឹល អាប់-ភឺ-រ៉ូ ប៉-ទឺ-សេ-យ៉ូ", km: "សូមលាតដៃទាំងពីរទៅមុខ។", en: "Please stretch both hands forward." },
  ],
  qas: [
    {
      id: "QA-01",
      question_ko: "왜 한국에 가고 싶습니까?",
      question_km: "ហេតុអ្វីបានជាអ្នកចង់ទៅប្រទេសកូរ៉េ?",
      question_en: "Why do you want to go to Korea?",
      answer_ko: "가족을 돕고 돈을 벌어서 기술을 배우고 싶습니다.",
      answer_km: "ខ្ញុំចង់ជួយគ្រួសារ រកប្រាក់ និងរៀនជំនាញបច្ចេកទេស។",
      answer_en: "I want to help my family, earn money, and learn technical skills.",
    },
    {
      id: "QA-02",
      question_ko: "야근이나 주말 근무를 할 수 있습니까?",
      question_km: "តើអ្នកអាចធ្វើការថែមម៉ោងពេលយប់ ឬថ្ងៃចុងសប្តាហ៍បានទេ?",
      question_en: "Can you work overtime at night or on weekends?",
      answer_ko: "네, 회사가 바쁘면 언제든지 열심히 일하겠습니다.",
      answer_km: "បាទ/ចាស ប្រសិនបើក្រុមហ៊ុនរវល់ ខ្ញុំនឹងខិតខំធ្វើការគ្រប់ពេល។",
      answer_en: "Yes, whenever the company is busy, I will work hard.",
    },
    {
      id: "QA-03",
      question_ko: "직장에서 상사가 화를 내면 어떻게 하겠습니까?",
      question_km: "ប្រសិនបើប្រធានខឹងនៅកន្លែងធ្វើការ តើអ្នកនឹងធ្វើដូចម្តេច?",
      question_en: "What will you do if your supervisor gets angry at work?",
      answer_ko: "먼저 죄송하다고 말하고 실수를 바로 고치겠습니다.",
      answer_km: "ខ្ញុំនឹងនិយាយសុំទោសជាមុនសិន ហើយកែកំហុសភ្លាមៗ។",
      answer_en: "I will apologize first and fix the mistake right away.",
    },
    {
      id: "QA-04",
      question_ko: "건강 상태는 어떻습니까?",
      question_km: "តើស្ថានភាពសុខភាពរបស់អ្នកយ៉ាងម៉េចដែរ?",
      question_en: "How is your health condition?",
      answer_ko: "아주 건강합니다. 힘든 일도 잘할 수 있습니다.",
      answer_km: "ខ្ញុំមានសុខភាពល្អណាស់។ ការងារធ្ងន់ក៏ខ្ញុំអាចធ្វើបានល្អដែរ។",
      answer_en: "I am very healthy. I can do heavy work well too.",
    },
  ],
};

const INTRO_STORAGE_KEY = "eps-interview-intro";

export default function InterviewPrep() {
  const { t, lang } = useSettings();
  const isKm = lang === "km";
  const [tab, setTab] = useState<"commands" | "intro" | "qa">("commands");
  const [data, setData] = useState<InterviewPayload>(() => {
    try {
      const cached = localStorage.getItem("eps-interview-content");
      if (cached) {
        const parsed = JSON.parse(cached) as InterviewPayload;
        if (Array.isArray(parsed.commands) && Array.isArray(parsed.qas)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_INTERVIEW;
  });

  const [intro, setIntro] = useState(() => {
    try {
      const raw = localStorage.getItem(INTRO_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{ name: string; age: string; family: string; industry: string }>;
        return {
          name: p.name || "소카 (Sokha)",
          age: p.age || "25",
          family: p.family || "5",
          industry: INDUSTRIES.some((i) => i.id === p.industry) ? p.industry! : INDUSTRIES[0].id,
        };
      }
    } catch {
      // ignore
    }
    return { name: "소카 (Sokha)", age: "25", family: "5", industry: INDUSTRIES[0].id };
  });

  const [copied, setCopied] = useState(false);
  const [selfTest, setSelfTest] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    apiJson<InterviewPayload>("/api/interview", 15000)
      .then((res) => {
        if (!active || !Array.isArray(res?.commands) || !Array.isArray(res?.qas)) return;
        setData(res);
        try {
          localStorage.setItem("eps-interview-content", JSON.stringify(res));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // offline or unavailable: keep cached/default data
      });
    return () => {
      active = false;
    };
  }, []);

  const updateIntro = (patch: Partial<typeof intro>) => {
    const next = { ...intro, ...patch };
    setIntro(next);
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const ind = INDUSTRIES.find((i) => i.id === intro.industry) ?? INDUSTRIES[0];
  const scriptKo = [
    "안녕하십니까? 만나서 반갑습니다.",
    `제 이름은 ${intro.name.trim() || "___"}입니다.`,
    "캄보디아에서 왔습니다.",
    `나이는 ${intro.age.trim() || "__"}살이고, 가족은 모두 ${intro.family.trim() || "_"}명입니다.`,
    `한국의 ${ind.ko} 분야에서 성실하고 열심히 일하겠습니다.`,
    "감사합니다!",
  ].join("\n");

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptKo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/lessons" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("lessons.title")}
      </Link>
      <PageTitle>{t("interview.title")}</PageTitle>

      <div role="tablist" className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-200 bg-zinc-100 p-1">
        {(
          [
            ["commands", t("interview.commandsTab")],
            ["intro", t("interview.introTab")],
            ["qa", t("interview.qaTab")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-10 cursor-pointer rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${
              tab === id ? "bg-white text-blue-700 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "commands" && (
        <div className="space-y-3">
          <div className="card border-blue-200 bg-blue-50 text-sm font-medium text-blue-900">
            {t("interview.commandsDesc")}
          </div>
          <ul className="space-y-3">
            {data.commands.map((cmd) => (
              <li key={cmd.id} className="card space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-extrabold text-zinc-900">
                      <Ko>{cmd.ko}</Ko>
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-blue-700">
                      {isKm ? `អានថា៖ ${cmd.pronunciation_km}` : `[${cmd.roman}]`}
                    </p>
                  </div>
                  {cmd.audio_file && <AudioButton file={cmd.audio_file} slow />}
                </div>
                <p className="text-base text-zinc-700">
                  <Tr lang={lang}>{isKm ? cmd.km : cmd.en}</Tr>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "intro" && (
        <div className="space-y-4">
          <section className="card space-y-4">
            <h2 className="text-base font-bold text-zinc-900">{t("interview.introBuilderTitle")}</h2>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                {t("interview.nameLabel")}
              </label>
              <input
                type="text"
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-base"
                value={intro.name}
                onChange={(e) => updateIntro({ name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("interview.ageLabel")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-base"
                  value={intro.age}
                  onChange={(e) => updateIntro({ age: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {t("interview.familyLabel")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-base"
                  value={intro.family}
                  onChange={(e) => updateIntro({ family: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                {t("interview.industryLabel")}
              </label>
              <select
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-base"
                value={intro.industry}
                onChange={(e) => updateIntro({ industry: e.target.value })}
              >
                {INDUSTRIES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ko} · {isKm ? o.km : o.en}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="card space-y-3 border-blue-500 bg-blue-50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                {t("interview.introTab")}
              </span>
              <button type="button" className="btn btn-secondary min-h-9 px-3 py-1.5 text-xs" onClick={copyScript}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? t("interview.copied") : t("interview.copyScript")}</span>
              </button>
            </div>
            <p className="whitespace-pre-line text-lg font-semibold leading-relaxed text-zinc-900">
              <Ko>{scriptKo}</Ko>
            </p>
          </section>
        </div>
      )}

      {tab === "qa" && (
        <div className="space-y-3">
          <label className="card flex min-h-12 cursor-pointer items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              {selfTest ? <EyeOff className="h-4 w-4 text-blue-600" /> : <Eye className="h-4 w-4 text-zinc-500" />}
              <span>{t("interview.selfTestMode")}</span>
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer accent-blue-600"
              checked={selfTest}
              onChange={(e) => {
                setSelfTest(e.target.checked);
                setRevealed({});
              }}
            />
          </label>

          <ul className="space-y-3">
            {data.qas.map((qa, i) => {
              const showAns = !selfTest || revealed[qa.id];
              return (
                <li key={qa.id} className="card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-zinc-900">
                        Q{i + 1}. <Ko>{qa.question_ko}</Ko>
                      </p>
                      <p className="muted mt-1 text-sm">
                        <Tr lang={lang}>{isKm ? qa.question_km : qa.question_en}</Tr>
                      </p>
                    </div>
                    {qa.question_audio_file && <AudioButton file={qa.question_audio_file} slow />}
                  </div>

                  <div className="border-t border-zinc-200 pt-3">
                    {showAns ? (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-blue-700">
                            A. <Ko>{qa.answer_ko}</Ko>
                          </p>
                          <p className="mt-1 text-sm text-zinc-700">
                            <Tr lang={lang}>{isKm ? qa.answer_km : qa.answer_en}</Tr>
                          </p>
                        </div>
                        {qa.answer_audio_file && <AudioButton file={qa.answer_audio_file} slow />}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setRevealed((r) => ({ ...r, [qa.id]: true }))}
                      >
                        <Eye className="h-4 w-4" />
                        <span>{t("interview.showAnswer")}</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
