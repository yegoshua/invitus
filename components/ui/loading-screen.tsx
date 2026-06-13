import { ArnoldLoader } from "./arnold-loader";

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <ArnoldLoader />
      <p className="loader-progress-counter font-heading text-lg text-white font-bold tracking-wider" />
    </div>
  );
}