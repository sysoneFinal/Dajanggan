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
  searchable?: boolean; // 새로 추가!
}

const MultiSelectDropdown = ({
  label,
  options,
  onChange,
  multi = true,
  width = "250px",
  noShadow = false,
  value,
  searchable = false, // 기본값 false (기존 동작 유지)
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchText, setSearchText] = useState(""); // 검색어
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // value prop이 있으면 동기화
  useEffect(() => {
    if (value !== undefined) {
      setSelected(Array.isArray(value) ? value : [value]);
    }
  }, [value]);

  // 드롭다운 열릴 때 검색 input에 포커스
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchText(""); // 닫힐 때 검색어 초기화
    }
  }, [isOpen, searchable]);

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

  // 필터링된 옵션
  const filteredOptions = searchable
    ? options.filter((opt) => opt.toLowerCase().includes(searchText.toLowerCase()))
    : options;

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
          {/* 검색 input 추가 */}
          {searchable && (
            <div className="dropdown-search">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* 옵션 리스트 */}
          <div className="dropdown-options-list">
            {filteredOptions.length === 0 ? (
              <div className="no-results">검색 결과 없음</div>
            ) : (
              filteredOptions.map((opt) => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;