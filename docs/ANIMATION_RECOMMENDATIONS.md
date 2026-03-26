# Animation Recommendations: Splash Screen & Connected Screen

> Relate App -- AI Relationship Mediator
> Design philosophy: "Warm therapy room" -- calm, safe, intimate
> Stack: react-native-reanimated + expo-linear-gradient + react-native-svg (all installed)
> Date: 2026-03-24

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Splash Screen -- 3 Concepts](#splash-screen)
   - A. Breathing Orb with Concentric Ripples
   - B. Two Shapes Drifting Together
   - C. Warm Particle Field with Text Reveal
3. [Connected Screen -- 3 Concepts](#connected-screen)
   - A. Magnetic Circles Merging into One
   - B. Golden Thread Connection
   - C. Synchronized Heartbeat Pulse
4. [Implementation Notes](#implementation-notes)
5. [Recommendation Summary](#recommendation-summary)

---

## Design Principles

All animations in Relate follow a strict emotional vocabulary:

- **Safe**: No sudden movements, no bouncing, no aggressive easing. Everything breathes.
- **Warm**: Orange-tinted (#E07832 family), soft shadows, no harsh whites or blues.
- **Alive**: Subtle continuous motion that says "this space is present with you."
- **Intimate**: Small, close movements -- not theatrical. Like a candle flame, not fireworks.

Easing language:
- `Easing.inOut(Easing.ease)` -- the "breath" easing (used in TypingIndicator)
- `Easing.out(Easing.cubic)` -- the "settling" easing (used in SplashScreen fade-ins)
- Spring with `damping: 12-15, stiffness: 180-200` -- the "gentle land" spring

Timing language:
- 1500-3000ms for ambient loops (breathing, floating)
- 600-800ms for entrance animations
- 200-400ms for micro-interactions

---

## Splash Screen

**Current state**: Logo "relate" and tagline "finally understand each other" fade in with upward slide over a hero gradient (`#E07832 -> #C45A1A -> #8B3A1A`). Buttons fade in last. Functional but static once the entrance completes -- the screen goes dead.

**Goal**: Make the splash feel like stepping into a warm, living space. The animation should run continuously (not just on entrance) so the screen feels alive even if the user pauses to read.

---

### Concept A: Breathing Orb with Concentric Ripples

**Visual description**

A single warm orb (60-80px diameter) sits centered above the "relate" text. It pulses gently like a slow breath -- expanding and contracting on a 3-second cycle. Two concentric ring borders surround it, each slightly delayed (200ms, 400ms) creating a ripple-out effect. The orb glows with `#F0A060` (orangeLight) and the rings use progressively more transparent orange borders (`#F5C49A`, `#FBE8D8`). The entire orb group has a subtle vertical float (translateY oscillation of +/-4px over 4 seconds).

On mount, the orb scales from 0 to 1 with a spring, then transitions into the continuous breathing loop. The text fades in 400ms after the orb appears. The tagline fades in 200ms after that. This creates a sequence: orb blooms -> logo appears -> tagline appears -> buttons rise.

**Emotional tone**

Meditative, centering. The breathing rhythm unconsciously encourages the user to slow their own breathing. This is the same pattern used by Calm and Headspace for their session screens. It says: "This is a calm space. Take your time."

**Implementation approach**

```
SharedValues:
  - orbScale: useSharedValue(0)
  - ring1Scale, ring2Scale: useSharedValue(0.85)
  - ring1Opacity, ring2Opacity: useSharedValue(0.4)
  - floatY: useSharedValue(0)
  - logoOpacity, taglineOpacity, buttonsOpacity (existing)

Mount sequence:
  1. orbScale: withSpring(1, { damping: 14, stiffness: 180 })
  2. After 600ms delay, transition orbScale into breathing loop:
     withRepeat(
       withSequence(
         withTiming(1.12, { duration: 1500, easing: inOut(ease) }),
         withTiming(0.88, { duration: 1500, easing: inOut(ease) })
       ), -1
     )
  3. ring1/ring2 follow same pattern with 200ms/400ms stagger
  4. floatY: withRepeat(withSequence(
       withTiming(-4, { duration: 2000, easing: inOut(ease) }),
       withTiming(4, { duration: 2000, easing: inOut(ease) })
     ), -1, true)
  5. Logo, tagline, buttons fade in with existing timing (shifted +200ms)

Rendering:
  - Orb: Animated.View with borderRadius, backgroundColor orangeLight
  - Ring1: Animated.View with borderWidth: 1.5, borderColor orangeGlow
  - Ring2: Animated.View with borderWidth: 1, borderColor orangeTint
  - All positioned absolute within a 120x120 container
  - Sits between the gradient background and the logo text

No new dependencies needed.
```

**Complexity**: Simple. Reuses the exact breathing pattern from TypingIndicator.tsx (already proven in the codebase). Approximately 40 lines of new animation code, all using patterns already established in the app.

---

### Concept B: Two Shapes Drifting Together

**Visual description**

Two soft-edged circles start on opposite sides of the screen center -- one orange-tinted (#E07832 at 30% opacity, ~70px), one warm-white (#FAF7F4 at 60% opacity, ~70px). They drift slowly toward each other on a continuous loop, overlapping in the center for a moment where they create a brighter intersection (additive blending via overlapping semi-transparent fills), then gently drifting apart again. The full cycle takes about 6 seconds. The overlap zone has a soft glow effect (a third, smaller circle at 15% opacity that scales up when the two shapes are closest).

The "relate" logo sits directly at the convergence point. The tagline "finally understand each other" is positioned below. Text fades in on the second cycle (after about 6 seconds) so the user watches one full "meeting" before reading the words.

**Emotional tone**

Narrative and metaphorical. Two separate entities finding each other, touching, separating, finding each other again -- a visual metaphor for the entire app's purpose. More emotionally evocative than Concept A. Creates a small "aha" moment when the user connects the animation to the tagline.

**Implementation approach**

```
SharedValues:
  - circleAX: useSharedValue(-40)    // starts left of center
  - circleBX: useSharedValue(40)     // starts right of center
  - glowScale: useSharedValue(0.3)
  - glowOpacity: useSharedValue(0)
  - logoOpacity: useSharedValue(0)
  - taglineOpacity: useSharedValue(0)

Animation loop:
  circleAX: withRepeat(
    withSequence(
      withTiming(10, { duration: 3000, easing: inOut(ease) }),   // drift right
      withTiming(-40, { duration: 3000, easing: inOut(ease) })   // drift back
    ), -1
  )
  circleBX: withRepeat(
    withSequence(
      withTiming(-10, { duration: 3000, easing: inOut(ease) }),  // drift left
      withTiming(40, { duration: 3000, easing: inOut(ease) })    // drift back
    ), -1
  )

  // Glow peaks when circles overlap (use useDerivedValue):
  glowOpacity = useDerivedValue(() => {
    const distance = Math.abs(circleAX.value - circleBX.value);
    return interpolate(distance, [80, 20], [0, 0.4], Extrapolation.CLAMP);
  })
  glowScale = useDerivedValue(() => {
    const distance = Math.abs(circleAX.value - circleBX.value);
    return interpolate(distance, [80, 20], [0.3, 1.0], Extrapolation.CLAMP);
  })

Delayed text reveal:
  logoOpacity: withDelay(5500, withTiming(1, { duration: 800 }))
  taglineOpacity: withDelay(6200, withTiming(1, { duration: 700 }))

Rendering:
  - Two Animated.View circles (borderRadius: 35, absolute positioned)
  - Center glow: Animated.View circle (borderRadius: 25, orangeGlow fill)
  - All wrapped in a centered container above the text block
  - LinearGradient background unchanged

No new dependencies needed.
```

**Complexity**: Medium. The `useDerivedValue` for glow intensity adds a reactive calculation, but it is a well-documented reanimated pattern. Approximately 70 lines of animation code. The visual tuning (circle sizes, distances, opacity levels) will require iteration on-device to get the overlap "sweet spot" right.

---

### Concept C: Warm Particle Field with Text Reveal

**Visual description**

8-12 small circles (4-8px diameter) in varying shades of the orange family (#F0A060, #F5C49A, #FBE8D8, #E07832 at 20-40% opacity) float gently across the gradient background. Each particle has its own randomized path: a slow translateX/translateY drift and a subtle opacity pulse. Movement speed is very slow (one full traverse takes 8-15 seconds per particle). Particles near the center are slightly brighter, creating a natural vignette effect.

The "relate" text appears letter by letter, each letter fading in from 0 opacity and sliding up 8px, staggered 80ms apart (total: ~500ms for 6 letters). After the full word appears, a thin horizontal line (2px, orangeGlow) grows from center outward below the logo (200ms). Then the tagline fades in below the line.

**Emotional tone**

Ethereal, warm, alive. The particles suggest a living, breathing environment -- like dust motes in sunlight through a window. The letter-by-letter reveal adds a sense of intentionality to the brand name, asking the user to read it slowly. This is the most premium-feeling option but also the most complex.

**Implementation approach**

```
Constants:
  PARTICLE_COUNT = 10
  PARTICLES = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: 4 + Math.random() * 4,
    startX: Math.random() * SCREEN_WIDTH,
    startY: Math.random() * SCREEN_HEIGHT * 0.6,
    color: pick from [orangeLight, orangeGlow, orangeTint, orangeMid+0.2alpha],
    driftX: (Math.random() - 0.5) * 60,   // px of horizontal drift
    driftY: (Math.random() - 0.5) * 40,   // px of vertical drift
    duration: 8000 + Math.random() * 7000, // 8-15s per cycle
    opacityMin: 0.15 + Math.random() * 0.15,
    opacityMax: 0.35 + Math.random() * 0.15,
  }))

SharedValues (per particle):
  - translateX: useSharedValue(particle.startX)
  - translateY: useSharedValue(particle.startY)
  - opacity: useSharedValue(particle.opacityMin)

  Each particle runs its own withRepeat loop with its own duration.

Letter-by-letter text reveal:
  LETTERS = ['r', 'e', 'l', 'a', 't', 'e']
  For each letter:
    - opacity: withDelay(1000 + i * 80, withTiming(1, { duration: 300 }))
    - translateY: withDelay(1000 + i * 80, withTiming(0, { duration: 300 }))
  Using 6 individual Animated.Text elements in a flexDirection: 'row' container.

Horizontal line:
  - scaleX: withDelay(1600, withTiming(1, { duration: 200 }))
  - Start with scaleX: 0 and a fixed width (say 80px) centered via transform origin

Rendering:
  - Particles: Array.map of Animated.View circles, position: absolute
  - Letter row: flexDirection: 'row' container with 6 Animated.Text elements
  - Underline: Animated.View with height: 2, bg orangeGlow, scaleX animated
  - All on top of existing LinearGradient background

No new dependencies needed. However, 10 separate animation loops may cause
a brief stutter on lower-end Android devices during mount. Mitigate by
staggering particle animation starts by 200ms each.
```

**Complexity**: Complex. 10 independent particle animations + 6 letter animations + line animation = 17+ SharedValues. Performance should be tested on a low-end Android device. The letter-by-letter reveal requires splitting the logo text into individual characters, which changes the typography rendering slightly (kerning may need manual adjustment via `letterSpacing` or per-character `marginRight`). Approximately 120-150 lines of animation code.

---

## Connected Screen

**Current state**: Two avatar circles (initials) spring in from scale 0, a heart element appears between them, then text and a stats card fade in below. Functional and clear, but feels like a standard "success" screen rather than a meaningful emotional moment.

**Goal**: This is arguably the most emotionally significant moment in the entire app -- two real people have just linked their accounts to work on their relationship. The animation should honor that moment. It should feel like a gentle celebration, not a party -- more "relief and hope" than "confetti and fireworks."

---

### Concept A: Magnetic Circles Merging into a Shared Ring

**Visual description**

Two circles (80px each) start at the far left and far right of the screen, colored with the partner identity system: Partner A in orange (#E07832 border, orangeTint fill) and Partner B in blue-gray (#7B8FA6 border, rgba(123,143,166,0.15) fill). Each has the partner's initial letter inside.

On mount, they begin drifting toward center -- slowly at first, then accelerating (quadratic easing). As they approach (within 40px of each other), a soft glow appears between them (orangeGlow, scaling up). When they overlap, the two circles smoothly merge: their borders blend into a single larger ring (100px diameter) with a gradient border effect (orange on the left half, blue-gray on the right). The initials reposition to sit side by side within the ring. A soft pulse radiates outward from the merged ring (two concentric expanding circles that fade out, like a stone dropped in water).

After the merge completes (~1.5s), the ring settles with a gentle breathing pulse. The title "You're connected." fades in below, followed by the subtitle and stats card.

**Emotional tone**

Gravitational, inevitable, hopeful. The acceleration as the circles approach each other suggests magnetic attraction -- these two people are drawn together. The merge moment is the climax, and the expanding pulse is the emotional release. The shared ring at the end represents unity without loss of identity (the two colors remain visible). This is the most symbolically rich option.

**Implementation approach**

```
SharedValues:
  - circleAX: useSharedValue(-SCREEN_WIDTH * 0.35)
  - circleBX: useSharedValue(SCREEN_WIDTH * 0.35)
  - circleAOpacity: useSharedValue(1)
  - circleBOpacity: useSharedValue(1)
  - mergedRingScale: useSharedValue(0)
  - mergedRingOpacity: useSharedValue(0)
  - pulse1Scale: useSharedValue(0.5)
  - pulse1Opacity: useSharedValue(0)
  - pulse2Scale: useSharedValue(0.5)
  - pulse2Opacity: useSharedValue(0)
  - breatheScale: useSharedValue(1)
  - titleOpacity: useSharedValue(0)

Mount sequence (all triggered in useEffect):
  Phase 1 -- Drift (0-1200ms):
    circleAX: withTiming(0, { duration: 1200, easing: Easing.in(Easing.quad) })
    circleBX: withTiming(0, { duration: 1200, easing: Easing.in(Easing.quad) })

  Phase 2 -- Merge (1200-1600ms):
    circleAOpacity: withDelay(1100, withTiming(0, { duration: 300 }))
    circleBOpacity: withDelay(1100, withTiming(0, { duration: 300 }))
    mergedRingScale: withDelay(1200, withSpring(1, { damping: 12, stiffness: 180 }))
    mergedRingOpacity: withDelay(1200, withTiming(1, { duration: 300 }))
    Trigger haptic: successTap() at 1200ms (via setTimeout or runOnJS)

  Phase 3 -- Pulse ripple (1400-2200ms):
    pulse1Scale: withDelay(1400, withTiming(2.5, { duration: 800, easing: out(cubic) }))
    pulse1Opacity: withDelay(1400, withSequence(
      withTiming(0.3, { duration: 100 }),
      withTiming(0, { duration: 700 })
    ))
    pulse2Scale: withDelay(1600, withTiming(2.5, { duration: 800, easing: out(cubic) }))
    pulse2Opacity: withDelay(1600, withSequence(
      withTiming(0.25, { duration: 100 }),
      withTiming(0, { duration: 700 })
    ))

  Phase 4 -- Settle into breathing (2200ms+):
    breatheScale: withDelay(2200, withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: inOut(ease) }),
        withTiming(0.95, { duration: 2000, easing: inOut(ease) })
      ), -1
    ))

  Phase 5 -- Text entrance (2000ms+):
    titleOpacity: withDelay(2000, withTiming(1, { duration: 600 }))
    (Stats card and button follow with existing FadeInDown pattern)

Rendering:
  - circleA, circleB: Animated.View with translateX, opacity
  - mergedRing: Animated.View (100px, borderRadius 50, border with
    two half-borders simulated via two overlapping semicircle Views
    or a single border with the dominant partner's color)
  - pulse1, pulse2: Animated.View circles with scale/opacity
  - Initials: Text elements that reposition into merged ring
  - Title, stats, button: existing FadeInDown layout, delayed

Alternative for gradient border: Use react-native-svg with two
Arc paths (one orange, one blue-gray) forming a circle. Animate
their stroke dashoffset to "draw in" the ring.
```

**Complexity**: Medium-high. The merge transition (cross-fading two circles into one ring) requires careful opacity/scale choreography and on-device tuning. The gradient-border ring is the trickiest visual element -- a simplified approach is to use a solid orangeMid border with a small blue-gray accent dot, rather than a true split-color border. Approximately 100 lines of animation code.

---

### Concept B: Golden Thread Connection

**Visual description**

Two avatar circles appear on screen with a spring entrance (existing behavior), positioned about 160px apart. Between them, a thin golden line (2px, color #F5C49A) begins drawing from the left avatar toward the right, using a horizontal Animated.View that grows in width from 0 to the full gap distance. The line has a slight curve suggestion (achieved by placing a tiny circle midpoint that scales up as the line reaches it).

When the line connects to the second avatar, both avatars pulse once (scale 1 -> 1.08 -> 1, 300ms), and a warm glow flares at the connection point (the midpoint circle scales to ~20px with orangeGlow fill, then settles to 12px). The glow remains as a small persistent element -- a visual "bond" between the two.

Below, the text "You're connected." types out one character at a time (30ms per character, monospace-feeling rhythm), giving it weight and intentionality.

**Emotional tone**

Deliberate, tender, hopeful. The thread metaphor evokes the "red thread of fate" concept from East Asian tradition -- an invisible thread that connects two people destined to find each other. The typing effect for the title makes the moment feel spoken rather than displayed. Less dramatic than Concept A but more emotionally nuanced.

**Implementation approach**

```
SharedValues:
  - avatarAScale: useSharedValue(0)
  - avatarBScale: useSharedValue(0)
  - lineWidth: useSharedValue(0)
  - midpointScale: useSharedValue(0)
  - midpointOpacity: useSharedValue(0)
  - avatarPulse: useSharedValue(1)
  - glowScale: useSharedValue(0)

Constants:
  GAP_WIDTH = 160  // distance between avatar centers minus avatar radii
  LINE_DRAW_DURATION = 1000

Mount sequence:
  Phase 1 -- Avatars appear (0-600ms):
    avatarAScale: withDelay(200, withSpring(1, { damping: 12, stiffness: 200 }))
    avatarBScale: withDelay(400, withSpring(1, { damping: 12, stiffness: 200 }))

  Phase 2 -- Thread draws (700-1700ms):
    lineWidth: withDelay(700, withTiming(GAP_WIDTH, {
      duration: LINE_DRAW_DURATION,
      easing: Easing.inOut(Easing.cubic)
    }))

  Phase 3 -- Connection moment (1700-2100ms):
    avatarPulse: withDelay(1700, withSequence(
      withTiming(1.08, { duration: 150 }),
      withSpring(1, { damping: 15 })
    ))
    midpointScale: withDelay(1600, withSpring(1, { damping: 10, stiffness: 160 }))
    midpointOpacity: withDelay(1600, withTiming(1, { duration: 200 }))
    glowScale: withDelay(1700, withSequence(
      withSpring(1.5, { damping: 8 }),
      withSpring(1, { damping: 12 })
    ))
    Haptic: successTap() at 1700ms

  Phase 4 -- Text type-out (2100ms+):
    "You're connected." typed character-by-character
    Use a state counter incremented via setInterval(30ms) or
    a single withTiming that drives a useDerivedValue slicing
    the string. The latter keeps it on the UI thread:

    charProgress: withDelay(2100, withTiming(19, {
      duration: 19 * 30,  // 570ms for 19 characters
      easing: Easing.linear
    }))
    displayText = useDerivedValue(() =>
      "You're connected.".slice(0, Math.round(charProgress.value))
    )
    Render via <ReText text={displayText} /> from reanimated

  Phase 5 -- Settle:
    Midpoint glow gets a subtle breathing pulse (scale 0.9-1.1, 3s cycle)
    Stats card and button use existing FadeInDown

Rendering:
  - avatarA, avatarB: existing avatar Views with animated scale
  - Thread line: Animated.View, height: 2, bg orangeGlow, width animated
    Positioned with left: avatarA.right, top: verticalCenter
  - Midpoint: Animated.View circle (12px settled), bg orangeGlow
  - Glow: larger Animated.View circle (20px), bg orangeTint, behind midpoint
  - Text: ReText (from react-native-reanimated) or Animated.Text with
    derived slice value

Potential issue: ReText requires importing from 'react-native-reanimated'.
If unavailable, fall back to a JS-thread setInterval approach for the
typewriter (minimal performance impact for 19 characters).
```

**Complexity**: Medium. The thread-drawing is a simple width animation. The typewriter effect adds a small complexity wrinkle (ReText vs JS state). The visual result is elegant without being technically demanding. Approximately 80 lines of animation code.

---

### Concept C: Synchronized Heartbeat Pulse

**Visual description**

Two avatar circles appear in the existing position with their spring entrance. Once both are visible, a heart icon (or a simple heart shape built from two rotated squares with border-radius, colored orangeMid at 30% opacity) appears between them and begins pulsing with a heartbeat rhythm: two quick beats followed by a pause (like a real heartbeat: lub-DUB...lub-DUB...).

Beat 1: scale 1 -> 1.15 (100ms), scale 1.15 -> 1 (100ms)
Beat 2: scale 1 -> 1.25 (100ms), scale 1.25 -> 1 (150ms)
Pause: 1200ms
Repeat.

After 2 full heartbeat cycles (~3.2 seconds), the heart scales up slightly (to 1.3) and holds, emitting three concentric rings that expand outward and fade (the "radiating love" moment). The rings use the orange family: innermost #E07832 at 20%, middle #F0A060 at 15%, outermost #F5C49A at 10%.

The title "You're connected." fades in after the rings, and the heart settles into a gentler single-beat pulse (scale 1 -> 1.08 -> 1, 2s cycle) that continues as ambient animation while the user reads.

**Emotional tone**

Visceral, alive, intimate. A heartbeat is the most universally human rhythm. Using a real heartbeat cadence (not a metronomic pulse) makes it feel organic and physiological. The moment where the heartbeat "opens up" into radiating rings is the emotional climax -- the heart is not just beating, it is reaching outward. More emotionally immediate than Concepts A or B.

**Implementation approach**

```
SharedValues:
  - heartScale: useSharedValue(0)
  - heartOpacity: useSharedValue(0)
  - ring1Scale, ring2Scale, ring3Scale: useSharedValue(1)
  - ring1Opacity, ring2Opacity, ring3Opacity: useSharedValue(0)
  - avatarAScale, avatarBScale: useSharedValue(0) (existing)

Heartbeat function (reusable worklet):
  function heartbeat(sv: SharedValue<number>, intensity: number) {
    'worklet';
    return withSequence(
      // Beat 1 (lub)
      withTiming(1 + intensity * 0.6, { duration: 100 }),
      withTiming(1, { duration: 100 }),
      // Beat 2 (DUB -- stronger)
      withTiming(1 + intensity, { duration: 100 }),
      withTiming(1, { duration: 150 }),
      // Pause
      withDelay(1200, withTiming(1, { duration: 0 }))
    );
  }

Mount sequence:
  Phase 1 -- Avatars (0-600ms): existing spring entrances

  Phase 2 -- Heart appears (700ms):
    heartScale: withDelay(700, withSpring(1, { damping: 10, stiffness: 180 }))
    heartOpacity: withDelay(700, withTiming(1, { duration: 300 }))

  Phase 3 -- Heartbeat cycles (1000-4200ms):
    heartScale: withDelay(1000, withRepeat(heartbeat(heartScale, 0.25), 2))

  Phase 4 -- Radiating rings (4200ms):
    heartScale: withDelay(4200, withSpring(1.3, { damping: 12 }))
    ring1Scale: withDelay(4200, withTiming(3, { duration: 800, easing: out(cubic) }))
    ring1Opacity: withDelay(4200, withSequence(
      withTiming(0.2, { duration: 100 }),
      withTiming(0, { duration: 700 })
    ))
    ring2Scale: withDelay(4400, ...) // same pattern, 200ms later
    ring3Scale: withDelay(4600, ...) // same pattern, 400ms later
    Haptic: successTap() at 4200ms

  Phase 5 -- Settle (5000ms+):
    heartScale transitions to gentle breathing:
    withDelay(5000, withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: inOut(ease) }),
        withTiming(1.0, { duration: 1000, easing: inOut(ease) })
      ), -1
    ))
    Title, stats, button fade in with existing FadeInDown

Rendering:
  Heart shape options:
    Option 1: Unicode heart character in Animated.Text (simplest)
    Option 2: Two rotated rounded-square Views overlapping (pure RN, no deps)
    Option 3: SVG path via react-native-svg (most precise, already installed)

  Recommended: Option 3 (SVG). A heart path is ~30 characters:
    <Svg width={40} height={40}><Path d="M20 35 C..." fill={orangeMid} /></Svg>
    Wrap in Animated.createAnimatedComponent for scale/opacity.

  Rings: three Animated.View circles with borderColor from orange family,
    position absolute behind heart, scale + opacity animated.
```

**Complexity**: Medium. The heartbeat timing requires careful sequencing of `withSequence` calls, but each individual animation is simple. The main risk is the heartbeat feeling mechanical rather than organic -- the solution is asymmetric timing (beat 2 is stronger and slightly longer than beat 1, and the pause is long relative to the beats). Testing with real users will determine if the heartbeat cadence feels right. Approximately 90 lines of animation code.

---

## Implementation Notes

### Dependencies already available (no installs needed)
- `react-native-reanimated` -- all animation primitives
- `expo-linear-gradient` -- gradient backgrounds
- `react-native-svg` -- SVG shapes (for heart path, arcs, particles)

### Dependencies NOT available (would require install)
- `lottie-react-native` -- not installed, not recommended unless a designer provides a .json file
- `react-native-skia` -- not installed, overkill for these animations
- `react-native-reanimated-confetti` -- not installed, not aligned with calm aesthetic

### Performance considerations
- Keep total SharedValues under 20 per screen for Android mid-range devices
- Particle systems (Splash Concept C) should stagger mount animations by 200ms each
- All animations run on the UI thread via reanimated worklets -- no JS bridge overhead
- Avoid `runOnJS` inside animation callbacks except for haptics (one-shot calls)

### Existing patterns to reuse
- Breathing loop: directly from `TypingIndicator.tsx` (`breatheScale`/`breatheOpacity` helpers)
- Spring entrance: from `ConnectedScreen.tsx` (damping: 12, stiffness: 200)
- Float oscillation: from `WaitingForPartnerScreen.tsx` (translateY +/-6px, 4s cycle)
- `AnimatedPressable` and `Animated.createAnimatedComponent(LinearGradient)` patterns established in `EmotionPill.tsx` and `ProgressBar.tsx`

### Haptics
- Use `successTap()` from `utils/haptics` for the key emotional moment (merge/connection/heartbeat climax)
- Do NOT use haptics during ambient loops -- only at the single peak moment

---

## Recommendation Summary

### Splash Screen: Concept A (Breathing Orb) or Concept B (Two Shapes Drifting)

| Criteria | A: Breathing Orb | B: Two Shapes Drifting | C: Particle Field |
|---|---|---|---|
| Emotional impact | High (meditative) | Highest (narrative) | High (ethereal) |
| Implementation effort | ~2 hours | ~3 hours | ~5 hours |
| Performance risk | None | None | Moderate (Android) |
| Consistency with app | Perfect (reuses TypingIndicator pattern) | Good (new visual language) | Good (new visual language) |
| Distinctiveness | Medium (common in wellness apps) | High (unique metaphor) | High (premium feel) |

**Primary recommendation: Concept B (Two Shapes Drifting Together).**
It is the most original option and directly communicates the app's core purpose through motion alone. The "two becoming one" metaphor will resonate with users before they read a single word. Medium complexity is manageable.

**Fallback recommendation: Concept A (Breathing Orb).**
If timeline is tight or Concept B proves hard to tune visually, the breathing orb is a proven, safe choice that integrates seamlessly with the existing animation system.

### Connected Screen: Concept A (Magnetic Circles Merging) or Concept C (Heartbeat)

| Criteria | A: Magnetic Merge | B: Golden Thread | C: Heartbeat Pulse |
|---|---|---|---|
| Emotional impact | Highest (climactic) | High (tender) | High (visceral) |
| Implementation effort | ~4 hours | ~3 hours | ~3 hours |
| Performance risk | Low | Low | Low |
| Symbolic clarity | Very high (merge = unity) | High (thread = bond) | Medium (heartbeat = life) |
| Uniqueness | High | Medium | Medium |

**Primary recommendation: Concept A (Magnetic Circles Merging).**
This is the most significant emotional moment in the app and deserves the most ambitious animation. The merge metaphor (two circles becoming one ring while retaining their individual colors) is a powerful visual statement about what the app stands for: unity without erasure. Worth the extra implementation time.

**Fallback recommendation: Concept C (Synchronized Heartbeat).**
If the merge transition proves too complex to tune (the cross-fade from two circles to one ring is the hardest part), the heartbeat offers strong emotional resonance with simpler choreography. The lub-DUB rhythm is immediately recognizable and universally understood.

---

## Research Sources

- [Build a Mindful Breathing App with React Native and Reanimated](https://www.wellally.tech/blog/build-breathing-app-react-native-reanimated-tutorial) -- Breathing animation patterns and timing
- [React Native Reanimated Fundamentals](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation/) -- SharedValue, withTiming, withRepeat reference
- [React Native Reanimated 3 Guide (2025)](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4) -- Performance best practices
- [Animating SVGs with React Native Reanimated](https://medium.com/tribalscale/intro-to-svg-animations-with-react-native-reanimated-2-78bd87438129) -- createAnimatedComponent for SVG
- [react-native-reanimated-confetti](https://github.com/felippepuhle/react-native-reanimated-confetti) -- Particle/confetti reference (not recommended for this app's calm aesthetic)
- [Animating Gradients in React Native](https://medium.com/@GroundControl/animating-gradients-in-react-native-8853dbd97d02) -- Gradient animation techniques
- [Animated Splash Screen with Reanimated](https://medium.com/@burcuozdmr/animating-splash-screen-with-react-native-reanimated-edf0b6c97139) -- Splash-specific patterns
- [Motion Matters: How Animation Elevates UX in 2025](https://medium.com/design-bootcamp/motion-matters-how-animation-elevates-ux-in-2025-b181adca68a9) -- UX motion design principles
- [How to Create a Meditation App Like Headspace/Calm](https://axicube.io/blog/getting-calm-how-to-create-a-meditation-app-like-headspace-did/) -- Calm/Headspace design analysis
- [ReanimatedArc - Circular Animated Elements](https://www.callstack.com/blog/reanimatedarc-build-circular-animated-ui-elements-in-react-native) -- Circular SVG arc animation patterns
