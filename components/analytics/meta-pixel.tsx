import { META_PIXEL_ID } from "@/lib/meta-pixel";
import { SITE_HOST } from "@/lib/site";
import { MetaPixelLoader } from "./meta-pixel-loader";

// Same split as <GoogleAnalytics>, for the same reason: the fbq queue stub is
// a plain inline <script> so it exists during HTML parse, before any mount
// effect under {children} fires view_item or purchase. fbevents.js replays
// fbq.queue whenever it arrives, so the library itself is loaded late by
// <MetaPixelLoader>.
//
// Unlike GA, the host check lives in the stub: preview deploys are also
// production builds, and ad attribution fed with preview traffic is worse than
// none. Off the canonical host window.fbq is never defined, so trackMetaEvent
// no-ops and the loader never fetches anything.
export function MetaPixel() {
  if (process.env.NODE_ENV !== "production") return null;

  const hosts = JSON.stringify([SITE_HOST, `www.${SITE_HOST}`]);

  return (
    <>
      <script
        id="meta-pixel-init"
        dangerouslySetInnerHTML={{
          __html:
            `if(${hosts}.indexOf(location.hostname)>-1){` +
            `var n=window.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};` +
            `window._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];` +
            `fbq('init','${META_PIXEL_ID}');}`,
        }}
      />
      <MetaPixelLoader />
    </>
  );
}
