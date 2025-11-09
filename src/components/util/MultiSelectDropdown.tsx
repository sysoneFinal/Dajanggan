import { useState, useEffect, useRef } from "react";
import "../../styles/util/dropdown-select.css";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  onChange?: (values: string[] | string) => void;
  multi?: boolean;
  width?: string | number;
  noShadow?: boolean;
  value?: string[] | string; 
}

const MultiSelectDropdown = ({
  label,
  options,
  onChange,
  multi = true,
  width = "250px",
  noShadow = false,
  value, 
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 추가: value prop이 있으면 동기화
  useEffect(() => {
    if (value !== undefined) {
      setSelected(Array.isArray(value) ? value : [value]);
    }
  }, [value]);

  /** === 항목 선택 === */
  const handleSelect = (value: string) => {
    let newSelected: string[];
    
    if (multi) {
      newSelected = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
    } else {
      newSelected = [value];
      setIsOpen(false);
    }

    setSelected(newSelected);
    
    // 👇 직접 호출 (useEffect 사용 안 함)
    if (onChange) {
      if (multi) {
        onChange(newSelected);
      } else {
        onChange(newSelected[0] || "");
      }
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