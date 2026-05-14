# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — launch Expo dev server (then press `i` / `a` / `w` for iOS / Android / web)
- `npm run ios` / `npm run android` / `npm run web` — start directly on a platform
- `npm run lint` — `expo lint` (flat ESLint config: `eslint-config-expo` + `eslint-config-prettier`; ignores `dist/*`; registers Jest globals for `__tests__/` and `*.{test,spec}` files even though no runner is wired up)
- `npm run format` / `npm run format:check` — Prettier write / check
- No test runner is wired up. `package.json` has no `test` script and there are no test files in the tree.

## Architecture

Expo SDK 54 / React Native 0.81 / React 19, **New Architecture enabled** (`app.json` → `newArchEnabled: true`). Entry point is `expo-router/entry`; routing is file-based.

**Path alias:** `@/*` resolves to the repo root (see `tsconfig.json`). Use `@/components/...`, `@/lib/...` rather than relative paths.

**Routing layout (`app/`):**
- `app/_layout.tsx` — root. Loads fonts via `expo-font` and holds the splash screen open until fonts load, then mounts the provider stack and a `<Stack>` with three routes: `(tabs)` (`headerShown: false`), `onboarding` (`headerShown: false`), and `habit/[id]` (titled "Habit"). Inside the stack it also renders two invisible siblings: `<OnboardingGate>` redirects to `/onboarding` when `settings.onboarded` is false (and back to `/` once flipped); `<ReminderSync>` re-runs `rescheduleReminders` whenever settings or habits change.
- `app/(tabs)/_layout.tsx` — four tabs: `index` ("Today"), `habits` ("Habits"), `progress` ("Progress"), `settings` ("Settings"). FontAwesome tab icons.
- `app/habit/[id].tsx` — habit detail screen (dynamic route).
- `app/onboarding.tsx` — horizontal 4-page paged ScrollView walking the user through welcome → how-it-works → create first habit → start challenge + enable reminders. Calls `update({ onboarded: true })` at the end.
- `app/+not-found.tsx`, `app/+html.tsx` — Expo Router special routes. There is no `modal` route.
- Typed routes are enabled (`app.json` → `experiments.typedRoutes: true`), so `<Link href="/habits">` is type-checked against the route tree.

**Provider stack (order matters):** `SettingsProvider` → `HabitsProvider` → `RewardProvider` → `ThemedApp` (which renders `@react-navigation/native`'s `ThemeProvider` plus the `<Stack>`). The order is load-bearing:
- `useColorScheme` reads `useSettings()` (so it can honor a manual `theme: 'light' | 'dark' | 'system'` override). Anything using `components/Themed` `Text`/`View` — including `ThemedApp` itself — must therefore be inside `SettingsProvider`.
- `RewardProvider` reads `useSettings()` to gate haptics/sound and renders the `<CelebrationOverlay>` globally.
- `HabitsProvider` is independent of settings but lives inside it so callers can use both in any screen.

**State — habits (`lib/HabitsContext.tsx`):** Single source of truth for habits and challenges. Persists to AsyncStorage under `habits.v2` (auto-migrates from legacy `habits.v1`, which lacked `type`) and `challenges.v1`. Two habit shapes share the same `Habit` type discriminated by `type`:
- `'checkoff'` — one tap per day. `toggleToday(id)` adds/removes `todayKey()` from `completions`.
- `'volume'` — incremental, with a `target` (default 3, clamped ≥1) and a `volumeLog: { date, count }[]`. `incrementVolume(id, delta)` clamps count to `[0, target*4]`. Crossing the target upward adds today to `completions` (and fires a `volumeTarget` event); crossing back below removes it. Sub-target ticks fire `volumeTick`.

Both mutating calls return a `CompletionEvent | null` and, on completion, pass the new completions to `evaluateChallenge`, which may attach `completedChallenge`. Screens use the returned event to decide which reward to `fire()`.

Date keys are local-time `YYYY-MM-DD` strings from `dateKey()` / `todayKey()` / `addDays()` — **do not** swap in ISO/UTC formatting or streaks and challenge windows will drift across timezones. `streak()` allows yesterday-but-not-today (so users keep the streak before checking in) but breaks if neither today nor yesterday is completed. `bestStreak()` scans the full sorted completion history.

**Challenges:** A `Challenge` is `{ habitId, lengthDays, startedAt, status }`. `startChallenge(habitId, n)` replaces any existing active challenge for that habit. `evaluateChallenge` flips to `completed` when every day from `startedAt` through today is in `completions`, or to `failed` once today is past `startedAt + lengthDays - 1`. `forceCompleteChallenge` (dev/test helper) rewinds `startedAt` so today is the last day and back-fills completions/volume.

**State — settings (`lib/SettingsContext.tsx`):** Persists `Settings` at `settings.v1`. Fields: `onboarded`, `haptics`, `sound`, `notificationsEnabled`, `defaultReminderTime` (HH:mm; per-habit `reminderTime` overrides), `devMode`, `theme: 'system' | 'light' | 'dark'`. Migrates `morningReminder` → `defaultReminderTime` if present.

**Reward loop (`lib/reward.tsx`):** `useReward().fire(kind, message?)` with kind `'daily' | 'volumeTick' | 'challenge'`. Triggers (each gated on the corresponding setting):
- Haptics via `expo-haptics` (success / selection / double-heavy-impact).
- Audio via `expo-audio` — `chime.wav` for daily/tick, `fanfare.wav` for challenge. Sounds live in `assets/sounds/` and are also registered with `expo-notifications` in `app.json`.
- A `<CelebrationOverlay>` rendered once at the `RewardProvider` root.

**Notifications (`lib/notifications.ts`):** Wraps `expo-notifications` with a no-op fallback on web. `rescheduleReminders(settings, habits)` cancels everything and re-schedules a `DAILY` trigger per habit (skipping habits with `reminderEnabled === false`) using `reminderTimeFor(habit, settings)`. `<ReminderSync>` in `_layout.tsx` calls this whenever settings or habits change. iOS `NSUserNotificationsUsageDescription` is set in `app.json`.

**Native-only modules pattern:** `expo-haptics`, `expo-audio`, and `expo-notifications` are loaded via `require()` inside a `try { ... } catch {}` guarded by `Platform.OS !== 'web'` (see `lib/reward.tsx` and `lib/notifications.ts`). Mirror this when adding other native-only deps so the web build keeps compiling.

**Theming (`components/Themed.tsx` + `constants/Colors.ts`):** Re-exports `Text` / `View` that pull `color` / `backgroundColor` from the active scheme. **Import `Text` / `View` from `@/components/Themed`** in screens rather than `react-native` directly so dark mode and the manual `settings.theme` override work. `useColorScheme` has a `.web.ts` variant that gates the OS scheme behind a hydration flag so SSR and first client render agree; `useClientOnlyValue` similarly splits native vs. web.

**Web target:** Metro bundler with `output: "static"` (`app.json`). React Native Web is in the dep tree, so any new screen should work on web — keep platform-specific code behind `Platform.OS` checks or `.web.ts(x)` files.

## Conventions

- Prettier (`.prettierrc`): single quotes, semicolons, 100-col, trailing commas (es5), 2-space indent, `arrowParens: 'always'`. Match this in new files.
- TypeScript `strict` is on. Prefer typed component props and exported types (see `Habit`, `Challenge`, `CompletionEvent` in `lib/HabitsContext.tsx`).
- Screens own their `StyleSheet.create({...})` block at the bottom of the file — match that pattern rather than introducing a shared style system.
