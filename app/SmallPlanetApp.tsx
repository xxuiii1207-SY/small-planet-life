"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Flame,
  GripVertical,
  Heart,
  Home,
  Leaf,
  List,
  LockKeyhole,
  Monitor,
  Moon,
  MoreHorizontal,
  Palette,
  PenLine,
  PiggyBank,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Unlock,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import {
  type AppData,
  type AppPreferences,
  type Artist,
  type BaseRecord,
  type Book,
  type CountdownEvent,
  type Currency,
  type DiaryEntry,
  type DiarySecurity,
  type FandomEvent,
  type Habit,
  type ImageAsset,
  type MonthlyGoal,
  type SavingsTarget,
  type Wish,
  active,
  amountForTarget,
  baseRecord,
  currencySymbols,
  daysUntil,
  defaultPreferences,
  effectiveCountdownDate,
  formatMoney,
  monthlyGoalPercent,
  moodLabels,
  weatherLabels,
} from "./model";
import {
  assetObjectUrl,
  compressImage,
  createDiarySecurity,
  deleteAsset,
  downloadBlob,
  exportEncryptedBackup,
  getAllAssets,
  loadAppData,
  loadDiarySecurity,
  loadPreferences,
  readEncryptedBackup,
  replaceDatabase,
  saveAppData,
  saveAsset,
  saveDataAndAssets,
  saveDiarySecurity,
  savePreferences,
  verifyPin,
  verifyRecoveryCode,
} from "./storage";

type View =
  | "home"
  | "savings"
  | "countdown"
  | "monthly"
  | "fandom"
  | "life"
  | "extension"
  | "wish"
  | "more"
  | "trash"
  | "settings";

type ModalKind =
  | "quick"
  | "savingTarget"
  | "transaction"
  | "countdown"
  | "monthlyGoal"
  | "monthlyReview"
  | "fandomEvent"
  | "fandomExpense"
  | "diary"
  | "book"
  | "habit"
  | "wish"
  | "artist"
  | "layout"
  | "backup"
  | "import";

interface ModalState {
  kind: ModalKind;
  id?: string;
}

type RecordCollection = Exclude<keyof AppData, "schemaVersion">;
type TrashRow = { collection: RecordCollection; record: BaseRecord; label: string };

const publicAsset = (path: string) => `${import.meta.env.BASE_URL ?? "/"}${path.replace(/^\//, "")}`;

const navItems: Array<{
  id: View;
  label: string;
  icon: typeof Home;
  mobile: boolean;
}> = [
  { id: "home", label: "首页", icon: Home, mobile: true },
  { id: "savings", label: "存钱", icon: PiggyBank, mobile: true },
  { id: "countdown", label: "倒计时", icon: Clock3, mobile: false },
  { id: "monthly", label: "月度", icon: Target, mobile: false },
  { id: "fandom", label: "追星", icon: Star, mobile: true },
  { id: "life", label: "生活", icon: Leaf, mobile: true },
  { id: "extension", label: "扩展", icon: Sparkles, mobile: false },
  { id: "wish", label: "心愿", icon: Heart, mobile: false },
  { id: "more", label: "更多", icon: MoreHorizontal, mobile: true },
];

const homeCardLabels: Record<string, string> = {
  savings: "存钱",
  countdown: "倒计时",
  monthly: "月度",
  fandom: "追星",
  life: "生活",
  wish: "心愿",
};

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function numberField(form: FormData, name: string): number {
  const value = Number(field(form, name));
  return Number.isFinite(value) ? value : 0;
}

