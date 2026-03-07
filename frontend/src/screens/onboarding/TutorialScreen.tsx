import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  type ViewToken,
} from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    title: 'Talk it through',
    body: 'Each partner privately shares their perspective through a guided AI interview. No pressure, no interruptions.',
  },
  {
    title: 'Understand together',
    body: 'AI analyzes both sides and surfaces shared truths, blind spots, and deeper patterns you might not see.',
  },
  {
    title: 'Reconnect with care',
    body: 'A guided conversation helps you and your partner bridge the gap — with commitments you both agree on.',
  },
];

export function TutorialScreen({ onComplete }: TutorialScreenProps) {
  const colors = useThemeColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    }
  }, [isLast, activeIndex, onComplete]);

  return (
    <SafeArea>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.slideBody, { color: colors.textSecondary }]}>
                {item.body}
              </Text>
            </View>
          )}
        />

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : colors.surface2,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title={isLast ? "Let's go" : 'Next'}
            onPress={handleNext}
            style={styles.nextBtn}
          />
          {!isLast && (
            <Button title="Skip" onPress={onComplete} variant="ghost" />
          )}
        </View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideBody: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  nextBtn: {
    marginBottom: 8,
  },
});
