// src/components/VacuumTableMenu.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/VacuumPage.css";

/** ─ TableDropdown: 내부 전용 ─ */
function TableDropdown({
  tables,
  value,
  onChange,
  maxHeight = 320,
}: {
  tables: string[];
  value: string;
  onChange: (v: string) => void;
  maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) &&
          !popRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = useMemo(() => {
    const rest = tables.filter((t) => t !== value);
    return [value, ...rest];
  }, [tables, value]);

  return (
    <div className="vd-dd">
      <button
        ref={btnRef}
        type="button"
        className={`vd-pill vd-pill--dropdown ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="vd-pill__label">{value}</span>
        <svg className="vd-pill__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div ref={popRef} className="vd-dd__menu" role="listbox" style={{ maxHeight }}>
          {items.map((t) => (
            <button
              key={t}
              role="option"
              aria-selected={t === value}
              className={`vd-dd__item ${t === value ? "is-active" : ""}`}
              onClick={() => { onChange(t); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** ─ 외부에서 쓰는 헤더 바 ─ */
type VacuumTableMenuProps = {
  tables: string[];               // 드롭다운 목록
  selectedTable: string;          // 선택된 테이블
  onChange: (table: string) => void; // 선택 변경 콜백
  dbName?: string;
  autovacuumEnabled?: boolean;
  lastVacuumText?: string;        // "YYYY-MM-DD HH:mm"
};

export default function VacuumTableMenu({
  tables,
  selectedTable,
  onChange,
  dbName = "appdb",
  autovacuumEnabled = true,
  lastVacuumText,
}: VacuumTableMenuProps) {
  return (
    <section className="vd-card vd-card--headerbar">
      <div className="vd-hbar">
        <h2 className="vd-hbar__title">
          Bloat Detail —{" "}
          <TableDropdown
            tables={tables}
            value={selectedTable}
            onChange={onChange}
          />
        </h2>

        <div className="vd-badges">
          <span className="vd-badge">DB: {dbName}</span>
          <span className={`vd-badge ${autovacuumEnabled ? "vd-badge--ok" : "vd-badge--warn"}`}>
            Autovacuum: {autovacuumEnabled ? "enabled" : "disabled"}
          </span>
          {lastVacuumText && <span className="vd-badge">Last VACUUM: {lastVacuumText}</span>}
        </div>

        <button className="vd-backbtn" onClick={() => history.back()}>
          ← Back
        </button>
      </div>
    </section>
  );
}
