import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable to detect mobile viewports based on a breakpoint.
 * Reactively updates `isMobile` when the window is resized.
 * 
 * @param {number} breakpoint - The width in pixels below which the viewport is considered mobile. Default is 768px (Tailwind 'md').
 * @returns {{ isMobile: import('vue').Ref<boolean> }}
 */
export function useMobile(breakpoint = 768) {
  const isMobile = ref(false);

  const checkMobile = () => {
    isMobile.value = window.innerWidth < breakpoint;
  };

  onMounted(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });

  return { isMobile };
}
