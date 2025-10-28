import { useState, useEffect, useRef, useLayoutEffect } from "react";
import "../../styles/util/dropdown-select.css";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  onChange?: (values: string[]) => void;
}

const MultiSelectDropdown = ({ label, options, onChange }: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuWidth, setMenuWidth] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** 드롭다운 토글 */
  const toggleDropdown = () => setIsOpen((prev) => !prev);

  /** 옵션 선택 */
  const handleSelect = (value: string) => {
    setSelected((prev) => {
      const newSelected = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
      onChange?.(newSelected);
      return newSelected;
    });
  };

  /** 외부 클릭 시 닫기 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** label 크기 기반으로 width 자동 계산 */
  useLayoutEffect(() => {
    if (dropdownRef.current) {
      const width = dropdownRef.current.getBoundingClientRect().width;
      setMenuWidth(width);
    }
  }, [dropdownRef.current, selected, isOpen]);

  return (
    <div className="dropdown-select" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-label"
        onClick={toggleDropdown}
      >
        {selected.length > 0 ? selected.join(", ") : label}
        <span className={`arrow ${isOpen ? "open" : ""}`}>∨</span>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu multi"
          role="listbox"
          style={{ width: `${menuWidth}px` }}
        >
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <div
                key={opt}
                className={`dropdown-option ${isChecked ? "checked" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                <span className="checkbox">
                  {isChecked && <span className="checkmark">✓</span>}
                </span>
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
