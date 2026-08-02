"use client";

import { EmptyState, StatTile } from "@/components/ui";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import type { Cell, ReportModel } from "./reportModel";

/** Figure in the tabular mono face, unit alongside it in the sans face. */
function Figure({ cell }: { cell: Cell | undefined }) {
  if (!cell) return null;
  return (
    <>
      {cell.text}
      {cell.unit && <span className="unit">{cell.unit}</span>}
    </>
  );
}

export default function ReportResult({ model }: { model: ReportModel }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!model.rows.length) {
    return (
      <div className="card">
        <EmptyState title={model.emptyTitle} hint={model.emptyHint} />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {model.stats.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            valueKind={stat.kind}
            value={
              <>
                {stat.value}
                {stat.unit && <span className="unit">{stat.unit}</span>}
              </>
            }
            note={stat.note}
          />
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{model.tableLabel}</div>
            <div className="card-subtitle">
              {model.rows.length} {model.rows.length === 1 ? "row" : "rows"}
            </div>
          </div>
        </div>

        {isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {model.rows.map((row) => (
              <li key={row.key}>
                <div className="mobile-list-card">
                  <p className="mobile-list-card-title">{row.cells[0]?.text}</p>
                  {model.columns.slice(1).map((column, i) => (
                    <p key={column.label} className="mobile-list-card-row">
                      <span>{column.label}: </span>
                      <span className={cn(column.numeric && "num font-medium")}>
                        <Figure cell={row.cells[i + 1]} />
                      </span>
                    </p>
                  ))}
                </div>
              </li>
            ))}
            {model.totals && (
              <li>
                <div className="mobile-list-card mobile-list-card-total">
                  <p className="mobile-list-card-title">
                    {model.totals[0]?.text}
                  </p>
                  {model.columns.slice(1).map((column, i) => {
                    const cell = model.totals?.[i + 1];
                    if (!cell?.text) return null;
                    return (
                      <p key={column.label} className="mobile-list-card-row">
                        <span>{column.label}: </span>
                        <span
                          className={cn(
                            "font-medium",
                            column.numeric && "num",
                          )}
                        >
                          <Figure cell={cell} />
                        </span>
                      </p>
                    );
                  })}
                </div>
              </li>
            )}
          </ul>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {model.columns.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className={column.numeric ? "cell-num" : undefined}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <tr key={row.key}>
                    {row.cells.map((cell, i) => (
                      <td
                        key={model.columns[i]?.label ?? i}
                        className={cn(
                          model.columns[i]?.numeric &&
                            "num cell-num whitespace-nowrap",
                        )}
                      >
                        <Figure cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {model.totals && (
                <tfoot>
                  <tr>
                    {model.totals.map((cell, i) => (
                      <td
                        key={model.columns[i]?.label ?? i}
                        className={cn(
                          model.columns[i]?.numeric &&
                            "num cell-num whitespace-nowrap",
                        )}
                      >
                        <Figure cell={cell} />
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </>
  );
}
