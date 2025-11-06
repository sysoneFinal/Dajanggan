import { useState, useEffect, useRef } from "react";
import "../../styles/util/dropdown-select.css";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  onChange?: (values: string[] | string) => void;
  multi?: boolean;
  width?: string | number;
  noShadow?: boolean;
}

const MultiSelectDropdown = ({
  label,
  options,
  onChange,
  multi = true,
  width = "250px",
  noShadow = false,
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** === 항목 선택 === */
  const handleSelect = (value: string) => {
    if (multi) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setSelected([value]);
      setIsOpen(false);
    }
  };

  /** ✅ 선택값 변경 시 부모에 알림 (렌더 이후 실행됨) */
  useEffect(() => {
    if (!onChange) return;
    if (multi) onChange(selected);
    else if (selected.length > 0) onChange(selected[0]);
  }, [selected]);

  /** === 외부 클릭 시 닫기 === */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`dropdown-select compact ${noShadow ? "no-shadow" : ""}`}
      ref={dropdownRef}
      style={{ width }}
    >
      <button type="button" className="dropdown-label" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-tags">
          {selected.length > 0 ? (
            selected.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))
          ) : (
            <span className="placeholder">{label}</span>
          )}
        </div>
        <span className={`arrow ${isOpen ? "open" : ""}`}>∨</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu multi" role="listbox">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <div
                key={opt}
                className={`dropdown-option ${isChecked ? "checked" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                {multi && (
                  <span className="checkbox">
                    {isChecked && <span className="checkmark">✓</span>}
                  </span>
                )}
                <span className="option-label">{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
