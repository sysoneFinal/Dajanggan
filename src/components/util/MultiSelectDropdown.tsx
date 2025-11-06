import { useState, useEffect, useRef } from "react";
import "../../styles/util/dropdown-select.css";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  onChange?: (values: string[] | string) => void;
  multi?: boolean; // 다중 선택 여부
  width?: string | number; // 개별 width 조절용
  noShadow?: boolean; // 그림자 제거 옵션
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
      setSelected((prev) => {
        const newSelected = prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev, value];
        onChange?.(newSelected);
        return newSelected;
      });
    } else {
      setSelected([value]);
      onChange?.(value); // 단일 모드일 때 string 전달
      setIsOpen(false);
    }
  };

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
                {/* multi 모드일 때만 체크박스 표시 */}
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
