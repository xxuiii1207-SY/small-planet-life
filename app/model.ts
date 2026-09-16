export type Currency = "CNY" | "KRW" | "JPY" | "USD";
export type ThemeMode = "system" | "light" | "dark";
export type AccentTheme = "oat" | "mistBlue" | "dustyPink";

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  recordVersion: number;
}

export interface SavingsTarget extends BaseRecord {
  name: string;
  targetAmount: number;
  currency: Currency;
  deadline: string | null;
  note: string;
  status: "active" | "completed" | "archived";
}

export interface SavingsTransaction extends BaseRecord {
  targetId: string;
  direction: "deposit" | "withdraw";
  amount: number;
  currency: Currency;
  occurredAt: string;
  note: string;
  sourceType: "manual" | "fandomExpense";
  sourceId: string | null;
}

export interface CountdownEvent extends BaseRecord {
  title: string;
  targetDate: string;
  targetTime: string | null;
  timeZone: string;
  note: string;
  isPinned: boolean;
  repeatYearly: boolean;
  status: "active" | "ended";
  sourceType: "manual" | "artistBirthday" | "artistDebut";
  sourceId: string | null;
}

export interface MonthlyGoal extends BaseRecord {
  month: string;
  name: string;
  category: string;
  progressType: "checkbox" | "percent" | "count" | "value";
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
}

export interface MonthlyReview extends BaseRecord {
  month: string;
  achievements: string;
  happiestMoment: string;
  regrets: string;
  financeSummary: string;
  nextMonthPlan: string;
}

export interface Artist extends BaseRecord {
  name: string;
  avatarImageId: string | null;
  nickname: string;
  groupName: string;
  birthday: string;
  debutDate: string | null;
  note: string;
}

export interface FandomEvent extends BaseRecord {
  title: string;
  artistIds: string[];
  eventType: string;
  startDate: string;
  startTime: string | null;
  location: string;
  note: string;
  budgetAmount: number;
  currency: Currency;
  savingsTargetId: string | null;
  status: "upcoming" | "completed" | "cancelled";
}

export interface FandomExpense extends BaseRecord {
  eventId: string;
  category: "ticket" | "album" | "merch" | "transport" | "hotel" | "other";
  amount: number;
  currency: Currency;
  occurredAt: string;
  note: string;
  deductFromSavings: boolean;
  savingsTargetId: string | null;
  savingsTransactionId: string | null;
}

export type Mood =
  | "happy"
  | "expectant"
  | "calm"
  | "healed"
  | "tired"
  | "anxious"
  | "sad"
  | "angry";

export type Weather =
  | "sunny"
  | "lightCloud"
  | "cloudy"
  | "rain"
  | "thunder"
  | "snow";

export interface DiaryEntry extends BaseRecord {
  occurredAt: string;
  content: string;
  tags: string[];
  mood: Mood;
  weather: Weather | null;
  imageIds: string[];
  coverImageId: string | null;
}

export interface Book extends BaseRecord {
  title: string;
  coverImageId: string | null;
  status: "wantToRead" | "reading" | "finished";
  progressMode: "pages" | "percent";
  totalPages: number;
  currentPage: number;
  percent: number;
  note: string;
  finishedAt: string | null;
}

export interface Habit extends BaseRecord {
  name: string;
  scheduleType: "daily" | "weekdays" | "weeklyCount" | "monthlyCount";
  weekdays: number[];
  targetCount: number;
  startDate: string;
  status: "active" | "archived";
}

export interface HabitCheckin extends BaseRecord {
  habitId: string;
  scheduledDate: string;
  checkedAt: string;
  isMakeup: boolean;
}

export interface Wish extends BaseRecord {
  title: string;
  targetDate: string | null;
  budgetAmount: number;
  currency: Currency;
  priority: "high" | "medium" | "low";
  status: "wanted" | "inProgress" | "completed";
  category: string;
  savingsTargetId: string | null;
  completedAt: string | null;
  completionNote: string;
}

