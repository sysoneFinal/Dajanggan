import React from "react";
import "../../styles/dashboard/InstanceSelector.css";
import NextIcon from "../../assets/icon/next.svg";
import type { Instance } from "../../types/instance";

interface InstanceSelectorProps {
  instances: Instance[];
  onSelect?: (instance: Instance) => void; 
  onAdd?: () => void; 
}

const InstanceSelector = ({ instances, onSelect, onAdd }: InstanceSelectorProps) => {
  /** Add Instance 버튼 클릭 시 */
  const handleAdd = () => {
    if (onAdd) onAdd();
    else console.log("Add Instance 버튼 클릭됨");
  };

  /** 등록된 인스턴스가 없을 때 버튼만 표시 */
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

  /** 등록된 인스턴스가 있을 때 리스트 */
  return (
    <div className="instance-popup">
      <h3 className="popup-header">Select Instance</h3>

      {instances.map((inst, index) => (
        <React.Fragment key={inst.instanceId}>
          <div
            className="instance-item"
            onClick={() => onSelect?.(inst)} 
          >
            <div
              className={`status-dot ${
                inst.isEnabled === true ? "normal" : "warning"
              }`}
            />
            <span className="instance-name">{inst.instanceName}</span>
          </div>

          {index !== instances.length - 1 && <div className="inst-divider" />}
        </React.Fragment>
      ))}

      <button className="add-instance" onClick={handleAdd}>
        Add instance
      </button>
    </div>
  );
};

export default InstanceSelector;
