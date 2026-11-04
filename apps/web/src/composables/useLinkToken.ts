import { onMounted, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

/**
 * The secret from a link in an e-mail (`/reset-password#token=...`).
 *
 * It rides in the fragment, which browsers never send to a server, and is
 * removed from the address bar as soon as it has been read, so it does not
 * linger in history, a screenshot or a shared screen.
 *
 * `checked` turns true once the page has looked for a token, so a page can
 * tell "no token in the link" apart from "not read yet". It follows the
 * address too: opening a link while the page is already showing still works.
 */
export function useLinkToken(): { token: Ref<string>; checked: Ref<boolean> } {
  const route = useRoute();
  const token = ref('');
  const checked = ref(false);

  const read = (hash: string): void => {
    const found = new URLSearchParams(hash.replace(/^#/, '')).get('token');
    if (found) {
      token.value = found;
      window.history.replaceState(window.history.state, '', route.path);
    }
    checked.value = true;
  };

  onMounted(() => {
    read(route.hash);
  });
  watch(
    () => route.hash,
    (hash) => {
      if (hash) read(hash);
    },
  );

  return { token, checked };
}
