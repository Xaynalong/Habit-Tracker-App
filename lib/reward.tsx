import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import CelebrationOverlay from '@/components/CelebrationOverlay';
import { useSettings } from '@/lib/SettingsContext';

export type RewardKind = 'daily' | 'volumeTick' | 'challenge';

type RewardEvent = {
  id: number;
  kind: RewardKind;
  message?: string;
};

type RewardContextValue = {
  fire: (kind: RewardKind, message?: string) => void;
};

const RewardContext = createContext<RewardContextValue | null>(null);

let Haptics: typeof import('expo-haptics') | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Haptics = require('expo-haptics');
  } catch {
    Haptics = null;
  }
}

let useAudioPlayerSafe: ((source: number) => { play: () => void; seekTo: (n: number) => Promise<void> } | null) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoAudio = require('expo-audio');
  useAudioPlayerSafe = expoAudio.useAudioPlayer;
} catch {
  useAudioPlayerSafe = null;
}

function triggerHaptic(kind: RewardKind) {
  if (!Haptics) return;
  try {
    if (kind === 'daily') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === 'volumeTick') {
      Haptics.selectionAsync();
    } else if (kind === 'challenge') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics?.impactAsync(Haptics!.ImpactFeedbackStyle.Heavy), 120);
    }
  } catch {
    // ignore haptic errors
  }
}

export function RewardProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [event, setEvent] = useState<RewardEvent | null>(null);
  const counterRef = useRef(0);

  const chime = useAudioPlayerSafe
    ? useAudioPlayerSafe(require('@/assets/sounds/chime.wav'))
    : null;
  const fanfare = useAudioPlayerSafe
    ? useAudioPlayerSafe(require('@/assets/sounds/fanfare.wav'))
    : null;

  const playSound = useCallback(
    (kind: RewardKind) => {
      if (!settings.sound) return;
      try {
        const target = kind === 'challenge' ? fanfare : chime;
        if (!target) return;
        target.seekTo(0).catch(() => {});
        target.play();
      } catch {
        // ignore audio errors (web autoplay restrictions, etc.)
      }
    },
    [chime, fanfare, settings.sound]
  );

  const fire = useCallback(
    (kind: RewardKind, message?: string) => {
      counterRef.current += 1;
      const id = counterRef.current;
      setEvent({ id, kind, message });
      if (settings.haptics) triggerHaptic(kind);
      playSound(kind);
    },
    [playSound, settings.haptics]
  );

  const value = useMemo<RewardContextValue>(() => ({ fire }), [fire]);

  return (
    <RewardContext.Provider value={value}>
      {children}
      <CelebrationOverlay event={event} onDone={() => setEvent(null)} />
    </RewardContext.Provider>
  );
}

export function useReward(): RewardContextValue {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error('useReward must be used inside <RewardProvider>');
  return ctx;
}
