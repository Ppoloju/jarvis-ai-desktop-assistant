import { useCallback, useEffect, useState } from "react";
import { getSystemInfo } from "../../services/api";
import { Alert, Stat } from "../ui";

export default function SystemInfo() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    let active = true;

    getSystemInfo()
      .then((data) => {
        if (active) {
          setInfo(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  if (error) {
    return <Alert tone="error">System information is unavailable: {error}</Alert>;
  }

  if (!info) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Stat icon="app" label="Platform" value={info.platform} hint="Local runtime" />
      <Stat icon="cpu" label="CPU cores" value={info.cpuCount} hint="Available" />
      <Stat
        icon="shield"
        label="Memory"
        value={`${info.freeMemory} free`}
        hint={`${info.totalMemory} total`}
      />
      <Stat icon="clock" label="Uptime" value={info.uptime} hint="Since last start" />
    </div>
  );
}
