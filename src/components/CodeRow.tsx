import { Star } from "lucide-react";
import { useDataset } from "../dataset";
import type { SearchResult } from "../types";

interface Props {
  item: SearchResult;
  selected: boolean;
  favorite: boolean;
  /** A saved code the bundled data no longer contains. */
  missing?: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

export function CodeRow({
  item,
  selected,
  favorite,
  missing = false,
  onSelect,
  onToggleFavorite,
}: Props) {
  const ds = useDataset();
  return (
    <div
      className={`code-row${selected ? " code-row--selected" : ""}`}
      data-code={item.code}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="code-row__main">
        <div className="code-row__top">
          <span className="code-row__code">{item.code}</span>
          {missing ? (
            <span className="badge badge--missing">{ds.missingLabel}</span>
          ) : item.isBillable ? (
            <span className="badge badge--billable">Billable</span>
          ) : (
            <span className="badge badge--nonbillable">Non-billable</span>
          )}
        </div>
        <div className="code-row__desc">{item.description}</div>
        {item.chapterDescription && (
          <div className="code-row__chapter">{item.chapterDescription}</div>
        )}
      </div>
      <button
        className={`star-btn${favorite ? " star-btn--on" : ""}`}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
      >
        <Star fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
