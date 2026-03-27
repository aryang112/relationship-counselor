/**
 * Layout rules based on Apple HIG + Relate design system.
 * Each rule takes an element's measured bounds and returns a violation or null.
 *
 * Device safe area constants (iPhone 14/15):
 *   - Top safe area: 59px
 *   - Bottom safe area: 34px
 *   - Screen width: 390px
 *   - Screen height: 844px
 */

const DEVICE = {
  width: 390,
  height: 844,
  safeAreaTop: 59,
  safeAreaBottom: 34,
  minTapTarget: 44, // Apple HIG minimum
};

const rules = [
  {
    id: 'SAFE_AREA_BOTTOM',
    description: 'Interactive elements must not overlap bottom safe area',
    severity: 'critical',
    check: (el) => {
      if (!el.interactive) return null;
      const elementBottom = el.y + el.height;
      const safeBottom = DEVICE.height - DEVICE.safeAreaBottom;
      if (elementBottom > safeBottom) {
        return `"${el.label}" bottom edge (${elementBottom}px) overlaps safe area boundary (${safeBottom}px)`;
      }
      return null;
    },
  },
  {
    id: 'SAFE_AREA_TOP',
    description: 'Content must not overlap top safe area / status bar',
    severity: 'critical',
    check: (el) => {
      if (el.y < DEVICE.safeAreaTop && el.type !== 'statusBar') {
        return `"${el.label}" top edge (${el.y}px) overlaps status bar safe area (${DEVICE.safeAreaTop}px)`;
      }
      return null;
    },
  },
  {
    id: 'MIN_TAP_TARGET',
    description: 'Interactive elements must be at least 44x44pt',
    severity: 'warning',
    check: (el) => {
      if (!el.interactive) return null;
      if (el.width < DEVICE.minTapTarget || el.height < DEVICE.minTapTarget) {
        return `"${el.label}" tap target (${el.width}x${el.height}px) is below Apple minimum (44x44px)`;
      }
      return null;
    },
  },
  {
    id: 'OFF_SCREEN',
    description: 'Elements must not render outside screen bounds',
    severity: 'critical',
    check: (el) => {
      if (
        el.x < 0 ||
        el.y < 0 ||
        el.x + el.width > DEVICE.width ||
        el.y + el.height > DEVICE.height
      ) {
        return `"${el.label}" renders outside screen bounds (x:${el.x}, y:${el.y}, w:${el.width}, h:${el.height})`;
      }
      return null;
    },
  },
  {
    id: 'BUTTON_BOTTOM_PADDING',
    description: 'Bottom CTA buttons need at least 16px padding above safe area',
    severity: 'warning',
    check: (el) => {
      if (!el.interactive || !el.label.match(/continue|next|submit|save|done/i))
        return null;
      const safeBottom = DEVICE.height - DEVICE.safeAreaBottom;
      const elementBottom = el.y + el.height;
      if (elementBottom > safeBottom - 16) {
        return `CTA button "${el.label}" has less than 16px padding above safe area`;
      }
      return null;
    },
  },
  {
    id: 'TEXT_OVERFLOW',
    description:
      'Text must not be truncated unexpectedly on standard screen size',
    severity: 'warning',
    check: (el) => {
      if (el.type !== 'text') return null;
      if (el.truncated) {
        return `Text "${el.label.substring(0, 30)}..." appears truncated`;
      }
      return null;
    },
  },
];

module.exports = { rules, DEVICE };