export interface DiarySecurity {
  pinSalt: string;
  pinVerifier: string;
  pinHint: string;
  recoverySalt: string;
  recoveryVerifier: string;
  recoveryCreatedAt: string;
}

export interface AppData {
  schemaVersion: number;
  savingsTargets: SavingsTarget[];
  savingsTransactions: SavingsTransaction[];
  countdowns: CountdownEvent[];
  monthlyGoals: MonthlyGoal[];
  monthlyReviews: MonthlyReview[];
  artists: Artist[];
  fandomEvents: FandomEvent[];
  fandomExpenses: FandomExpense[];
  diaryEntries: DiaryEntry[];
  books: Book[];
  habits: Habit[];
  habitCheckins: HabitCheckin[];
  wishes: Wish[];
}

export interface AppPreferences {
  themeMode: ThemeMode;
  accentTheme: AccentTheme;
  homeOrder: string[];
  hiddenHomeCards: string[];
  homeSizes: Record<string, "small" | "wide">;
  lastBackupAt: string | null;
  backupReminderMonth: string | null;
  homeBannerImageId: string | null;
  homeGreeting: string;
  homeMessage: string;
}

export interface ImageAsset {
  id: string;
  ownerType: string;
  ownerId: string | null;
  role: string;
  sortOrder: number;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
}

export const currencySymbols: Record<Currency, string> = {
  CNY: "¥",
  KRW: "₩",
  JPY: "¥",
  USD: "$",
};

export const moodLabels: Record<Mood, string> = {
  happy: "开心",
  expectant: "期待",
  calm: "平静",
  healed: "治愈",
  tired: "疲惫",
  anxious: "焦虑",
  sad: "难过",
  angry: "生气",
};

export const weatherLabels: Record<Weather, string> = {
  sunny: "晴",
  lightCloud: "少云",
  cloudy: "多云",
  rain: "雨",
  thunder: "雷",
  snow: "雪",
};

