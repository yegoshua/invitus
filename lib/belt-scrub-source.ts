/**
 * The belt scrub ships in two encodings, and which one a browser gets is
 * decided here.
 *
 * The belt sits directly on the section's coral, so the video has to carry
 * its transparency. No single codec does that everywhere: Chromium and
 * Firefox honour the alpha channel in VP9/WebM and cannot play HEVC-with-alpha
 * at all (Chromium never fires `loadeddata` on the .mov); WebKit plays the
 * VP9 but silently drops its alpha, painting the belt on a black rectangle —
 * the iOS bug this file exists for — and is the only engine that composites
 * Apple's HEVC-with-alpha (`hvc1`, QuickTime container).
 *
 * Baking the coral into an opaque video instead was tried and reverted
 * (600a205): the browser colour-manages a tagged video before painting it and
 * paints CSS colour as plain sRGB, so a background that matches in the file
 * lands a visibly different shade on screen. Transparency is the only thing
 * that cannot mismatch.
 *
 * Detection is of the *engine*, not the codec, on purpose. Firefox answers
 * "probably" to `canPlayType` for `hvc1` in an MP4 and would then be handed a
 * file it renders without alpha; asking whether this is WebKit is asking the
 * right question, because WebKit's media pipeline is both the thing that
 * breaks VP9 alpha and the thing that plays HEVC alpha. `canPlayType` is the
 * second gate only so a WebKit build without HEVC keeps the (black but
 * playing) WebM rather than nothing.
 *
 * The .mov is derived from the .webm master — regenerate it whenever the
 * master is recut:
 *
 *   ffmpeg -c:v libvpx-vp9 -i public/assets/belt-benefits-section-video-scrub.webm \
 *     -pix_fmt bgra -c:v hevc_videotoolbox -alpha_quality 0.75 -g 6 -q:v 65 \
 *     -tag:v hvc1 -allow_sw 1 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
 *     -an public/assets/belt-benefits-section-video-scrub.mov
 *
 * `-c:v libvpx-vp9` on the *input* matters: ffmpeg's native vp9 decoder
 * returns yuv420p and the alpha is gone before encoding starts (the July
 * attempt that found "no alpha layer" in the output was this). `-g 6` keeps a
 * keyframe every quarter second so scroll-scrubbing seeks in a few
 * milliseconds, as it does on the all-intra WebM; measured at 3–8 ms per seek
 * in WebKit against 4 ms for the WebM, at a third of the bytes.
 */

export const BELT_SCRUB_WEBM = "/assets/belt-benefits-section-video-scrub.webm";
export const BELT_SCRUB_HEVC = "/assets/belt-benefits-section-video-scrub.mov";

export type ScrubPlayback = {
  /** The page is running on WebKit — every browser on iOS, Safari on the Mac. */
  isWebKit: boolean;
  /** The browser claims to play HEVC in a QuickTime container. */
  canPlayHevc: boolean;
};

/** Which file to fetch for the belt scrub. Pure, so the rule is testable without a browser. */
export function pickBeltScrubSource({ isWebKit, canPlayHevc }: ScrubPlayback): string {
  return isWebKit && canPlayHevc ? BELT_SCRUB_HEVC : BELT_SCRUB_WEBM;
}

/** Reads the two facts `pickBeltScrubSource` needs from the live element. */
export function readScrubPlayback(video: HTMLVideoElement): ScrubPlayback {
  return {
    // A WebKit-only API on the element itself, backed up by the vendor string
    // (which Chromium and Firefox on iOS also report, correctly: they are
    // WebKit there). Chromium's vendor is "Google Inc.", Firefox's is "".
    isWebKit:
      "webkitSupportsPresentationMode" in HTMLVideoElement.prototype ||
      navigator.vendor === "Apple Computer, Inc.",
    canPlayHevc: video.canPlayType('video/quicktime; codecs="hvc1"') !== "",
  };
}
