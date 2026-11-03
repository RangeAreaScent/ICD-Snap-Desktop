import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

/** The running app's version, read from the bundle so it can never go stale. */
export function useAppVersion(): string {
  const [version, setVersion] = useState("");
  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch((e) => console.error("failed to read app version:", e));
  }, []);
  return version;
}
