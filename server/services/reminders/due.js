// Turns a spoken phrase like "in 20 minutes", "tomorrow at 9am" or
// "every day at 9am" into a due date, an optional repeat and the remaining text.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};

const HALF_HOUR = /\bin\s+half\s+an?\s+hour\b/i;
const RELATIVE = /\bin\s+(\d+|an?|one|two|three|four|five|ten|fifteen|twenty|thirty)\s+(minutes?|mins?|hours?|hrs?|days?)\b/i;
const CLOCK = /\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const CLOCK_MERIDIEM = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const NOON = /\b(?:at\s+)?(noon|midnight)\b/i;
const TOMORROW = /\btomorrow\b/i;
const TONIGHT = /\btonight\b/i;
const REPEAT_DAILY = /\b(?:every\s+day|everyday|each\s+day|daily)\b/i;
const REPEAT_WEEKLY = /\b(?:every\s+week|each\s+week|weekly)\b/i;

const toAmount = (value) => NUMBER_WORDS[value.toLowerCase()] ?? Number(value);

const unitMs = (unit) => {
  const lower = unit.toLowerCase();

  if (lower.startsWith("h")) return HOUR;
  if (lower.startsWith("d")) return DAY;

  return MINUTE;
};

// Drop the time phrase and any connective left behind ("call Sam at 5pm" -> "call Sam")
const strip = (value, phrases) => {
  let result = value;

  for (const phrase of phrases) {
    result = result.replace(phrase, " ");
  }

  return result
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
    .replace(/\s+(?:at|by|in|on)$/i, "")
    .replace(/[\s,.;:-]+$/, "")
    .trim();
};

const clockDate = (now, hours, minutes, { tomorrow = false } = {}) => {
  const due = new Date(now);
  due.setHours(hours, minutes, 0, 0);

  if (tomorrow || due <= now) {
    due.setDate(due.getDate() + 1);
  }

  return due;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseBase = (text, now = new Date()) => {
  const raw = String(text ?? "");

  const halfHour = raw.match(HALF_HOUR);

  if (halfHour) {
    return {
      dueAt: new Date(now.getTime() + 30 * MINUTE),
      text: strip(raw, [halfHour[0]]),
    };
  }

  const relative = raw.match(RELATIVE);

  if (relative) {
    const amount = toAmount(relative[1]);

    if (amount > 0) {
      return {
        dueAt: new Date(now.getTime() + amount * unitMs(relative[2])),
        text: strip(raw, [relative[0]]),
      };
    }
  }

  const clock = raw.match(CLOCK) ?? raw.match(CLOCK_MERIDIEM);
  const noon = raw.match(NOON);

  if (clock || noon) {
    let hours;
    let minutes = 0;

    if (clock) {
      hours = Number(clock[1]);
      minutes = Number(clock[2] ?? 0);

      const meridiem = clock[3]?.toLowerCase();

      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
      // "remind me at 5" means the evening, not 5 in the morning
      if (!meridiem && hours < 8) hours += 12;
    } else {
      hours = noon[1].toLowerCase() === "noon" ? 12 : 0;
    }

    if (hours > 23 || minutes > 59) {
      return { dueAt: null, text: raw };
    }

    const tomorrow = TOMORROW.test(raw);

    return {
      dueAt: clockDate(now, hours, minutes, { tomorrow }),
      text: strip(raw, [clock?.[0], noon?.[0], tomorrow ? TOMORROW.exec(raw)[0] : ""].filter(Boolean)),
      fromClock: true,
    };
  }

  const tomorrow = raw.match(TOMORROW);

  if (tomorrow) {
    const due = new Date(now);
    due.setDate(due.getDate() + 1);
    due.setHours(9, 0, 0, 0);

    return { dueAt: due, text: strip(raw, [tomorrow[0]]) };
  }

  const tonight = raw.match(TONIGHT);

  if (tonight) {
    const due = new Date(now);
    due.setHours(20, 0, 0, 0);

    return { dueAt: due, text: strip(raw, [tonight[0]]) };
  }

  return { dueAt: null, text: raw };
};

const nextNine = (now, daysAhead) => {
  const next = addDays(now, daysAhead);
  next.setHours(9, 0, 0, 0);
  return next;
};

// A weekly reminder at a clock time starts at the next matching time; if that
// time already passed today, it starts a week later instead of tomorrow.
const weeklyStart = (dueAt, fromClock, now) => {
  if (fromClock) {
    const candidate = new Date(now);
    candidate.setHours(dueAt.getHours(), dueAt.getMinutes(), 0, 0);
    return candidate > now ? candidate : addDays(candidate, 7);
  }

  let next = new Date(dueAt);

  while (next <= now) {
    next = addDays(next, 7);
  }

  return next;
};

export const parseDueDate = (text, now = new Date()) => {
  const raw = String(text ?? "");
  const base = parseBase(raw, now);
  const daily = REPEAT_DAILY.exec(raw);
  const weekly = daily ? null : REPEAT_WEEKLY.exec(raw);
  const repeat = daily ? "daily" : weekly ? "weekly" : null;

  if (!repeat) {
    return { dueAt: base.dueAt, text: base.text, repeat: null };
  }

  let dueAt = base.dueAt;

  if (repeat === "daily") {
    if (!dueAt) {
      dueAt = nextNine(now, now.getHours() < 9 ? 0 : 1);
    } else {
      while (dueAt <= now) {
        dueAt = addDays(dueAt, 1);
      }
    }
  } else if (!dueAt) {
    dueAt = nextNine(now, 7);
  } else {
    dueAt = weeklyStart(dueAt, base.fromClock, now);
  }

  return {
    dueAt,
    text: strip(base.text, [daily?.[0], weekly?.[0]].filter(Boolean)),
    repeat,
  };
};

const DURATION = /\b(\d+|an?|one|two|three|four|five|ten|fifteen|twenty|thirty)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i;

// "10 minutes", "an hour", "2 days" -> a positive number of minutes.
export const parseSnoozeMinutes = (text) => {
  const raw = String(text ?? "");

  if (/\bhalf\s+an?\s+hour\b/i.test(raw)) {
    return 30;
  }

  const match = raw.match(DURATION);

  if (!match) {
    return null;
  }

  const amount = toAmount(match[1]);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round((amount * unitMs(match[2])) / MINUTE);
};

export const dueLabel = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
