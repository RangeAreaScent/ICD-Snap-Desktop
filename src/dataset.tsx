import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getDatasetInfo } from "./api";
import type { DatasetInfo } from "./types";

interface Dataset {
  /** "FY 2027" */
  label: string;
  /** "2026-10-01" */
  effectiveDate: string;
  /** "74,879" */
  billableLabel: string;
  /** "Not in FY 2027" */
  missingLabel: string;
}

const UNKNOWN: Dataset = {
  label: "-",
  effectiveDate: "-",
  billableLabel: "-",
  missingLabel: "Not in current data",
};

const DatasetContext = createContext<Dataset>(UNKNOWN);

function toDataset(info: DatasetInfo): Dataset {
  const label = `FY ${info.fiscalYear}`;
  return {
    label,
    effectiveDate: info.effectiveDate,
    billableLabel: info.billableCount.toLocaleString("en-US"),
    missingLabel: `Not in ${label}`,
  };
}

/** Reads the bundled data's version once, so no screen hard-codes a fiscal year. */
export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset>(UNKNOWN);
  useEffect(() => {
    getDatasetInfo()
      .then((info) => setDataset(toDataset(info)))
      .catch((e) => console.error("failed to read dataset info:", e));
  }, []);
  return <DatasetContext.Provider value={dataset}>{children}</DatasetContext.Provider>;
}

export function useDataset(): Dataset {
  return useContext(DatasetContext);
}
