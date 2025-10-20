import "../../styles/layout/header.css";
const Header = () => {
  return (
    <header className="header">
      <div className="header-title-wrapper">
        <h1 className="header-title">Dashboard</h1>
      </div>
      
      <div className="header-controls">
        <button className="header-btn">
          <span className="header-btn-text">All Instances</span>
        </button>
        
        <button className="header-btn">
          <span className="header-btn-text">10m</span>
        </button>
        
        <button className="header-btn header-btn-with-icon">
          <span className="header-icon-dot"></span>
          <span className="header-btn-text">All Metrics</span>
        </button>
        
        <button className="header-btn header-btn-edit">
          <svg className="header-edit-icon" viewBox="0 0 24 24" fill="currentColor">
            <g transform="translate(3, 3) scale(0.75)">
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
            </g>
          </svg>
          <span className="header-btn-text">Edit Modules</span>
        </button>
        
        <button className="header-notification-btn">
          <span className="header-notification-icon">🔔</span>
        </button>
      </div>
    </header>
  );
};

export default Header;