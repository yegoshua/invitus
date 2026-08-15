/**
 * The one place the Network Information API is read.
 *
 * Two unrelated features now ask the same question — should this speculative
 * download happen at all? — and the browser's answer arrives behind a cast,
 * because `navigator.connection` is still not in the DOM types. Two copies of
 * that cast are two things to keep in step, so there is one.
 */

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

export function readNetworkInformation(): NetworkInformation {
  return (
    (navigator as Navigator & { connection?: NetworkInformation }).connection ??
    {}
  );
}

/** The visitor asked for less data. Absent support reads as "did not ask". */
export function readSaveData(): boolean {
  return Boolean(readNetworkInformation().saveData);
}
