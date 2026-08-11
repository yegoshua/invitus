import { create } from "zustand";

/**
 * Byte-level download progress for the 3D model on a product page.
 *
 * drei's `useProgress` reports THREE.DefaultLoadingManager's *item* count, so a
 * scene made of a .glb, an HDR environment map and a texture steps 0 → 33 → 66
 * → 100 no matter that the .glb is tens of megabytes and everything else is
 * rounding error. Three's FileLoader does measure the real thing — it reads
 * `Content-Length` and emits a ProgressEvent per streamed chunk — but drei's
 * `useGLTF` drops the `onProgress` argument that `useLoader` beneath it takes.
 *
 * The bytes are collected here rather than in component state because the
 * component calling `useLoader` is suspended for the entire download and so
 * cannot hold the state that describes it. The overlay lives outside that
 * Suspense boundary and subscribes instead.
 *
 * One model at a time: a page shows a single viewer, and keying on the url is
 * what stops a finished download from reporting itself as another model's.
 */
interface ModelProgressState {
  url: string | null;
  /** Whole percent downloaded, or `null` when that cannot be measured. */
  percent: number | null;
  report: (url: string, loaded: number, total: number) => void;
}

export const useModelProgressStore = create<ModelProgressState>((set) => ({
  url: null,
  percent: null,
  report: (url, loaded, total) =>
    set((state) => {
      const percent =
        total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;

      // Bail out unless the figure on screen would actually change. Three reads
      // the response a chunk at a time and calls back on every one, which for a
      // 40 MB model is thousands of callbacks in a few seconds; a store update
      // per chunk is a fast enough stream of renders that React calls it a
      // runaway loop and tears the tree down with "Maximum update depth
      // exceeded" — the model then never appears at all. Rounding first caps
      // the whole download at 101 updates.
      //
      // Returning the existing state object is what makes this a no-op: zustand
      // skips notifying subscribers when the new state is the old one.
      if (state.url === url && state.percent === percent) return state;
      return { url, percent };
    }),
}));

/**
 * Percentage of `url` downloaded, or `null` when that is not known — no model,
 * nothing reported yet, or a response without a usable `Content-Length`.
 *
 * `null` is the signal to fall back to the item-count progress; it is never
 * flattened to `0`, because "we have no measurement" and "no bytes have arrived"
 * look identical on screen and only one of them is worth waiting on.
 */
export function useModelBytesProgress(url?: string): number | null {
  return useModelProgressStore((state) =>
    url && state.url === url ? state.percent : null
  );
}
