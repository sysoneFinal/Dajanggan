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

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  // 표시할 페이지 번호 범위 계산
  const getPageNumbers = (): number[] => {
    if (totalPages <= maxVisible) {
      // 전체 페이지가 5개 이하면 모두 표시
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // 현재 페이지를 중심으로 5개 표시
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    // 끝에 도달했을 때 start 조정
    if (end === totalPages) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-container">
      <button
        className="page-btn prev"
        onClick={handlePrev}
        disabled={currentPage === 1}
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
        disabled={currentPage === totalPages}
      >
        다음
      </button>
    </div>
  );
};

export default Pagination;