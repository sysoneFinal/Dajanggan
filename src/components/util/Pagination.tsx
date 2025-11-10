import React from "react";
import "../../styles/util/pagination.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const maxVisible = 5; // 한 번에 보여줄 페이지 개수

  // 현재 페이지가 속한 그룹 계산
  const getCurrentGroup = () => {
    return Math.ceil(currentPage / maxVisible);
  };

  // 전체 그룹 개수
  const totalGroups = Math.ceil(totalPages / maxVisible);

  // 현재 그룹의 시작/끝 페이지
  const currentGroup = getCurrentGroup();
  const startPage = (currentGroup - 1) * maxVisible + 1;
  const endPage = Math.min(currentGroup * maxVisible, totalPages);

  // 표시할 페이지 번호 배열
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  // 이전 그룹으로 이동
  const handlePrev = () => {
    if (currentGroup > 1) {
      const prevGroupLastPage = startPage - 1;
      onPageChange(prevGroupLastPage);
    }
  };

  // 다음 그룹으로 이동
  const handleNext = () => {
    if (currentGroup < totalGroups) {
      const nextGroupFirstPage = endPage + 1;
      onPageChange(nextGroupFirstPage);
    }
  };

  return (
    <div className="pagination-container">
      <button
        className="page-btn prev"
        onClick={handlePrev}
        disabled={currentGroup === 1}
      >
        이전
      </button>

      {pageNumbers.map((pageNum) => (
        <button
          key={pageNum}
          className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
          onClick={() => onPageChange(pageNum)}
        >
          {pageNum}
        </button>
      ))}

      <button
        className="page-btn next"
        onClick={handleNext}
        disabled={currentGroup === totalGroups}
      >
        다음
      </button>
    </div>
  );
};

export default Pagination;