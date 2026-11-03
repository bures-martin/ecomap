import { ref, watch, type Ref, type WatchSource } from 'vue';

/**
 * Delays a fast-changing value, so typing in the search box does not fire a
 * request (and a history entry) on every keystroke.
 */
export function useDebouncedRef<T>(
  source: WatchSource<T>,
  delayMs: number,
  initial: T,
): Readonly<Ref<T>> {
  const debounced = ref(initial) as Ref<T>;

  watch(source, (value, _previous, onCleanup) => {
    const timer = setTimeout(() => {
      debounced.value = value;
    }, delayMs);
    onCleanup(() => {
      clearTimeout(timer);
    });
  });

  return debounced;
}
