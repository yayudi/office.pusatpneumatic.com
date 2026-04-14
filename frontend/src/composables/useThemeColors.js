import { ref, onMounted, onUnmounted, computed } from 'vue';

/**
 * State warna tema global.
 * Module-level state agar nilai ini auto-sync antar banyak pemanggil
 */
const themeColors = ref({
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#a855f7',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  text: '#1f2937',
  background: '#ffffff'
});

let observer = null;
let instanceCount = 0;

/**
 * Mengambil computed style dan merupah HSL ke format HEX
 */
const updateThemeColors = () => {
  if (typeof window === 'undefined') return;
  const style = getComputedStyle(document.documentElement);
  const getHex = (varName) => {
    let val = style.getPropertyValue(varName).trim();
    if (!val) return '#888888';
    const parts = val.replace(/%/g, '').split(/\s+/);
    if (parts.length < 3) return '#888888';
    
    let h = parseFloat(parts[0]);
    let s = parseFloat(parts[1]) / 100;
    let l = parseFloat(parts[2]) / 100;
    
    let a = s * Math.min(l, 1 - l);
    let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  };

  themeColors.value = {
    primary: getHex('--color-primary'),
    secondary: getHex('--color-secondary'),
    accent: getHex('--color-accent'),
    success: getHex('--color-success'),
    warning: getHex('--color-warning'),
    danger: getHex('--color-danger'),
    text: getHex('--color-text'),
    background: getHex('--color-background')
  };
};

/**
 * Kalkulasi kecerahan untuk membedakan dark mode
 */
const getBrightness = (hex) => {
  if (!hex || hex.length < 7) return 255;
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
};

// Global computed
const isDarkTheme = computed(() => getBrightness(themeColors.value.background) < 128);

/**
 * Composable untuk mereplikasi data-theme dari CSS ke state JS
 */
export function useThemeColors() {
  onMounted(() => {
    instanceCount++;
    if (instanceCount === 1) {
      updateThemeColors();
      observer = new MutationObserver(() => updateThemeColors());
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
  });

  onUnmounted(() => {
    instanceCount--;
    if (instanceCount === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  });

  return {
    themeColors,
    isDarkTheme
  };
}