function isoNow(): string {
  return new Date().toISOString();
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthNow(): string {
  return today().slice(0, 7);
}

function trashKey(collection: RecordCollection, id: string): string {
  return `${collection}:${id}`;
}

function formatDate(date: string | null): string {
  if (!date) return "未设置";
  const value = new Date(`${date.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(value);
}

function daysInTrash(record: BaseRecord): number {
  if (!record.deletedAt) return 0;
  return Math.max(
    0,
    30 - Math.floor((Date.now() - new Date(record.deletedAt).getTime()) / 86400000),
  );
}

function mergeArrays<T extends BaseRecord>(current: T[], incoming: T[]): T[] {
  const ids = new Set(current.map((record) => record.id));
  return [...current, ...incoming.filter((record) => !ids.has(record.id))];
}

function mergeData(current: AppData, incoming: AppData): AppData {
  return {
    schemaVersion: Math.max(current.schemaVersion, incoming.schemaVersion),
    savingsTargets: mergeArrays(current.savingsTargets, incoming.savingsTargets),
    savingsTransactions: mergeArrays(current.savingsTransactions, incoming.savingsTransactions),
    countdowns: mergeArrays(current.countdowns, incoming.countdowns),
    monthlyGoals: mergeArrays(current.monthlyGoals, incoming.monthlyGoals),
    monthlyReviews: mergeArrays(current.monthlyReviews, incoming.monthlyReviews),
    artists: mergeArrays(current.artists, incoming.artists),
    fandomEvents: mergeArrays(current.fandomEvents, incoming.fandomEvents),
    fandomExpenses: mergeArrays(current.fandomExpenses, incoming.fandomExpenses),
    diaryEntries: mergeArrays(current.diaryEntries, incoming.diaryEntries),
    books: mergeArrays(current.books, incoming.books),
    habits: mergeArrays(current.habits, incoming.habits),
    habitCheckins: mergeArrays(current.habitCheckins, incoming.habitCheckins),
    wishes: mergeArrays(current.wishes, incoming.wishes),
  };
}

function PolkaPlanet({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "planet-logo planet-logo--small" : "planet-logo"} aria-hidden="true">
      <span className="planet-logo__sphere" />
      <span className="planet-logo__orbit" />
    </span>
  );
}

function Progress({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <span className="progress" aria-label={`完成 ${Math.round(bounded)}%`}>
      <span style={{ width: `${bounded}%` }} />
    </span>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state polka-corner">
      <Sparkles size={22} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function AssetImage({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let activeRequest = true;
    let objectUrl: string | null = null;
    void assetObjectUrl(id).then((result) => {
      if (activeRequest) {
        objectUrl = result;
        setUrl(result);
      } else if (result) URL.revokeObjectURL(result);
    });
    return () => {
      activeRequest = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  // Blob URLs come from IndexedDB and cannot be handled by the framework image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} className={className} /> : <span className="image-placeholder" />;
}

export default function SmallPlanetApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [security, setSecurity] = useState<DiarySecurity | null>(null);
  const [diaryUnlocked, setDiaryUnlocked] = useState(false);
  const [view, setView] = useState<View>("home");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fandomMode, setFandomMode] = useState<"timeline" | "calendar">("timeline");
  const [lifeMode, setLifeMode] = useState<"timeline" | "grid">("timeline");
  const [selectedTrash, setSelectedTrash] = useState<string[]>([]);
  const activityRef = useRef(0);
  const preferencesRef = useRef<AppPreferences>(defaultPreferences);

  useEffect(() => {
    let mounted = true;
    void loadAppData()
      .then((loaded) => {
        if (!mounted) return;
        const loadedPreferences = loadPreferences();
        setData(loaded);
        preferencesRef.current = loadedPreferences;
        setPreferences(loadedPreferences);
        setSecurity(loadDiarySecurity());
      })
      .catch((reason: unknown) => {
        if (mounted) setError(reason instanceof Error ? reason.message : "无法读取本地数据");
      });
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(publicAsset("sw.js")).catch(() => undefined);
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.themeMode;
    root.dataset.accent = preferences.accentTheme;
  }, [preferences]);

  useEffect(() => {
    if (!diaryUnlocked) return;
    const updateActivity = () => {
      activityRef.current = Date.now();
    };
    const interval = window.setInterval(() => {
      if (Date.now() - activityRef.current >= 5 * 60 * 1000) {
        setDiaryUnlocked(false);
        setToast("生活日记已自动锁定");
      }
    }, 10000);
    window.addEventListener("pointerdown", updateActivity);
    window.addEventListener("keydown", updateActivity);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [diaryUnlocked]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!data) return;
    const expired = Object.entries(data).some(([key, value]) =>
      key !== "schemaVersion" && Array.isArray(value)
        ? (value as BaseRecord[]).some(
            (record) =>
              record.deletedAt && Date.now() - new Date(record.deletedAt).getTime() >= 30 * 86400000,
          )
        : false,
    );
    if (!expired) return;
    const next = purgeExpiredRecords(data);
    void saveAppData(next).then(() => setData(next));
  }, [data]);

  const commit = async (next: AppData, message = "已保存"): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await saveAppData(next);
      setData(next);
      setToast(message);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请重试");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updatePreferences = (patch: Partial<AppPreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    savePreferences(next);
    setPreferences(next);
  };

  const softDelete = async (collection: RecordCollection, id: string) => {
    if (!data) return;
    const now = isoNow();
    const records = data[collection] as unknown as BaseRecord[];
    const next = {
      ...data,
      [collection]: records.map((record) =>
        record.id === id ? { ...record, deletedAt: now, updatedAt: now } : record,
      ),
    } as AppData;

    if (collection === "savingsTargets") {
      next.savingsTransactions = next.savingsTransactions.map((transaction) =>
        transaction.targetId === id
          ? { ...transaction, deletedAt: now, updatedAt: now }
          : transaction,
      );
    }

    if (collection === "artists") {
      next.countdowns = next.countdowns.map((countdown) =>
        countdown.sourceId === id && (countdown.sourceType === "artistBirthday" || countdown.sourceType === "artistDebut")
          ? { ...countdown, deletedAt: now, status: "ended", updatedAt: now }
          : countdown,
      );
    }

    if (collection === "fandomExpenses") {
      const expense = data.fandomExpenses.find((item) => item.id === id);
      if (expense?.savingsTransactionId) {
        next.savingsTransactions = next.savingsTransactions.map((transaction) =>
          transaction.id === expense.savingsTransactionId
            ? { ...transaction, deletedAt: now, updatedAt: now }
            : transaction,
        );
      }
    }
    if (collection === "savingsTransactions") {
      const transaction = data.savingsTransactions.find((item) => item.id === id);
      if (transaction?.sourceType === "fandomExpense" && transaction.sourceId) {
        next.fandomExpenses = next.fandomExpenses.map((expense) =>
          expense.id === transaction.sourceId
            ? { ...expense, deletedAt: now, updatedAt: now }
            : expense,
        );
      }
    }
    await commit(next, "已移入回收站");
  };

  const restoreRecord = async (collection: RecordCollection, id: string) => {
    if (!data) return;
    const records = data[collection] as unknown as BaseRecord[];
    const next = {
      ...data,
      [collection]: records.map((record) =>
        record.id === id ? { ...record, deletedAt: null, updatedAt: isoNow() } : record,
      ),
    } as AppData;
    if (collection === "savingsTargets") {
      next.savingsTransactions = next.savingsTransactions.map((transaction) =>
        transaction.targetId === id
          ? { ...transaction, deletedAt: null, updatedAt: isoNow() }
          : transaction,
      );
    }
    if (collection === "artists") {
      next.countdowns = next.countdowns.map((countdown) =>
        countdown.sourceId === id && (countdown.sourceType === "artistBirthday" || countdown.sourceType === "artistDebut")
          ? { ...countdown, deletedAt: null, status: "active", updatedAt: isoNow() }
          : countdown,
      );
    }
    if (collection === "fandomExpenses") {
      const expense = data.fandomExpenses.find((item) => item.id === id);
      if (expense?.savingsTransactionId) {
        next.savingsTransactions = next.savingsTransactions.map((transaction) =>
          transaction.id === expense.savingsTransactionId
            ? { ...transaction, deletedAt: null, updatedAt: isoNow() }
            : transaction,
        );
      }
    }
    if (collection === "savingsTransactions") {
      const transaction = data.savingsTransactions.find((item) => item.id === id);
      if (transaction?.sourceType === "fandomExpense" && transaction.sourceId) {
        next.fandomExpenses = next.fandomExpenses.map((expense) =>
          expense.id === transaction.sourceId
            ? { ...expense, deletedAt: null, updatedAt: isoNow() }
            : expense,
        );
      }
    }
    await commit(next, "已恢复");
  };

  if (error && !data) {
    return (
      <main className="recovery-screen">
        <PolkaPlanet />
        <p className="eyebrow">安全恢复</p>
        <h1>本地数据暂时无法打开</h1>
        <p>{error}</p>
        <button className="button button--primary" onClick={() => window.location.reload()}>
          重新尝试
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen" role="status">
        <PolkaPlanet />
        <h1>小小星球</h1>
        <p>正在整理你的生活轨道…</p>
      </main>
    );
  }

  const allTargets = active(data.savingsTargets);
  const targets = allTargets.filter((target) => target.status !== "archived");
  const transactions = active(data.savingsTransactions);
  const countdowns = active(data.countdowns);
  const goals = active(data.monthlyGoals);
  const artists = active(data.artists);
  const events = active(data.fandomEvents);
  const expenses = active(data.fandomExpenses);
  const diaries = active(data.diaryEntries);
  const books = active(data.books);
  const habits = active(data.habits);
  const wishes = active(data.wishes);
  const currentMonthGoals = goals.filter((goal) => goal.month === monthNow());
  const nextCountdown = [...countdowns]
    .filter((item) => item.status === "active" && daysUntil(effectiveCountdownDate(item.targetDate, item.repeatYearly)) >= 0)
    .sort((left, right) => Number(right.isPinned) - Number(left.isPinned)
      || daysUntil(effectiveCountdownDate(left.targetDate, left.repeatYearly))
        - daysUntil(effectiveCountdownDate(right.targetDate, right.repeatYearly)))[0];
  const nextEvent = [...events]
    .filter((item) => item.status === "upcoming")
    .sort((left, right) => left.startDate.localeCompare(right.startDate))[0];

  const navigate = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderView = () => {
    switch (view) {
      case "home":
        return renderHome();
      case "savings":
        return renderSavings();
      case "countdown":
        return renderCountdown();
      case "monthly":
        return renderMonthly();
      case "fandom":
        return renderFandom();
      case "life":
        return renderLife();
      case "extension":
        return renderExtension();
      case "wish":
        return renderWish();
      case "trash":
        return renderTrash();
      case "settings":
        return renderSettings();
      default:
        return renderMore();
    }
  };

  function renderHome() {
    const visibleCards = preferences.homeOrder.filter(
      (key) => !preferences.hiddenHomeCards.includes(key),
    );
    return (
      <>
        <section className="hero" aria-label="今日问候">
          <div className="hero__photo" style={{ backgroundImage: `url(${publicAsset("banner-still-life.png")})` }}>
            {preferences.homeBannerImageId && <AssetImage id={preferences.homeBannerImageId} alt="我的首页封面" />}
          </div>
          <div className="hero__copy polka-field">
            <p className="eyebrow">TODAY · {formatDate(today())}</p>
            <h2>{preferences.homeGreeting}<br />{preferences.homeMessage}</h2>
            <label className="text-button file-button"><Camera size={15} /> 更换封面<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void updateHomeBanner(file); event.currentTarget.value = ""; }} /></label>
          </div>
        </section>

        <div className="home-grid">
          {visibleCards.map((key) => (
            <div key={key} className={`home-slot home-slot--${preferences.homeSizes[key] ?? "wide"}`}>
              {renderHomeCard(key)}
            </div>
          ))}
        </div>
        <div className="center-action">
          <button className="button button--ghost" onClick={() => setModal({ kind: "layout" })}>
            <PenLine size={16} /> 编辑首页
          </button>
        </div>
      </>
    );
  }

  function renderHomeCard(key: string) {
    if (key === "savings") {
      const target = targets[0];
      const value = target ? amountForTarget(data!, target.id) : 0;
      const percent = target ? (value / target.targetAmount) * 100 : 0;
      return (
        <button className="summary-card polka-corner" onClick={() => navigate("savings")}>
          <span className="card-heading"><PiggyBank />存钱<ChevronRight /></span>
          <strong>{target ? formatMoney(value, target.currency) : "暂无目标"}</strong>
          {target && <><Progress value={percent} /><small>距离目标还差 {formatMoney(Math.max(target.targetAmount - value, 0), target.currency)}</small></>}
        </button>
      );
    }
    if (key === "countdown") {
      return (
        <button className="summary-card polka-corner" onClick={() => navigate("countdown")}>
          <span className="card-heading"><CalendarDays />倒计时<ChevronRight /></span>
          <strong>{nextCountdown ? `${Math.max(daysUntil(effectiveCountdownDate(nextCountdown.targetDate, nextCountdown.repeatYearly)), 0)}天` : "暂无事件"}</strong>
          <small>{nextCountdown?.title ?? "添加一个期待的日子"}</small>
        </button>
      );
    }
    if (key === "monthly") {
      const average = currentMonthGoals.length
        ? currentMonthGoals.reduce((sum, goal) => sum + monthlyGoalPercent(goal), 0) / currentMonthGoals.length
        : 0;
      return (
        <button className="summary-card polka-corner" onClick={() => navigate("monthly")}>
          <span className="card-heading"><Target />月度<ChevronRight /></span>
          <strong>{Math.round(average)}%</strong>
          <Progress value={average} />
          <small>{currentMonthGoals.length} 个本月目标</small>
        </button>
      );
    }
    if (key === "fandom") {
      const spent = nextEvent
        ? expenses.filter((expense) => expense.eventId === nextEvent.id).reduce((sum, item) => sum + item.amount, 0)
        : 0;
      return (
        <button className="editorial-card fandom-card" onClick={() => navigate("fandom")}>
          <div className="editorial-card__body">
            <span className="card-heading"><Star />追星<ChevronRight /></span>
            <p className="editorial-date">{nextEvent ? formatDate(nextEvent.startDate) : "等待下一场相遇"}</p>
            <h3>{nextEvent?.title ?? "添加追星行程"}</h3>
            {nextEvent && <p className="meta-line">{nextEvent.location} · 还有 {Math.max(daysUntil(nextEvent.startDate), 0)} 天</p>}
            {nextEvent && <p className="money-line">已花费 {formatMoney(spent, nextEvent.currency)} / 预算 {formatMoney(nextEvent.budgetAmount, nextEvent.currency)}</p>}
          </div>
          <div className="fandom-card__image" style={{ backgroundImage: `url(${publicAsset("concert-mono.png")})` }} />
        </button>
      );
    }
    if (key === "life") {
      const latest = diaries[0];
      return (
        <button className="editorial-card life-card polka-side" onClick={() => navigate("life")}>
          <div>
            <span className="card-heading"><Leaf />生活<ChevronRight /></span>
            <p className="editorial-display">Better<br />Days</p>
          </div>
          <div className="life-card__details">
            {security && !diaryUnlocked ? (
              <><LockKeyhole size={22} /><h3>生活日记已锁定</h3><p>解锁后查看今天的心情。</p></>
            ) : latest ? (
              <><p className="meta-line">心情 {moodLabels[latest.mood]} · {latest.weather ? weatherLabels[latest.weather] : "未记录天气"}</p><h3>“{latest.content}”</h3></>
            ) : <p>记录今天的心情。</p>}
          </div>
        </button>
      );
    }
    const wish = wishes[0];
    const wishTarget = wish?.savingsTargetId
      ? allTargets.find((target) => target.id === wish.savingsTargetId)
      : undefined;
    const percent = wishTarget
      ? (amountForTarget(data!, wishTarget.id) / Math.max(wish.budgetAmount, 1)) * 100
      : 0;
    return (
      <button className="editorial-card wish-card polka-double" onClick={() => navigate("wish")}>
        <Camera size={54} strokeWidth={1.1} />
        <div>
          <span className="card-heading"><Heart />心愿<ChevronRight /></span>
          <h3>{wish?.title ?? "写下一个心愿"}</h3>
          {wish && <><Progress value={percent} /><p>{Math.round(Math.min(percent, 100))}% · {wish.category}</p></>}
        </div>
      </button>
    );
  }

  function renderSavings() {
    return (
      <section className="page-section">
        <PageTitle eyebrow="MONEY PLANET" title="存钱" description="一笔一笔，把喜欢的生活存下来。" action={<button className="button button--primary" onClick={() => setModal({ kind: "savingTarget" })}><Plus />新目标</button>} />
        <div className="stats-row">
          {(["CNY", "KRW", "JPY", "USD"] as Currency[]).map((currency) => {
            const total = targets.filter((target) => target.currency === currency).reduce((sum, target) => sum + amountForTarget(data!, target.id), 0);
            return <div className="stat-tile" key={currency}><small>{currency}</small><strong>{formatMoney(total, currency)}</strong></div>;
          })}
        </div>
        <div className="section-heading"><h2>存钱目标</h2><button className="text-button" onClick={() => setModal({ kind: "transaction" })}><Plus size={16} />记录存取</button></div>
        {targets.length ? <div className="card-list">{targets.map((target) => {
          const value = amountForTarget(data!, target.id);
          const progress = (value / target.targetAmount) * 100;
          return <article className="record-card" key={target.id}>
            <div className="record-card__head"><div><span className="tag">{target.currency}</span><h3>{target.name}</h3></div><strong>{formatMoney(value, target.currency)}</strong></div>
            <Progress value={progress} />
            <div className="record-card__meta"><span>目标 {formatMoney(target.targetAmount, target.currency)}</span><span>{progress >= 100 ? `超额 ${formatMoney(value - target.targetAmount, target.currency)}` : `${Math.round(progress)}%`}</span></div>
            <div className="record-actions">
              <button onClick={() => setModal({ kind: "transaction", id: target.id })}><ArrowDownToLine />存取</button>
              <button onClick={() => void commit({ ...data!, savingsTargets: data!.savingsTargets.map((item) => item.id === target.id ? { ...item, status: "archived", updatedAt: isoNow() } : item) }, "已归档")}><Archive />归档</button>
              <button onClick={() => window.confirm("删除目标后，相关流水会一起移入回收站；心愿和行程不会删除。继续吗？") && void softDelete("savingsTargets", target.id)}><Trash2 />删除</button>
            </div>
          </article>;
        })}</div> : <EmptyState title="还没有存钱目标" description="从一笔小小的存款开始。" action={<button className="button button--primary" onClick={() => setModal({ kind: "savingTarget" })}>新建目标</button>} />}
        <div className="section-heading"><h2>最近流水</h2></div>
        <div className="compact-list">{transactions.slice().reverse().slice(0, 8).map((transaction) => <div className="compact-row" key={transaction.id}><span className={`transaction-mark transaction-mark--${transaction.direction}`}>{transaction.direction === "deposit" ? "+" : "−"}</span><div><strong>{allTargets.find((item) => item.id === transaction.targetId)?.name ?? "已删除目标"}</strong><small>{transaction.note || new Date(transaction.occurredAt).toLocaleDateString("zh-CN")}</small></div><b>{transaction.direction === "deposit" ? "+" : "−"}{formatMoney(transaction.amount, transaction.currency)}</b><button className="icon-button" aria-label="删除流水" onClick={() => window.confirm("删除这条流水？") && void softDelete("savingsTransactions", transaction.id)}><Trash2 /></button></div>)}</div>
      </section>
    );
  }

  function renderCountdown() {
    const sorted = countdowns.slice().sort((left, right) => {
      const leftDays = daysUntil(effectiveCountdownDate(left.targetDate, left.repeatYearly));
      const rightDays = daysUntil(effectiveCountdownDate(right.targetDate, right.repeatYearly));
      return Number(right.isPinned) - Number(left.isPinned)
        || Number(leftDays < 0) - Number(rightDays < 0)
        || (leftDays < 0 && rightDays < 0 ? rightDays - leftDays : leftDays - rightDays);
    });
    return <section className="page-section">
      <PageTitle eyebrow="COUNTING DOWN" title="倒计时" description="把期待放在眼前，日子就有了方向。" action={<button className="button button--primary" onClick={() => setModal({ kind: "countdown" })}><Plus />新倒计时</button>} />
      <div className="countdown-grid">{sorted.map((item) => {
        const displayDate = effectiveCountdownDate(item.targetDate, item.repeatYearly);
        const remaining = daysUntil(displayDate);
        const urgency = remaining < 0 ? "past" : remaining <= 1 ? "urgent" : remaining <= 7 ? "soon" : remaining <= 30 ? "near" : "normal";
        return <article className={`countdown-card countdown-card--${urgency}`} key={item.id}>
          <div className="card-heading"><Clock3 />{item.isPinned ? "置顶事件" : "倒计时"}</div>
          <strong>{Math.abs(remaining)}<small>天</small></strong>
          <h3>{item.title}</h3><p>{formatDate(displayDate)}{item.targetTime ? ` · ${item.targetTime}` : ""}</p>
          <div className="record-actions"><span>{remaining < 0 ? "已经过去" : item.repeatYearly ? "每年重复" : urgency === "near" ? "即将到来" : "一次性"}</span><button onClick={() => setModal({ kind: "countdown", id: item.id })}><PenLine />修改</button><button onClick={() => window.confirm("移入回收站？") && void softDelete("countdowns", item.id)}><Trash2 />删除</button></div>
        </article>;
      })}</div>
      {!sorted.length && <EmptyState title="还没有倒计时" description="添加一个值得期待的日子。" />}
    </section>;
  }

  function renderMonthly() {
    const review = active(data!.monthlyReviews).find((item) => item.month === monthNow());
    return <section className="page-section">
      <PageTitle eyebrow="MONTHLY NOTE" title="月度" description={`${monthNow()} · 目标与复盘`} action={<button className="button button--primary" onClick={() => setModal({ kind: "monthlyGoal" })}><Plus />新目标</button>} />
      <div className="goal-list">{currentMonthGoals.map((goal) => {
        const progress = monthlyGoalPercent(goal);
        return <article className="goal-row" key={goal.id}><div className="goal-row__index">{String(currentMonthGoals.indexOf(goal) + 1).padStart(2, "0")}</div><div><span className="tag">{goal.category}</span><h3>{goal.name}</h3><Progress value={progress} /><small>{goal.currentValue}/{goal.targetValue} {goal.unit} · {Math.round(progress)}%</small></div><button className="icon-button" aria-label="增加进度" onClick={() => { const nextValue = goal.progressType === "checkbox" ? (goal.currentValue ? 0 : 1) : Math.min(goal.currentValue + 1, goal.targetValue); void commit({ ...data!, monthlyGoals: data!.monthlyGoals.map((item) => item.id === goal.id ? { ...item, currentValue: nextValue, updatedAt: isoNow() } : item) }, "进度已更新"); }}><Plus /></button></article>;
      })}</div>
      {!currentMonthGoals.length && <EmptyState title="这个月还没有目标" description="用一种适合你的方式记录进度。" />}
      <article className="review-card polka-side">
        <div><p className="eyebrow">MONTHLY REVIEW</p><h2>月底复盘</h2><p>{review ? "本月复盘已经开始，随时可以继续写。" : "成果、开心、遗憾、收支与下月计划。"}</p></div>
        <button className="button button--ghost" onClick={() => setModal({ kind: "monthlyReview", id: review?.id })}>{review ? "继续复盘" : "开始复盘"}</button>
      </article>
    </section>;
  }

  function renderFandom() {
    return <section className="page-section">
      <PageTitle eyebrow="STAR TIMELINE" title="追星" description="行程、预算与相遇，放在同一条时间线上。" action={<button className="button button--primary" onClick={() => setModal({ kind: "fandomEvent" })}><Plus />新行程</button>} />
      <div className="section-heading"><h2><Star />艺人档案</h2><button className="text-button" onClick={() => setModal({ kind: "artist" })}><Plus />新增艺人</button></div>
      {artists.length ? <div className="artist-grid">{artists.map((artist) => <article className="artist-card" key={artist.id}>
        <div className="artist-card__avatar">{artist.avatarImageId ? <AssetImage id={artist.avatarImageId} alt={`${artist.name}头像`} /> : <Star />}</div>
        <div className="artist-card__body"><span className="tag">{artist.groupName || "个人艺人"}</span><h3>{artist.name}</h3>{artist.nickname && <p className="artist-card__nickname">{artist.nickname}</p>}<p>生日 · {formatDate(artist.birthday)}</p>{artist.debutDate && <p>出道 · {formatDate(artist.debutDate)}</p>}{artist.note && <small>{artist.note}</small>}<div className="record-actions"><button onClick={() => setModal({ kind: "artist", id: artist.id })}><PenLine />编辑</button><button onClick={() => window.confirm("删除这张艺人档案？关联行程会保留。") && void softDelete("artists", artist.id)}><Trash2 />删除</button></div></div>
      </article>)}</div> : <EmptyState title="还没有艺人档案" description="可以添加多位艺人，并分别设置头像与纪念日。" action={<button className="button button--primary" onClick={() => setModal({ kind: "artist" })}>新增艺人</button>} />}
      <div className="toolbar fandom-toolbar"><div className="segmented"><button className={fandomMode === "timeline" ? "is-active" : ""} onClick={() => setFandomMode("timeline")}><List />时间线</button><button className={fandomMode === "calendar" ? "is-active" : ""} onClick={() => setFandomMode("calendar")}><CalendarRange />月历</button></div></div>
      {fandomMode === "timeline" ? <div className="timeline">{events.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)).map((event) => {
        const artistNames = event.artistIds.map((id) => data!.artists.find((artist) => artist.id === id)?.name).filter(Boolean).join("、");
        const eventExpenses = expenses.filter((expense) => expense.eventId === event.id);
        const spent = eventExpenses.reduce((sum, item) => sum + item.amount, 0);
        return <article className="event-card" key={event.id}><div className="event-card__date"><strong>{new Date(`${event.startDate}T00:00:00`).getDate()}</strong><small>{new Date(`${event.startDate}T00:00:00`).toLocaleDateString("zh-CN", { month: "short" })}</small></div><div className="event-card__body"><span className="tag">{event.eventType}</span><h3>{event.title}</h3><p>{artistNames} · {event.location || "线上"} · 还有 {Math.max(daysUntil(event.startDate), 0)} 天</p><Progress value={event.budgetAmount ? (spent / event.budgetAmount) * 100 : 0} /><small>花费 {formatMoney(spent, event.currency)} / 预算 {formatMoney(event.budgetAmount, event.currency)}</small><div className="record-actions"><button onClick={() => setModal({ kind: "fandomExpense", id: event.id })}><CircleDollarSign />记花费</button><button onClick={() => window.confirm("删除活动？") && void softDelete("fandomEvents", event.id)}><Trash2 />删除</button></div></div><div className="event-card__visual polka-field"><Star /></div></article>;
      })}</div> : <MiniCalendar events={events} />}
      {!events.length && <EmptyState title="还没有追星行程" description="添加演唱会、签售、直播或发售日。" />}
    </section>;
  }

  function renderLife() {
    if (!security) {
      return <section className="page-section"><PageTitle eyebrow="PRIVATE JOURNAL" title="生活" description="先设置 4 位 PIN，再开始记录。" /><div className="lock-panel polka-field"><ShieldCheck size={42} /><h2>保护你的生活日记</h2><p>PIN 用于防止他人直接翻看。设置时会生成一组恢复码，请妥善保存。</p><SecuritySetup onComplete={(nextSecurity, recoveryCode) => { setSecurity(nextSecurity); saveDiarySecurity(nextSecurity); setDiaryUnlocked(true); activityRef.current = Date.now(); window.alert(`请保存恢复码：\n${recoveryCode}\n\n恢复码只完整展示这一次。`); setToast("日记锁已设置"); }} /></div></section>;
    }
    if (!diaryUnlocked) {
      return <section className="page-section"><PageTitle eyebrow="PRIVATE JOURNAL" title="生活日记已锁定" description="输入 4 位 PIN 后查看。" /><UnlockPanel security={security} onUnlock={() => { setDiaryUnlocked(true); activityRef.current = Date.now(); setToast("已解锁，闲置 5 分钟后自动锁定"); }} onReset={(next, code) => { setSecurity(next); saveDiarySecurity(next); setDiaryUnlocked(true); window.alert(`新的恢复码：\n${code}`); }} onErase={() => void eraseDiary()} /></section>;
    }
    return <section className="page-section">
      <PageTitle eyebrow="PRIVATE JOURNAL" title="生活" description="用心情和天气，记住平凡的一天。" action={<button className="button button--primary" onClick={() => setModal({ kind: "diary" })}><Plus />写日记</button>} />
      <div className="toolbar"><div className="segmented"><button className={lifeMode === "timeline" ? "is-active" : ""} onClick={() => setLifeMode("timeline")}><List />时间线</button><button className={lifeMode === "grid" ? "is-active" : ""} onClick={() => setLifeMode("grid")}><Camera />照片墙</button></div><button className="text-button" onClick={() => setDiaryUnlocked(false)}><LockKeyhole />立即锁定</button></div>
      {lifeMode === "timeline" ? <div className="diary-list">{diaries.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((entry) => <article className="diary-card" key={entry.id}>{entry.coverImageId && <AssetImage id={entry.coverImageId} alt="日记封面" className="diary-card__image" />}<div><p className="eyebrow">{new Date(entry.occurredAt).toLocaleDateString("zh-CN")}</p><h3>{entry.content || "一张照片的记忆"}</h3><p>{moodLabels[entry.mood]} · {entry.weather ? weatherLabels[entry.weather] : "未记录天气"}</p><div className="tag-row">{entry.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><button className="text-button danger" onClick={() => window.confirm("移入回收站？") && void softDelete("diaryEntries", entry.id)}><Trash2 />删除</button></div></article>)}</div> : <div className="photo-grid">{diaries.filter((entry) => entry.coverImageId).map((entry) => <div key={entry.id} className="photo-tile"><AssetImage id={entry.coverImageId!} alt={entry.content || "生活照片"} /><span>{new Date(entry.occurredAt).toLocaleDateString("zh-CN")}</span></div>)}</div>}
      {!diaries.length && <EmptyState title="还没有生活记录" description="从今天的心情开始。" />}
    </section>;
  }

  function renderExtension() {
    return <section className="page-section">
      <PageTitle eyebrow="LITTLE TOOLS" title="扩展" description="读书与习惯，是生活缓慢长大的方式。" />
      <div className="section-heading"><h2><BookOpen />读书</h2><button className="text-button" onClick={() => setModal({ kind: "book" })}><Plus />添加书籍</button></div>
      <div className="book-grid">{books.map((book) => {
        const progress = book.progressMode === "pages" && book.totalPages ? (book.currentPage / book.totalPages) * 100 : book.percent;
        return <article className="book-card" key={book.id}>
          <div className="book-cover">{book.coverImageId ? <AssetImage id={book.coverImageId} alt={`${book.title}封面`} /> : <BookOpen />}</div>
          <div><span className="tag">{book.status === "finished" ? "已读完" : book.status === "reading" ? "在读" : "想读"}</span><h3>{book.title}</h3><Progress value={progress} /><small>{Math.round(progress)}% · {book.note}</small><div className="record-actions"><button onClick={() => { const nextProgress = Math.min(progress + 10, 100); void commit({ ...data!, books: data!.books.map((item) => item.id === book.id ? { ...item, percent: item.progressMode === "percent" ? nextProgress : item.percent, currentPage: item.progressMode === "pages" ? Math.min(item.currentPage + Math.ceil(item.totalPages * 0.1), item.totalPages) : item.currentPage, status: nextProgress >= 100 ? "finished" : "reading", finishedAt: nextProgress >= 100 ? isoNow() : null, updatedAt: isoNow() } : item) }, "阅读进度已更新"); }}><Plus />进度</button><button onClick={() => setModal({ kind: "book", id: book.id })}><PenLine />编辑</button><button onClick={() => void softDelete("books", book.id)}><Trash2 />删除</button></div></div>
        </article>;
      })}</div>
      <div className="section-heading"><h2><Flame />习惯打卡</h2><button className="text-button" onClick={() => setModal({ kind: "habit" })}><Plus />新习惯</button></div>
      <div className="habit-list">{habits.map((habit) => { const checked = active(data!.habitCheckins).some((item) => item.habitId === habit.id && item.scheduledDate === today()); const schedule = habit.scheduleType === "daily" ? "每日" : habit.scheduleType === "weekdays" ? `每周${habit.weekdays.map((day) => "日一二三四五六"[day]).join("、")}` : habit.scheduleType === "weeklyCount" ? `每周 ${habit.targetCount} 次` : `每月 ${habit.targetCount} 次`; return <article className="habit-row" key={habit.id}><button className={`check-button ${checked ? "is-checked" : ""}`} aria-label={checked ? "今天已打卡" : "立即打卡"} onClick={() => void toggleHabit(habit, checked)}>{checked ? <Check /> : <Plus />}</button><div><h3>{habit.name}</h3><p>{schedule}</p></div><span className="streak"><Flame />{habitStreak(habit.id)} 天</span></article>; })}</div>
    </section>;
  }

  function renderWish() {
    return <section className="page-section">
      <PageTitle eyebrow="WISH LIST" title="心愿" description="想要、进行中、已完成，每一个都值得被看见。" action={<button className="button button--primary" onClick={() => setModal({ kind: "wish" })}><Plus />新心愿</button>} />
      <div className="wish-grid">{wishes.map((wish) => { const target = wish.savingsTargetId ? allTargets.find((item) => item.id === wish.savingsTargetId) : undefined; const value = target ? amountForTarget(data!, target.id) : 0; const percent = wish.budgetAmount ? (value / wish.budgetAmount) * 100 : 0; return <article className="wish-panel polka-double" key={wish.id}><div className="wish-panel__icon"><Camera /></div><div><span className="tag">{wish.category}</span><h3>{wish.title}</h3><p>{wish.status === "completed" ? `完成于 ${wish.completedAt}` : wish.targetDate ? `目标 ${formatDate(wish.targetDate)}` : "没有截止日期"}</p>{wish.budgetAmount > 0 && <><Progress value={percent} /><small>{Math.round(Math.min(percent, 100))}% · 预算 {formatMoney(wish.budgetAmount, wish.currency)}</small></>}<div className="record-actions">{wish.status !== "completed" && <button onClick={() => void completeWish(wish)}><CheckCircle2 />完成</button>}<button onClick={() => void softDelete("wishes", wish.id)}><Trash2 />删除</button></div></div></article>; })}</div>
      {!wishes.length && <EmptyState title="还没有心愿" description="写下一个想去、想做或想拥有的愿望。" />}
    </section>;
  }

  function renderMore() {
    const links: Array<{ view: View; title: string; description: string; icon: typeof Clock3 }> = [
      { view: "countdown", title: "倒计时", description: "重要日期与年度纪念", icon: Clock3 },
      { view: "monthly", title: "月度", description: "目标与月底复盘", icon: Target },
      { view: "extension", title: "扩展", description: "读书和习惯打卡", icon: Sparkles },
      { view: "wish", title: "心愿", description: "目标卡片与纪念卡", icon: Heart },
      { view: "trash", title: "回收站", description: "删除内容保留 30 天", icon: Trash2 },
      { view: "settings", title: "设置与备份", description: "主题、加密备份与恢复", icon: Settings },
    ];
    return <section className="page-section"><PageTitle eyebrow="MORE PLANETS" title="更多" description="所有小工具，都有自己的轨道。" /><div className="more-grid">{links.map((link) => { const Icon = link.icon; return <button key={link.view} className="more-card polka-corner" onClick={() => navigate(link.view)}><Icon /><div><h3>{link.title}</h3><p>{link.description}</p></div><ChevronRight /></button>; })}<article className="more-card is-disabled"><CalendarRange /><div><h3>年度报告</h3><p>V1 先积累数据，之后再开放。</p></div><span className="tag">敬请期待</span></article></div></section>;
  }

  function renderTrash() {
    const rows = collectTrash(data!);
    const availableKeys = rows.map((row) => trashKey(row.collection, row.record.id));
    const selectedKeys = selectedTrash.filter((key) => availableKeys.includes(key));
    const selectedRows = rows.filter((row) => selectedKeys.includes(trashKey(row.collection, row.record.id)));
    const allSelected = rows.length > 0 && selectedRows.length === rows.length;
    return <section className="page-section"><PageTitle eyebrow="RECYCLE BIN" title="回收站" description="删除内容保留 30 天，永久清理前 3 天会提醒。" />{rows.length ? <>
      <div className="trash-toolbar"><button className="button button--ghost" onClick={() => setSelectedTrash(allSelected ? [] : availableKeys)}>{allSelected ? "取消全选" : "全选"}</button><span>已选择 {selectedRows.length} 项</span><div><button className="button button--ghost" disabled={!selectedRows.length} onClick={() => void restoreMany(selectedRows)}><RotateCcw />批量恢复</button><button className="button button--primary" disabled={!selectedRows.length} onClick={() => window.confirm(`永久删除选中的 ${selectedRows.length} 项？此操作无法恢复。`) && void purgeMany(selectedRows)}><Trash2 />批量彻底删除</button></div></div>
      <div className="compact-list">{rows.map((row) => { const key = trashKey(row.collection, row.record.id); return <div className="compact-row trash-row" key={key}><input aria-label={`选择${row.label}`} type="checkbox" checked={selectedKeys.includes(key)} onChange={(event) => setSelectedTrash((current) => event.currentTarget.checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} /><Trash2 /><div><strong>{row.label}</strong><small>还剩 {daysInTrash(row.record)} 天永久删除</small></div><button className="text-button" onClick={() => void restoreRecord(row.collection, row.record.id)}><RotateCcw />恢复</button><button className="text-button danger" onClick={() => window.confirm("永久删除后无法恢复，确定吗？") && void purgeRecord(row.collection, row.record.id)}><X />彻底删除</button></div>; })}</div>
    </> : <EmptyState title="回收站是空的" description="删除的内容会在这里保留 30 天。" />}</section>;
  }

  function renderSettings() {
    return <section className="page-section"><PageTitle eyebrow="SETTINGS" title="设置与备份" description="主题、隐私和本地数据，都由你掌握。" />
      <div className="settings-grid">
        <article className="settings-card"><div className="card-heading"><Palette />外观</div><h3>主题模式</h3><div className="choice-row">{(["system", "light", "dark"] as const).map((mode) => <button className={preferences.themeMode === mode ? "is-active" : ""} key={mode} onClick={() => updatePreferences({ themeMode: mode })}>{mode === "system" ? <Monitor /> : mode === "light" ? <Sun /> : <Moon />}{mode === "system" ? "跟随系统" : mode === "light" ? "浅色" : "深色"}</button>)}</div><h3>强调色</h3><div className="swatches">{(["oat", "mistBlue", "dustyPink"] as const).map((accent) => <button aria-label={`切换到 ${accent}`} className={`swatch swatch--${accent} ${preferences.accentTheme === accent ? "is-active" : ""}`} key={accent} onClick={() => updatePreferences({ accentTheme: accent })} />)}</div></article>
        <article className="settings-card polka-corner"><div className="card-heading"><ShieldCheck />加密备份</div><p>导出包含所有数据、图片、主题和首页布局的加密 ZIP。</p><small>上次备份：{preferences.lastBackupAt ? new Date(preferences.lastBackupAt).toLocaleString("zh-CN") : "还没有备份"}</small><div className="button-row"><button className="button button--primary" onClick={() => setModal({ kind: "backup" })}><Download />导出</button><button className="button button--ghost" onClick={() => setModal({ kind: "import" })}><Upload />导入</button></div></article>
        <article className="settings-card"><div className="card-heading"><LockKeyhole />生活日记</div><p>{security ? "已启用 4 位 PIN，闲置 5 分钟自动锁定。" : "尚未设置日记锁。"}</p>{security && <button className="button button--ghost" onClick={() => { setDiaryUnlocked(false); navigate("life"); }}>管理日记锁</button>}</article>
        <article className="settings-card"><div className="card-heading"><WalletCards />本地数据</div><p>主要记录和图片保存在这台设备的浏览器中，不会自动同步。</p><button className="button button--ghost" onClick={() => navigate("trash")}><Trash2 />打开回收站</button></article>
      </div>
    </section>;
  }

  async function eraseDiary() {
    if (!data || !window.confirm("这会永久清除全部生活日记。其他模块不受影响，确定继续？")) return;
    if (!window.confirm("最后确认：日记及专属图片无法恢复。")) return;
    const ids = new Set(data.diaryEntries.flatMap((entry) => entry.imageIds));
    const next = { ...data, diaryEntries: [] };
    await saveAppData(next);
    await Promise.all([...ids].map((id) => deleteAsset(id)));
    setData(next);
    setSecurity(null);
    saveDiarySecurity(null);
    setDiaryUnlocked(false);
    setToast("日记已清除，可以重新设置 PIN");
  }

  async function toggleHabit(habit: Habit, checked: boolean) {
    if (!data) return;
    if (checked) {
      const checkin = active(data.habitCheckins).find((item) => item.habitId === habit.id && item.scheduledDate === today());
      if (checkin) await softDelete("habitCheckins", checkin.id);
      return;
    }
    const record = { ...baseRecord("checkin"), habitId: habit.id, scheduledDate: today(), checkedAt: isoNow(), isMakeup: false };
    await commit({ ...data, habitCheckins: [...data.habitCheckins, record] }, "打卡成功");
  }

  function habitStreak(habitId: string): number {
    const dates = new Set(active(data!.habitCheckins).filter((item) => item.habitId === habitId).map((item) => item.scheduledDate));
    let streak = 0;
    const cursor = new Date();
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  async function completeWish(wish: Wish) {
    if (!window.confirm("完成这个心愿并生成纪念记录？")) return;
    await commit({ ...data!, wishes: data!.wishes.map((item) => item.id === wish.id ? { ...item, status: "completed", completedAt: today(), updatedAt: isoNow() } : item) }, "心愿完成啦");
  }

  async function updateHomeBanner(file: File) {
    setBusy(true);
    setError(null);
    try {
      const asset = await compressImage(file, "home", null, "banner", 0);
      await saveAsset(asset);
      const previousId = preferences.homeBannerImageId;
      updatePreferences({ homeBannerImageId: asset.id });
      if (previousId) await deleteAsset(previousId);
      setToast("首页封面已压缩并保存");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "封面保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function restoreMany(rows: TrashRow[]) {
    if (!data || !rows.length) return;
    const selected = new Set(rows.map((row) => trashKey(row.collection, row.record.id)));
    const restoredTargetIds = new Set(rows.filter((row) => row.collection === "savingsTargets").map((row) => row.record.id));
    const restoredArtistIds = new Set(rows.filter((row) => row.collection === "artists").map((row) => row.record.id));
    const now = isoNow();
    const next = { ...data } as AppData;
    (Object.keys(data) as Array<keyof AppData>).forEach((key) => {
      if (key === "schemaVersion") return;
      const collection = key as RecordCollection;
      const records = data[collection] as unknown as BaseRecord[];
      (next[collection] as unknown) = records.map((record) => selected.has(trashKey(collection, record.id)) ? { ...record, deletedAt: null, updatedAt: now } : record);
    });
    next.savingsTransactions = next.savingsTransactions.map((transaction) => restoredTargetIds.has(transaction.targetId) ? { ...transaction, deletedAt: null, updatedAt: now } : transaction);
    next.countdowns = next.countdowns.map((countdown) => countdown.sourceId && restoredArtistIds.has(countdown.sourceId) ? { ...countdown, deletedAt: null, status: "active", updatedAt: now } : countdown);
    rows.forEach((row) => {
      if (row.collection === "fandomExpenses") {
        const expense = data.fandomExpenses.find((item) => item.id === row.record.id);
        if (expense?.savingsTransactionId) next.savingsTransactions = next.savingsTransactions.map((item) => item.id === expense.savingsTransactionId ? { ...item, deletedAt: null, updatedAt: now } : item);
      }
      if (row.collection === "savingsTransactions") {
        const transaction = data.savingsTransactions.find((item) => item.id === row.record.id);
        if (transaction?.sourceType === "fandomExpense" && transaction.sourceId) next.fandomExpenses = next.fandomExpenses.map((item) => item.id === transaction.sourceId ? { ...item, deletedAt: null, updatedAt: now } : item);
      }
    });
    const saved = await commit(next, `已恢复 ${rows.length} 项`);
    if (saved) setSelectedTrash([]);
  }

  async function purgeMany(rows: TrashRow[]) {
    if (!data || !rows.length) return;
    const selected = new Set(rows.map((row) => trashKey(row.collection, row.record.id)));
    const removedTransactionIds = new Set<string>();
    const removedExpenseIds = new Set<string>();
    const removedTargetIds = new Set<string>();
    const removedArtistIds = new Set<string>();
    const assetIds = new Set<string>();

    rows.forEach((row) => {
      if (row.collection === "savingsTargets") removedTargetIds.add(row.record.id);
      if (row.collection === "artists") removedArtistIds.add(row.record.id);
      if (row.collection === "fandomExpenses") {
        const expense = data.fandomExpenses.find((item) => item.id === row.record.id);
        if (expense?.savingsTransactionId) removedTransactionIds.add(expense.savingsTransactionId);
      }
      if (row.collection === "savingsTransactions") {
        const transaction = data.savingsTransactions.find((item) => item.id === row.record.id);
        if (transaction?.sourceType === "fandomExpense" && transaction.sourceId) removedExpenseIds.add(transaction.sourceId);
      }
      if (row.collection === "diaryEntries") {
        const diary = data.diaryEntries.find((item) => item.id === row.record.id);
        diary?.imageIds.forEach((id) => assetIds.add(id));
      }
      if (row.collection === "books") {
        const book = data.books.find((item) => item.id === row.record.id);
        if (book?.coverImageId) assetIds.add(book.coverImageId);
      }
      if (row.collection === "artists") {
        const artist = data.artists.find((item) => item.id === row.record.id);
        if (artist?.avatarImageId) assetIds.add(artist.avatarImageId);
      }
    });

    const next = { ...data } as AppData;
    (Object.keys(data) as Array<keyof AppData>).forEach((key) => {
      if (key === "schemaVersion") return;
      const collection = key as RecordCollection;
      const records = data[collection] as unknown as BaseRecord[];
      (next[collection] as unknown) = records.filter((record) => !selected.has(trashKey(collection, record.id)));
    });
    next.savingsTransactions = next.savingsTransactions.filter((item) => !removedTargetIds.has(item.targetId) && !removedTransactionIds.has(item.id));
    next.fandomExpenses = next.fandomExpenses.filter((item) => !removedExpenseIds.has(item.id));
    next.countdowns = next.countdowns.filter((item) => !item.sourceId || !removedArtistIds.has(item.sourceId));
    const saved = await commit(next, `已永久删除 ${rows.length} 项`);
    if (!saved) return;
    await Promise.all([...assetIds].map((id) => deleteAsset(id)));
    setSelectedTrash([]);
  }

  async function purgeRecord(collection: RecordCollection, id: string) {
    if (!data) return;
    const record = (data[collection] as unknown as BaseRecord[]).find((item) => item.id === id);
    if (!record) return;
    await purgeMany([{ collection, record, label: "记录" }]);
  }

  const pageLabel = navItems.find((item) => item.id === view)?.label ?? "小小星球";
  const mobileNav = navItems.filter((item) => item.mobile);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")}><PolkaPlanet small /><span><strong>小小星球</strong><small>PERSONAL PLANET</small></span></button>
        <nav>{navItems.filter((item) => item.id !== "more").map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => navigate(item.id)}><Icon />{item.label}</button>; })}</nav>
        <div className="sidebar__footer"><button onClick={() => navigate("settings")}><Settings />设置</button><p>数据保存在本机</p></div>
      </aside>
      <main className="app-main">
        <header className="topbar"><button className="mobile-brand" onClick={() => navigate("home")}><PolkaPlanet small /><span>小小星球</span></button><div><p className="eyebrow">{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</p><h1>{pageLabel}</h1></div><button className="icon-button" onClick={() => navigate("settings")} aria-label="打开设置"><Settings /></button></header>
        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError(null)}><X /></button></div>}
        {renderView()}
      </main>
      <button className="floating-add" onClick={() => setModal({ kind: "quick" })} aria-label="快速新增"><Plus /></button>
      <nav className="bottom-nav">{mobileNav.map((item) => { const Icon = item.icon; const activeView = view === item.id || (item.id === "more" && ["countdown", "monthly", "extension", "wish", "trash", "settings", "more"].includes(view)); return <button key={item.id} className={activeView ? "is-active" : ""} onClick={() => navigate(item.id)}><Icon /><span>{item.label}</span></button>; })}</nav>
      {modal && <AppModal modal={modal} setModal={setModal} data={data} preferences={preferences} security={security} busy={busy} commit={commit} updatePreferences={updatePreferences} onSecurityChange={(next) => { setSecurity(next); saveDiarySecurity(next); }} onDataChange={setData} setToast={setToast} setError={setError} />}
      {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function MiniCalendar({ events }: { events: FandomEvent[] }) {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return <div className="calendar-panel"><div className="calendar-week">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: firstDay }).map((_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: count }).map((_, index) => { const day = index + 1; const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const event = events.find((item) => item.startDate === iso); return <div className={event ? "has-event" : ""} key={iso}><b>{day}</b>{event && <small>{event.title}</small>}</div>; })}</div></div>;
}

function SecuritySetup({ onComplete }: { onComplete: (security: DiarySecurity, recoveryCode: string) => void }) {
  const [error, setError] = useState("");
  return <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const pin = field(form, "pin"); const confirmPin = field(form, "confirmPin"); if (!/^\d{4}$/.test(pin)) return setError("请输入 4 位数字 PIN"); if (pin !== confirmPin) return setError("两次 PIN 不一致"); void createDiarySecurity(pin, field(form, "hint")).then(({ security, recoveryCode }) => onComplete(security, recoveryCode)); }}><label>4 位 PIN<input name="pin" inputMode="numeric" maxLength={4} required /></label><label>再次输入<input name="confirmPin" inputMode="numeric" maxLength={4} required /></label><label>密码提示（选填）<input name="hint" placeholder="不要直接写出密码" /></label>{error && <p className="form-error">{error}</p>}<button className="button button--primary" type="submit"><ShieldCheck />设置日记锁</button></form>;
}

function UnlockPanel({ security, onUnlock, onReset, onErase }: { security: DiarySecurity; onUnlock: () => void; onReset: (security: DiarySecurity, recoveryCode: string) => void; onErase: () => void }) {
  const [mode, setMode] = useState<"pin" | "recovery">("pin");
  const [error, setError] = useState("");
  if (mode === "recovery") return <div className="lock-panel polka-field"><RotateCcw size={42} /><h2>使用恢复码</h2><form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const code = field(form, "recovery"); const pin = field(form, "pin"); if (!/^\d{4}$/.test(pin)) return setError("新 PIN 必须是 4 位数字"); void verifyRecoveryCode(code, security).then(async (valid) => { if (!valid) return setError("恢复码不正确"); const result = await createDiarySecurity(pin, security.pinHint); onReset(result.security, result.recoveryCode); }); }}><label>恢复码<input name="recovery" required /></label><label>新的 4 位 PIN<input name="pin" inputMode="numeric" maxLength={4} required /></label>{error && <p className="form-error">{error}</p>}<button className="button button--primary" type="submit">验证并重设</button></form><button className="text-button" onClick={() => setMode("pin")}>返回 PIN 解锁</button><button className="text-button danger" onClick={onErase}>PIN 和恢复码都丢失</button></div>;
  return <div className="lock-panel polka-field"><LockKeyhole size={42} /><h2>生活日记已锁定</h2>{security.pinHint && <p>提示：{security.pinHint}</p>}<form className="inline-form" onSubmit={(event) => { event.preventDefault(); const pin = field(new FormData(event.currentTarget), "pin"); void verifyPin(pin, security).then((valid) => valid ? onUnlock() : setError("PIN 不正确")); }}><label>4 位 PIN<input name="pin" inputMode="numeric" maxLength={4} required /></label>{error && <p className="form-error">{error}</p>}<button className="button button--primary" type="submit"><Unlock />解锁</button></form><button className="text-button" onClick={() => setMode("recovery")}>忘记 PIN？使用恢复码</button></div>;
}

function collectTrash(data: AppData): Array<{ collection: RecordCollection; record: BaseRecord; label: string }> {
  const labels: Partial<Record<RecordCollection, string>> = { savingsTargets: "存钱目标", savingsTransactions: "存钱流水", countdowns: "倒计时", monthlyGoals: "月度目标", monthlyReviews: "月度复盘", artists: "艺人资料", fandomEvents: "追星活动", fandomExpenses: "追星花费", diaryEntries: "生活日记", books: "书籍", habits: "习惯", habitCheckins: "打卡", wishes: "心愿" };
  return (Object.entries(data) as Array<[keyof AppData, unknown]>).flatMap(([key, value]) => key !== "schemaVersion" && Array.isArray(value) ? (value as BaseRecord[]).filter((record) => record.deletedAt).map((record) => ({ collection: key as RecordCollection, record, label: `${labels[key as RecordCollection] ?? "记录"} · ${"name" in record ? String(record.name) : "title" in record ? String(record.title) : "一条记录"}` })) : []).sort((a, b) => (b.record.deletedAt ?? "").localeCompare(a.record.deletedAt ?? ""));
}

function purgeExpiredRecords(data: AppData): AppData {
  const cutoff = Date.now() - 30 * 86400000;
  const next = { ...data } as AppData;
  (Object.keys(data) as Array<keyof AppData>).forEach((key) => {
    if (key === "schemaVersion") return;
    const records = data[key] as unknown as BaseRecord[];
    (next[key] as unknown) = records.filter((record) => !record.deletedAt || new Date(record.deletedAt).getTime() > cutoff);
  });
  return next;
}

interface ModalProps {
  modal: ModalState;
  setModal: (value: ModalState | null) => void;
  data: AppData;
  preferences: AppPreferences;
  security: DiarySecurity | null;
  busy: boolean;
  commit: (data: AppData, message?: string) => Promise<boolean>;
  updatePreferences: (patch: Partial<AppPreferences>) => void;
  onSecurityChange: (security: DiarySecurity | null) => void;
  onDataChange: (data: AppData) => void;
  setToast: (message: string) => void;
  setError: (message: string | null) => void;
}

function AppModal(props: ModalProps) {
  const { modal, setModal, data, preferences, security, busy, commit, updatePreferences, onSecurityChange, onDataChange, setToast, setError } = props;
  const targets = active(data.savingsTargets);
  const events = active(data.fandomEvents);
  const close = () => !busy && setModal(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const now = isoNow();
    let next = data;

    try {
      if (modal.kind === "savingTarget") {
        const record: SavingsTarget = { ...baseRecord("saving"), name: field(form, "name"), targetAmount: numberField(form, "targetAmount"), currency: field(form, "currency") as Currency, deadline: field(form, "deadline") || null, note: field(form, "note"), status: "active" };
        if (!record.name || record.targetAmount <= 0) throw new Error("请填写目标名称和大于 0 的金额");
        next = { ...data, savingsTargets: [...data.savingsTargets, record] };
      } else if (modal.kind === "transaction") {
        const target = targets.find((item) => item.id === field(form, "targetId"));
        if (!target) throw new Error("请选择存钱目标");
        const amount = numberField(form, "amount");
        const direction = field(form, "direction") as "deposit" | "withdraw";
        if (amount <= 0) throw new Error("金额必须大于 0");
        if (direction === "withdraw" && amountForTarget(data, target.id) - amount < 0) throw new Error("取出金额不能超过当前余额");
        const record = { ...baseRecord("transaction"), targetId: target.id, direction, amount, currency: target.currency, occurredAt: now, note: field(form, "note"), sourceType: "manual" as const, sourceId: null };
        next = { ...data, savingsTransactions: [...data.savingsTransactions, record] };
      } else if (modal.kind === "countdown") {
        const existing = data.countdowns.find((item) => item.id === modal.id);
        const record: CountdownEvent = { ...(existing ?? baseRecord("countdown")), title: field(form, "title"), targetDate: field(form, "targetDate"), targetTime: field(form, "targetTime") || null, timeZone: existing?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, note: field(form, "note"), isPinned: form.get("isPinned") === "on", repeatYearly: form.get("repeatYearly") === "on", status: "active", sourceType: existing?.sourceType ?? "manual", sourceId: existing?.sourceId ?? null, updatedAt: now };
        if (!record.title || !record.targetDate) throw new Error("请填写名称和目标日期");
        next = { ...data, countdowns: existing ? data.countdowns.map((item) => item.id === existing.id ? record : item) : [...data.countdowns, record] };
      } else if (modal.kind === "monthlyGoal") {
        const progressType = field(form, "progressType") as MonthlyGoal["progressType"];
        const record: MonthlyGoal = { ...baseRecord("monthly"), month: field(form, "month"), name: field(form, "name"), category: field(form, "category") || "生活", progressType, targetValue: progressType === "checkbox" ? 1 : progressType === "percent" ? 100 : numberField(form, "targetValue"), currentValue: 0, unit: field(form, "unit") || (progressType === "count" ? "次" : "%"), deadline: field(form, "deadline") };
        if (!record.name || !record.month || !record.deadline) throw new Error("请补充目标、月份和截止日期");
        next = { ...data, monthlyGoals: [...data.monthlyGoals, record] };
      } else if (modal.kind === "monthlyReview") {
        const existing = active(data.monthlyReviews).find((item) => item.id === modal.id);
        const record = { ...(existing ?? baseRecord("review")), month: monthNow(), achievements: field(form, "achievements"), happiestMoment: field(form, "happiestMoment"), regrets: field(form, "regrets"), financeSummary: field(form, "financeSummary"), nextMonthPlan: field(form, "nextMonthPlan"), updatedAt: now };
        next = { ...data, monthlyReviews: existing ? data.monthlyReviews.map((item) => item.id === existing.id ? record : item) : [...data.monthlyReviews, record] };
      } else if (modal.kind === "fandomEvent") {
        const record: FandomEvent = { ...baseRecord("event"), title: field(form, "title"), artistIds: form.getAll("artistIds").map(String), eventType: field(form, "eventType"), startDate: field(form, "startDate"), startTime: field(form, "startTime") || null, location: field(form, "location"), note: field(form, "note"), budgetAmount: numberField(form, "budgetAmount"), currency: field(form, "currency") as Currency, savingsTargetId: field(form, "savingsTargetId") || null, status: "upcoming" };
        if (!record.title || !record.startDate || !record.eventType) throw new Error("请填写活动名称、类型和日期");
        next = { ...data, fandomEvents: [...data.fandomEvents, record] };
      } else if (modal.kind === "fandomExpense") {
        const eventRecord = events.find((item) => item.id === field(form, "eventId"));
        if (!eventRecord) throw new Error("请选择追星活动");
        const amount = numberField(form, "amount");
        const deduct = form.get("deduct") === "on";
        const targetId = field(form, "savingsTargetId") || eventRecord.savingsTargetId;
        if (amount <= 0) throw new Error("金额必须大于 0");
        const expenseId = baseRecord("expense");
        let transactionId: string | null = null;
        let savingsTransactions = data.savingsTransactions;
        if (deduct) {
          const target = targets.find((item) => item.id === targetId);
          if (!target || target.currency !== eventRecord.currency) throw new Error("请选择同币种的存钱目标");
          if (amountForTarget(data, target.id) < amount) throw new Error("关联基金余额不足，可改为仅记录花费");
          if (!window.confirm(`将从“${target.name}”取出 ${formatMoney(amount, target.currency)}，确定吗？`)) return;
          const transaction = { ...baseRecord("transaction"), targetId: target.id, direction: "withdraw" as const, amount, currency: target.currency, occurredAt: now, note: `${eventRecord.title} · ${field(form, "category")}`, sourceType: "fandomExpense" as const, sourceId: expenseId.id };
          transactionId = transaction.id;
          savingsTransactions = [...savingsTransactions, transaction];
        }
        const expense = { ...expenseId, eventId: eventRecord.id, category: field(form, "category") as "ticket" | "album" | "merch" | "transport" | "hotel" | "other", amount, currency: eventRecord.currency, occurredAt: now, note: field(form, "note"), deductFromSavings: deduct, savingsTargetId: deduct ? targetId : null, savingsTransactionId: transactionId };
        next = { ...data, savingsTransactions, fandomExpenses: [...data.fandomExpenses, expense] };
      } else if (modal.kind === "diary") {
        const diaryBase = baseRecord("diary");
        const occurredDate = field(form, "occurredDate") || today();
        if (occurredDate > today()) throw new Error("生活日记不能填写未来日期");
        const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 9);
        const assets: ImageAsset[] = [];
        for (let index = 0; index < files.length; index += 1) assets.push(await compressImage(files[index], "diary", diaryBase.id, index === 0 ? "cover" : "content", index));
        const record: DiaryEntry = { ...diaryBase, occurredAt: occurredDate === today() ? now : `${occurredDate}T12:00:00`, content: field(form, "content"), tags: field(form, "tags").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), mood: field(form, "mood") as DiaryEntry["mood"], weather: (field(form, "weather") || null) as DiaryEntry["weather"], imageIds: assets.map((asset) => asset.id), coverImageId: assets[0]?.id ?? null };
        if (!record.content && !assets.length) throw new Error("文字和图片至少填写一项");
        next = { ...data, diaryEntries: [record, ...data.diaryEntries] };
        await saveDataAndAssets(next, assets);
        onDataChange(next); setToast("日记已保存"); setModal(null); return;
      } else if (modal.kind === "book") {
        const existing = data.books.find((item) => item.id === modal.id);
        const mode = field(form, "progressMode") as Book["progressMode"];
        const base = existing ?? baseRecord("book");
        const coverFile = form.get("cover");
        const coverAsset = coverFile instanceof File && coverFile.size > 0
          ? await compressImage(coverFile, "book", base.id, "cover", 0)
          : null;
        const record: Book = { ...base, title: field(form, "title"), coverImageId: coverAsset?.id ?? existing?.coverImageId ?? null, status: existing?.status ?? "reading", progressMode: mode, totalPages: numberField(form, "totalPages"), currentPage: existing?.currentPage ?? 0, percent: existing?.percent ?? 0, note: field(form, "note"), finishedAt: existing?.finishedAt ?? null, updatedAt: now };
        if (!record.title || (mode === "pages" && record.totalPages <= 0)) throw new Error("请填写书名和有效进度信息");
        next = { ...data, books: existing ? data.books.map((item) => item.id === existing.id ? record : item) : [...data.books, record] };
        if (coverAsset) {
          await saveDataAndAssets(next, [coverAsset]);
          if (existing?.coverImageId) await deleteAsset(existing.coverImageId);
          onDataChange(next); setToast(existing ? "书籍与封面已更新" : "书籍已添加"); setModal(null); return;
        }
      } else if (modal.kind === "habit") {
        const record: Habit = { ...baseRecord("habit"), name: field(form, "name"), scheduleType: field(form, "scheduleType") as Habit["scheduleType"], weekdays: form.getAll("weekdays").map((value) => Number(value)), targetCount: Math.max(1, numberField(form, "targetCount")), startDate: today(), status: "active" };
        if (!record.name) throw new Error("请填写习惯名称");
        if (record.scheduleType === "weekdays" && !record.weekdays.length) throw new Error("指定星期时至少选择一天");
        next = { ...data, habits: [...data.habits, record] };
      } else if (modal.kind === "wish") {
        const record: Wish = { ...baseRecord("wish"), title: field(form, "title"), targetDate: field(form, "targetDate") || null, budgetAmount: numberField(form, "budgetAmount"), currency: field(form, "currency") as Currency, priority: field(form, "priority") as Wish["priority"], status: "wanted", category: field(form, "category"), savingsTargetId: field(form, "savingsTargetId") || null, completedAt: null, completionNote: "" };
        if (!record.title || !record.category) throw new Error("请填写心愿和类别");
        next = { ...data, wishes: [...data.wishes, record] };
      } else if (modal.kind === "artist") {
        const existing = data.artists.find((item) => item.id === modal.id);
        const base = existing ?? baseRecord("artist");
        const birthday = field(form, "birthday");
        const artistName = field(form, "name");
        const debutDate = field(form, "debutDate") || null;
        if (!artistName || !birthday) throw new Error("姓名和完整生日必须填写");
        const avatarFile = form.get("avatar");
        const avatarAsset = avatarFile instanceof File && avatarFile.size > 0
          ? await compressImage(avatarFile, "artist", base.id, "avatar", 0)
          : null;
        const record: Artist = { ...base, name: artistName, avatarImageId: avatarAsset?.id ?? existing?.avatarImageId ?? null, nickname: field(form, "nickname"), groupName: field(form, "groupName"), birthday, debutDate, note: field(form, "note"), updatedAt: now };
        let syncedCountdowns = [...data.countdowns];
        const syncAnnualCountdown = (sourceType: "artistBirthday" | "artistDebut", targetDate: string | null, title: string, enabled: boolean) => {
          const found = syncedCountdowns.find((item) => item.sourceType === sourceType && item.sourceId === base.id);
          if (!targetDate || !enabled) {
            if (found) syncedCountdowns = syncedCountdowns.map((item) => item.id === found.id ? { ...item, deletedAt: now, status: "ended", updatedAt: now } : item);
            return;
          }
          if (found) {
            syncedCountdowns = syncedCountdowns.map((item) => item.id === found.id ? { ...item, title, targetDate, repeatYearly: true, status: "active", deletedAt: null, updatedAt: now } : item);
          } else {
            syncedCountdowns.push({ ...baseRecord("countdown"), title, targetDate, targetTime: null, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, note: "由艺人资料生成", isPinned: false, repeatYearly: true, status: "active", sourceType, sourceId: base.id });
          }
        };
        syncAnnualCountdown("artistBirthday", birthday, `${artistName}生日`, form.get("syncBirthday") === "on");
        syncAnnualCountdown("artistDebut", debutDate, `${artistName}出道纪念日`, form.get("syncDebut") === "on");
        next = { ...data, countdowns: syncedCountdowns, artists: existing ? data.artists.map((item) => item.id === existing.id ? record : item) : [...data.artists, record] };
        if (avatarAsset) {
          await saveDataAndAssets(next, [avatarAsset]);
          if (existing?.avatarImageId) await deleteAsset(existing.avatarImageId);
          onDataChange(next); setToast(existing ? "艺人档案与头像已更新" : "艺人档案已添加"); setModal(null); return;
        }
      }
      const saved = await commit(next, "已保存");
      if (saved) setModal(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };

  const titleMap: Record<ModalKind, string> = { quick: "快速新增", savingTarget: "新建存钱目标", transaction: "记录存入／取出", countdown: modal.id ? "编辑倒计时" : "新建倒计时", monthlyGoal: "新建月度目标", monthlyReview: "月底复盘", fandomEvent: "新建追星行程", fandomExpense: "记录追星花费", diary: "写生活日记", book: modal.id ? "编辑书籍" : "添加书籍", habit: "新建习惯", wish: "新建心愿", artist: modal.id ? "编辑艺人档案" : "新增艺人档案", layout: "编辑首页", backup: "导出加密备份", import: "导入备份" };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal" role="dialog" aria-modal="true" aria-label={titleMap[modal.kind]}><div className="modal__head"><div><p className="eyebrow">SMALL PLANET</p><h2>{titleMap[modal.kind]}</h2></div><button className="icon-button" onClick={close} aria-label="关闭"><X /></button></div>{modal.kind === "quick" ? <QuickChooser choose={(kind) => setModal({ kind })} /> : modal.kind === "layout" ? <LayoutEditor preferences={preferences} onChange={updatePreferences} close={close} /> : modal.kind === "backup" ? <BackupForm data={data} preferences={preferences} security={security} onDone={(date) => { updatePreferences({ lastBackupAt: date }); setToast("加密备份已导出"); close(); }} setError={setError} /> : modal.kind === "import" ? <ImportForm currentData={data} preferences={preferences} security={security} onImported={(nextData, nextPrefs, nextSecurity) => { onDataChange(nextData); updatePreferences(nextPrefs); onSecurityChange(nextSecurity); setToast("备份导入完成"); close(); }} setError={setError} /> : <form className="modal-form" onSubmit={submit}>{renderFields()}<div className="modal-actions"><button type="button" className="button button--ghost" onClick={close}>取消</button><button className="button button--primary" type="submit" disabled={busy}><Save />{busy ? "保存中…" : "保存"}</button></div></form>}</div></div>;

  function renderFields() {
    if (modal.kind === "savingTarget") return <><label>目标名称<input name="name" placeholder="例如：追星基金" required /></label><div className="form-grid"><label>目标金额<input name="targetAmount" type="number" min="1" step="0.01" required /></label><label>币种<select name="currency" defaultValue="CNY"><option value="CNY">人民币 CNY</option><option value="KRW">韩元 KRW</option><option value="JPY">日元 JPY</option><option value="USD">美元 USD</option></select></label></div><label>截止日期（选填）<input name="deadline" type="date" /></label><label>备注<textarea name="note" /></label></>;
    if (modal.kind === "transaction") return <><label>存钱目标<select name="targetId" defaultValue={modal.id ?? targets[0]?.id}>{targets.map((target) => <option value={target.id} key={target.id}>{target.name} · {currencySymbols[target.currency]}</option>)}</select></label><div className="form-grid"><label>类型<select name="direction"><option value="deposit">存入</option><option value="withdraw">取出</option></select></label><label>金额<input name="amount" type="number" min="0.01" step="0.01" required /></label></div><label>备注<textarea name="note" /></label></>;
    if (modal.kind === "countdown") { const countdown = data.countdowns.find((item) => item.id === modal.id); return <><label>事件名称<input name="title" defaultValue={countdown?.title} required /></label><div className="form-grid"><label>目标日期<input name="targetDate" type="date" defaultValue={countdown?.targetDate} required /></label><label>具体时间（选填）<input name="targetTime" type="time" defaultValue={countdown?.targetTime ?? ""} /></label></div><div className="check-row"><label><input name="isPinned" type="checkbox" defaultChecked={countdown?.isPinned} />置顶</label><label><input name="repeatYearly" type="checkbox" defaultChecked={countdown?.repeatYearly} />每年重复</label></div><label>备注<textarea name="note" defaultValue={countdown?.note} /></label></>; }
    if (modal.kind === "monthlyGoal") return <><label>目标名称<input name="name" required /></label><div className="form-grid"><label>所属月份<input name="month" type="month" defaultValue={monthNow()} required /></label><label>类别<input name="category" defaultValue="生活" /></label><label>进度方式<select name="progressType"><option value="checkbox">完成／未完成</option><option value="percent">百分比</option><option value="count">次数累计</option><option value="value">数值累计</option></select></label><label>目标值<input name="targetValue" type="number" defaultValue="10" min="1" /></label><label>单位<input name="unit" defaultValue="次" /></label><label>截止日期<input name="deadline" type="date" required /></label></div></>;
    if (modal.kind === "monthlyReview") { const review = active(data.monthlyReviews).find((item) => item.id === modal.id); return <>{[["achievements", "本月完成的事"], ["happiestMoment", "本月最开心的事"], ["regrets", "本月遗憾"], ["financeSummary", "收支概况"], ["nextMonthPlan", "下个月计划"]].map(([name, label]) => <label key={name}>{label}<textarea name={name} defaultValue={review?.[name as keyof typeof review] as string ?? ""} /></label>)}</>; }
    if (modal.kind === "fandomEvent") return <><label>活动名称<input name="title" required /></label>{active(data.artists).length > 0 && <fieldset className="weekday-field"><legend>关联艺人（可多选）</legend>{active(data.artists).map((artist) => <label key={artist.id}><input type="checkbox" name="artistIds" value={artist.id} />{artist.name}</label>)}</fieldset>}<div className="form-grid"><label>类型<select name="eventType"><option>演唱会</option><option>签售</option><option>直播</option><option>发售</option><option>其他</option></select></label><label>日期<input name="startDate" type="date" required /></label><label>时间<input name="startTime" type="time" /></label><label>地点<input name="location" placeholder="线上活动可留空" /></label><label>预算<input name="budgetAmount" type="number" min="0" step="0.01" defaultValue="0" /></label><label>币种<select name="currency"><option value="CNY">人民币</option><option value="KRW">韩元</option><option value="JPY">日元</option><option value="USD">美元</option></select></label></div><label>关联存钱目标<select name="savingsTargetId"><option value="">不关联</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name} · {target.currency}</option>)}</select></label><label>备注<textarea name="note" /></label></>;
    if (modal.kind === "fandomExpense") return <><label>活动<select name="eventId" defaultValue={modal.id}>{events.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><div className="form-grid"><label>类别<select name="category"><option value="ticket">门票</option><option value="album">专辑</option><option value="merch">周边</option><option value="transport">交通</option><option value="hotel">住宿</option><option value="other">其他</option></select></label><label>金额<input name="amount" type="number" min="0.01" step="0.01" required /></label></div><label className="checkbox-card"><input name="deduct" type="checkbox" />同时从关联基金取出（保存前会再次确认）</label><label>基金<select name="savingsTargetId"><option value="">使用活动关联基金</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name} · {target.currency}</option>)}</select></label><label>备注<textarea name="note" /></label></>;
    if (modal.kind === "diary") return <><label>记录日期<input name="occurredDate" type="date" defaultValue={today()} max={today()} required /></label><label>这一天想记什么<textarea name="content" rows={5} /></label><div className="form-grid"><label>心情<select name="mood" defaultValue="calm">{Object.entries(moodLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>天气<select name="weather"><option value="">不记录</option>{Object.entries(weatherLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div><label>标签<input name="tags" placeholder="日常，开心" /></label><label>图片（最多 9 张）<input name="images" type="file" accept="image/*" multiple /></label><small>可以补写过去的日期；图片上传前会自动压缩至最长边约 1920px。</small></>;
    if (modal.kind === "book") { const book = data.books.find((item) => item.id === modal.id); return <><label>书名<input name="title" defaultValue={book?.title} required /></label><label>{book?.coverImageId ? "更换封面（不选择则保留当前封面）" : "书籍封面"}<input name="cover" type="file" accept="image/*" /></label><div className="form-grid"><label>进度方式<select name="progressMode" defaultValue={book?.progressMode ?? "percent"}><option value="percent">百分比</option><option value="pages">页数</option></select></label><label>总页数<input name="totalPages" type="number" min="1" defaultValue={book?.totalPages || 100} /></label></div><label>简短笔记<textarea name="note" defaultValue={book?.note} /></label><small>封面会自动压缩并保存在当前设备。</small></>; }
    if (modal.kind === "habit") return <><label>习惯名称<input name="name" required /></label><div className="form-grid"><label>周期<select name="scheduleType"><option value="daily">每日</option><option value="weekdays">指定星期</option><option value="weeklyCount">每周次数</option><option value="monthlyCount">每月次数</option></select></label><label>目标次数<input name="targetCount" type="number" min="1" defaultValue="1" /></label></div><fieldset className="weekday-field"><legend>指定星期时选择</legend>{["日", "一", "二", "三", "四", "五", "六"].map((label, index) => <label key={label}><input type="checkbox" name="weekdays" value={index} />周{label}</label>)}</fieldset></>;
    if (modal.kind === "wish") return <><label>心愿名称<input name="title" required /></label><div className="form-grid"><label>类别<select name="category"><option>旅行</option><option>物品</option><option>体验</option><option>成长</option><option>追星</option></select></label><label>优先级<select name="priority"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label><label>目标日期<input name="targetDate" type="date" /></label><label>预算<input name="budgetAmount" type="number" min="0" step="0.01" defaultValue="0" /></label><label>币种<select name="currency"><option value="CNY">人民币</option><option value="KRW">韩元</option><option value="JPY">日元</option><option value="USD">美元</option></select></label><label>关联基金<select name="savingsTargetId"><option value="">不关联</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.name} · {target.currency}</option>)}</select></label></div></>;
    if (modal.kind === "artist") { const artist = data.artists.find((item) => item.id === modal.id); const hasBirthday = artist ? data.countdowns.some((item) => item.sourceType === "artistBirthday" && item.sourceId === artist.id && !item.deletedAt) : true; const hasDebut = artist ? data.countdowns.some((item) => item.sourceType === "artistDebut" && item.sourceId === artist.id && !item.deletedAt) : true; return <><p className="form-note">支持添加多位艺人；每位都会生成独立展示卡片。</p><label>{artist?.avatarImageId ? "更换头像（不选择则保留）" : "艺人头像"}<input name="avatar" type="file" accept="image/*" /></label><label>姓名<input name="name" defaultValue={artist?.name} required /></label><div className="form-grid"><label>昵称<input name="nickname" defaultValue={artist?.nickname} /></label><label>所属组合<input name="groupName" defaultValue={artist?.groupName} /></label><label>完整生日<input name="birthday" type="date" defaultValue={artist?.birthday} required /></label><label>出道日<input name="debutDate" type="date" defaultValue={artist?.debutDate ?? ""} /></label></div><div className="check-row"><label><input name="syncBirthday" type="checkbox" defaultChecked={hasBirthday} />同步生日倒计时</label><label><input name="syncDebut" type="checkbox" defaultChecked={hasDebut} />同步出道纪念日</label></div><label>备注<textarea name="note" defaultValue={artist?.note} /></label><small>头像会自动压缩并只保存在当前设备。</small></>; }
    return null;
  }
}

function QuickChooser({ choose }: { choose: (kind: ModalKind) => void }) {
  const items: Array<[ModalKind, string, typeof PiggyBank]> = [["transaction", "存钱记录", PiggyBank], ["countdown", "倒计时", Clock3], ["monthlyGoal", "月度目标", Target], ["fandomEvent", "追星行程", Star], ["fandomExpense", "追星花费", CircleDollarSign], ["diary", "生活日记", Leaf], ["wish", "心愿", Heart]];
  return <div className="quick-grid">{items.map(([kind, label, Icon]) => <button key={kind} onClick={() => choose(kind)}><Icon /><span>{label}</span></button>)}</div>;
}

function LayoutEditor({ preferences, onChange, close }: { preferences: AppPreferences; onChange: (patch: Partial<AppPreferences>) => void; close: () => void }) {
  const move = (key: string, offset: number) => { const order = [...preferences.homeOrder]; const index = order.indexOf(key); const target = index + offset; if (target < 0 || target >= order.length) return; [order[index], order[target]] = [order[target], order[index]]; onChange({ homeOrder: order }); };
  return <div className="layout-editor">
    <div className="home-copy-editor">
      <label>首页问候语<input value={preferences.homeGreeting} maxLength={24} onChange={(event) => onChange({ homeGreeting: event.currentTarget.value })} /></label>
      <label>首页主文字<input value={preferences.homeMessage} maxLength={36} onChange={(event) => onChange({ homeMessage: event.currentTarget.value })} /></label>
      <small>文字和布局修改后会立即自动保存。</small>
    </div>
    {preferences.homeOrder.map((key) => { const hidden = preferences.hiddenHomeCards.includes(key); return <div className="layout-row" key={key}><GripVertical /><strong>{homeCardLabels[key]}</strong><button onClick={() => move(key, -1)} aria-label="上移">↑</button><button onClick={() => move(key, 1)} aria-label="下移">↓</button><button onClick={() => onChange({ homeSizes: { ...preferences.homeSizes, [key]: preferences.homeSizes[key] === "small" ? "wide" : "small" } })}>{preferences.homeSizes[key] === "small" ? "小卡" : "宽卡"}</button><label><input type="checkbox" checked={!hidden} onChange={() => onChange({ hiddenHomeCards: hidden ? preferences.hiddenHomeCards.filter((item) => item !== key) : [...preferences.hiddenHomeCards, key] })} />显示</label></div>; })}
    <div className="modal-actions"><button className="button button--ghost" onClick={() => onChange({ ...defaultPreferences })}>恢复默认</button><button className="button button--primary" onClick={close}><Check />完成</button></div>
  </div>;
}

function BackupForm({ data, preferences, security, onDone, setError }: { data: AppData; preferences: AppPreferences; security: DiarySecurity | null; onDone: (date: string) => void; setError: (message: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  return <form className="modal-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const password = field(form, "password"); const confirmPassword = field(form, "confirmPassword"); const pin = field(form, "pin"); if (password.length < 8) return setError("备份密码至少需要 8 位"); if (password !== confirmPassword) return setError("两次备份密码不一致"); setBusy(true); void (async () => { try { if (security && !(await verifyPin(pin, security))) throw new Error("日记 PIN 不正确"); const blob = await exportEncryptedBackup(data, preferences, security, password); downloadBlob(blob, `小小星球备份-${today()}.zip`); onDone(isoNow()); } catch (reason) { setError(reason instanceof Error ? reason.message : "备份失败"); } finally { setBusy(false); } })(); }}>
    {security && <label>先验证 4 位日记 PIN<input name="pin" inputMode="numeric" maxLength={4} required /></label>}<label>独立备份密码<input name="password" type="password" minLength={8} required /></label><label>再次输入备份密码<input name="confirmPassword" type="password" minLength={8} required /></label><p className="form-note">备份密码不会保存，也无法找回。ZIP 内只有一个加密数据包，错误密码无法读取业务内容或图片。</p><button className="button button--primary" disabled={busy} type="submit"><Download />{busy ? "正在加密…" : "导出加密 ZIP"}</button>
  </form>;
}

function ImportForm({ currentData, preferences, security, onImported, setError }: { currentData: AppData; preferences: AppPreferences; security: DiarySecurity | null; onImported: (data: AppData, prefs: AppPreferences, security: DiarySecurity | null) => void; setError: (message: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  return <form className="modal-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get("file"); if (!(file instanceof File) || !file.size) return setError("请选择备份文件"); const password = field(form, "password"); const mode = field(form, "mode"); setBusy(true); void (async () => { const oldAssets = await getAllAssets(); try { const imported = await readEncryptedBackup(file, password); if (mode === "replace") { if (!window.confirm("覆盖会先创建本地恢复点，再替换当前数据。确定继续？")) return; try { await replaceDatabase(imported.data, imported.assets); savePreferences(imported.preferences); saveDiarySecurity(imported.security); onImported(imported.data, imported.preferences, imported.security); } catch (reason) { await replaceDatabase(currentData, oldAssets); savePreferences(preferences); saveDiarySecurity(security); throw reason; } } else { const next = mergeData(currentData, imported.data); const existingIds = new Set(oldAssets.map((asset) => asset.id)); const newAssets = imported.assets.filter((asset) => !existingIds.has(asset.id)); await replaceDatabase(next, [...oldAssets, ...newAssets]); onImported(next, preferences, security); } } catch (reason) { setError(reason instanceof Error ? reason.message : "导入失败，当前数据未改变"); } finally { setBusy(false); } })(); }}><label>加密 ZIP<input name="file" type="file" accept=".zip,application/zip" required /></label><label>备份密码<input name="password" type="password" required /></label><label>导入方式<select name="mode"><option value="merge">合并：保留本机版本</option><option value="replace">覆盖：用备份替换当前数据</option></select></label><p className="form-note">合并时以唯一 ID 去重；重复内容保留本机版本。</p><button className="button button--primary" type="submit" disabled={busy}><Upload />{busy ? "正在校验…" : "校验并导入"}</button></form>;
}
