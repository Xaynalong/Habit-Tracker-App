import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type RewardKind = 'daily' | 'volumeTick' | 'challenge';

type Props = {
  event: { id: number; kind: RewardKind; message?: string } | null;
  onDone: () => void;
};

const DAILY_PARTICLES = ['✨', '⭐', '🎉', '💫', '🌟'];
const VOLUME_PARTICLES = ['✨', '💧'];
const CHALLENGE_PARTICLES = ['🎉', '🏆', '⭐', '🎊', '🥳', '✨'];

const PARTICLE_COUNTS: Record<RewardKind, number> = {
  daily: 18,
  volumeTick: 6,
  challenge: 36,
};

export default function CelebrationOverlay({ event, onDone }: Props) {
  if (!event) return null;
  return <Burst key={event.id} event={event} onDone={onDone} />;
}

function Burst({ event, onDone }: { event: NonNullable<Props['event']>; onDone: () => void }) {
  const { width, height } = Dimensions.get('window');
  const palette =
    event.kind === 'challenge'
      ? CHALLENGE_PARTICLES
      : event.kind === 'volumeTick'
      ? VOLUME_PARTICLES
      : DAILY_PARTICLES;
  const count = PARTICLE_COUNTS[event.kind];
  const isChallenge = event.kind === 'challenge';
  const isTick = event.kind === 'volumeTick';
  const duration = isChallenge ? 1900 : isTick ? 700 : 1200;
  const card = useSharedValue(0);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        emoji: palette[i % palette.length],
        startX: width / 2 + (Math.random() - 0.5) * (isChallenge ? 60 : 30),
        endX: width / 2 + (Math.random() - 0.5) * (isChallenge ? width * 0.95 : width * 0.6),
        endY: height * (isChallenge ? 0.95 : 0.85),
        delay: Math.random() * (isChallenge ? 300 : 100),
        size: (isChallenge ? 28 : isTick ? 18 : 22) + Math.random() * 10,
        rot: (Math.random() - 0.5) * 720,
      })),
    [count, palette, width, height, isChallenge, isTick]
  );

  useEffect(() => {
    card.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withDelay(
        Math.max(0, duration - 600),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
      )
    );
    const t = setTimeout(onDone, duration);
    return () => {
      clearTimeout(t);
      cancelAnimation(card);
    };
  }, [card, duration, onDone]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ scale: 0.9 + card.value * 0.1 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Particle key={i} {...p} duration={duration - 100} />
      ))}
      {isChallenge && event.message ? (
        <Animated.View style={[styles.cardWrap, cardStyle]} pointerEvents="none">
          <Text style={styles.cardEmoji}>🏆</Text>
          <Text style={styles.cardTitle}>Challenge complete!</Text>
          <Text style={styles.cardSub}>{event.message}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function Particle({
  emoji,
  startX,
  endX,
  endY,
  delay,
  size,
  rot,
  duration,
}: {
  emoji: string;
  startX: number;
  endX: number;
  endY: number;
  delay: number;
  size: number;
  rot: number;
  duration: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const { height } = Dimensions.get('window');
  const startY = height * 0.35;

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
    opacity.value = withSequence(
      withDelay(delay, withTiming(1, { duration: 80 })),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(opacity);
    };
  }, [progress, opacity, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = startX + (endX - startX) * progress.value;
    const y = startY + (endY - startY) * progress.value;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${progress.value * rot}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, animatedStyle]} pointerEvents="none">
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    left: -16,
    top: -16,
  },
  cardWrap: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    backgroundColor: '#2f95dc',
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
    maxWidth: '85%',
  },
  cardEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 4,
  },
  cardSub: {
    color: '#fff',
    opacity: 0.92,
    fontSize: 14,
    textAlign: 'center',
  },
});
