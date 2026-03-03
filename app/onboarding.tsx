import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withTiming,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography } from '../src/theme';
import { H1, Body, Button } from '../src/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingPage {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: 'zap',
    title: 'Welcome to Maker',
    subtitle: 'Build mini-apps using just your words',
  },
  {
    icon: 'cpu',
    title: 'Powered by AI',
    subtitle: 'Describe what you want, AI builds it',
  },
  {
    icon: 'box',
    title: 'Ready to start?',
    subtitle: 'Create your first app in minutes',
  },
];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(pageIndex);
  };

  const handleSkip = () => {
    router.replace('/(main)/(tabs)/home');
  };

  const handleGetStarted = () => {
    router.replace('/(main)/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.skipContainer}>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Pages */}
      <AnimatedScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {PAGES.map((page, index) => (
          <PageContent
            key={index}
            page={page}
            index={index}
            scrollX={scrollX}
            isLast={index === PAGES.length - 1}
            onGetStarted={handleGetStarted}
          />
        ))}
      </AnimatedScrollView>

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {PAGES.map((_, index) => (
          <DotIndicator key={index} index={index} scrollX={scrollX} />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Page Content with fade/scale animation
// ---------------------------------------------------------------------------

function PageContent({
  page,
  index,
  scrollX,
  isLast,
  onGetStarted,
}: {
  page: OnboardingPage;
  index: number;
  scrollX: SharedValue<number>;
  isLast: boolean;
  onGetStarted: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [30, 0, 30],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  return (
    <View style={styles.page}>
      <Animated.View style={[styles.pageInner, animatedStyle]}>
        <LinearGradient
          colors={[colors.primary[100], colors.primary[50]]}
          style={styles.illustrationCircle}
        >
          <Feather name={page.icon} size={48} color={colors.primary[500]} />
        </LinearGradient>
        <H1 style={styles.pageTitle}>{page.title}</H1>
        <Body style={styles.pageSubtitle}>{page.subtitle}</Body>
        {isLast && (
          <Button
            title="Get Started"
            onPress={onGetStarted}
            size="lg"
            style={styles.getStartedButton}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated Dot Indicator
// ---------------------------------------------------------------------------

function DotIndicator({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    const backgroundColor =
      width > 12 ? colors.primary[500] : colors.neutral[300];

    return {
      width,
      opacity,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  skipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    color: colors.text.secondary,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  pageInner: {
    alignItems: 'center',
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  pageTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pageSubtitle: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
  },
  getStartedButton: {
    paddingHorizontal: spacing['4xl'],
    marginTop: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
