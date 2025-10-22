import React from "react";
import "../../styles/dashboard/InstanceSelector.css";
import { useNavigate } from "react-router-dom";
import NextIcon from "../../assets/icon/next.svg";


interface Instance {
  id: number;
  name: string;
  status: "normal" | "warning";
}

interface InstanceSelectorProps {
  instances: Instance[];
}

const InstanceSelector = ({ instances }: InstanceSelectorProps) => {
  const navigate = useNavigate();

  const handleSelect = (id: number) => {
    navigate(`/overview?instanceId=${id}`);
  };

  const handleAdd = () => {
    console.log("Add Instance 버튼 클릭됨");
    // 등록 모달 열기 
    // navigate("/instance/add"); 
  };

     // 등록된 인스턴스가 없을 때 버튼만 표시
  if (instances.length === 0) {
    return (
      <div className="add-instance-wrapper">
        <div className="add-instance-button" onClick={handleAdd}>
          <div className="add-instance-bg" />
          <div className="add-instance-overlay" />
          <span className="add-instance-text">Add Instance</span>
          <div className="add-instance-icon-bg" />
          <img
            className="add-instance-icon"
            src={NextIcon}
            alt="add instance icon"
          />
        </div>
      </div>
    );
  }
    // 등록된 인스턴스가 있을 때 리스트 
    return (
    <div className="instance-popup">
      <h3 className="popup-header">Select Instance</h3>

      {instances.map((inst, index) => (
        <React.Fragment key={inst.id}>
          <div
            className="instance-item"
            onClick={() => handleSelect(inst.id)}
          >
            <div
              className={`status-dot ${
                inst.status === "normal" ? "normal" : "warning"
              }`}
            />
            <span className="instance-name">{inst.name}</span>
          </div>

          {index !== instances.length - 1 && <div className="inst-divider" />}
        </React.Fragment>
      ))}

      <button className="add-instance">Add instance</button>
    </div>
  );
};

export default InstanceSelector;