export function makeId(prefix: string): string {
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

export function baseRecord(prefix: string): BaseRecord {
  const now = new Date().toISOString();
  return {
    id: makeId(prefix),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    recordVersion: 1,
  };
}

function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createDemoData(): AppData {
  const month = new Date().toISOString().slice(0, 7);
  const goal = {
    ...baseRecord("saving"),
    name: "追星基金",
    targetAmount: 20000,
    currency: "CNY" as const,
    deadline: futureDate(120),
    note: "为下一次见面慢慢积累",
    status: "active" as const,
  };
  const artist = {
    ...baseRecord("artist"),
    name: "我的偶像",
    avatarImageId: null,
    nickname: "星星",
    groupName: "",
    birthday: "1998-06-18",
    debutDate: "2018-08-08",
    note: "首次资料可在追星页编辑",
  };
  const event = {
    ...baseRecord("fandom"),
    title: "上海演唱会",
    artistIds: [artist.id],
    eventType: "演唱会",
    startDate: futureDate(32),
    startTime: "19:30",
    location: "上海",
    note: "好的相遇，就在不远的未来。",
    budgetAmount: 2000,
    currency: "CNY" as const,
    savingsTargetId: goal.id,
    status: "upcoming" as const,
  };
  const transactions: SavingsTransaction[] = [
    {
      ...baseRecord("transaction"),
      targetId: goal.id,
      direction: "deposit",
      amount: 12560,
      currency: "CNY",
      occurredAt: new Date().toISOString(),
      note: "初始存款",
      sourceType: "manual",
      sourceId: null,
    },
  ];

  return {
    schemaVersion: 2,
    savingsTargets: [goal],
    savingsTransactions: transactions,
    countdowns: [
      {
        ...baseRecord("countdown"),
        title: "去看演唱会",
        targetDate: event.startDate,
        targetTime: event.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        note: "期待见面的那一天",
        isPinned: true,
        repeatYearly: false,
        status: "active",
        sourceType: "manual",
        sourceId: null,
      },
    ],
    monthlyGoals: [
      {
        ...baseRecord("monthly"),
        month,
        name: "完成本月重要计划",
        category: "生活",
        progressType: "count",
        targetValue: 10,
        currentValue: 6,
        unit: "项",
        deadline: `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()}`,
      },
    ],
    monthlyReviews: [],
    artists: [artist],
    fandomEvents: [event],
    fandomExpenses: [],
    diaryEntries: [
      {
        ...baseRecord("diary"),
        occurredAt: new Date().toISOString(),
        content: "今天的风很温柔。",
        tags: ["日常"],
        mood: "calm",
        weather: "lightCloud",
        imageIds: [],
        coverImageId: null,
      },
    ],
    books: [
      {
        ...baseRecord("book"),
        title: "正在读的一本书",
        coverImageId: null,
        status: "reading",
        progressMode: "percent",
        totalPages: 0,
        currentPage: 0,
        percent: 42,
        note: "读到喜欢的句子就停下来。",
        finishedAt: null,
      },
    ],
    habits: [
      {
        ...baseRecord("habit"),
        name: "早睡",
        scheduleType: "daily",
        weekdays: [],
        targetCount: 1,
        startDate: new Date().toISOString().slice(0, 10),
        status: "active",
      },
    ],
    habitCheckins: [],
    wishes: [
      {
        ...baseRecord("wish"),
        title: "买一台相机",
        targetDate: futureDate(180),
        budgetAmount: 18000,
        currency: "CNY",
        priority: "high",
        status: "inProgress",
        category: "物品",
        savingsTargetId: goal.id,
        completedAt: null,
        completionNote: "",
      },
    ],
  };
}

export const defaultPreferences: AppPreferences = {
  themeMode: "system",
  accentTheme: "oat",
  homeOrder: ["savings", "countdown", "monthly", "fandom", "life", "wish"],
  hiddenHomeCards: [],
  homeSizes: {
    savings: "small",
    countdown: "small",
    monthly: "small",
    fandom: "wide",
    life: "wide",
    wish: "wide",
  },
  lastBackupAt: null,
  backupReminderMonth: null,
  homeBannerImageId: null,
  homeGreeting: "早上好，",
  homeMessage: "今天也要好好生活呀。",
};

export function active<T extends BaseRecord>(records: T[]): T[] {
  return records.filter((record) => !record.deletedAt);
}

export function amountForTarget(data: AppData, targetId: string): number {
  return active(data.savingsTransactions)
    .filter((transaction) => transaction.targetId === targetId)
    .reduce(
      (sum, transaction) =>
        sum + (transaction.direction === "deposit" ? transaction.amount : -transaction.amount),
      0,
    );
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2,
  }).format(amount);
}

export function daysUntil(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function effectiveCountdownDate(
  targetDate: string,
  repeatYearly: boolean,
  reference = new Date(),
): string {
  if (!repeatYearly) return targetDate;
  const [, monthText, dayText] = targetDate.slice(0, 10).split("-");
  const month = Number(monthText);
  const originalDay = Number(dayText);
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const makeDate = (year: number) => {
    const day = month === 2 && originalDay === 29 && !isLeapYear(year) ? 28 : originalDay;
    return new Date(year, month - 1, day);
  };
  let occurrence = makeDate(start.getFullYear());
  if (occurrence < start) occurrence = makeDate(start.getFullYear() + 1);
  return `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, "0")}-${String(occurrence.getDate()).padStart(2, "0")}`;
}

export function monthlyGoalPercent(goal: MonthlyGoal): number {
  if (goal.progressType === "checkbox") return goal.currentValue > 0 ? 100 : 0;
  if (goal.progressType === "percent") return Math.min(goal.currentValue, 100);
  return goal.targetValue > 0
    ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
    : 0;
}
