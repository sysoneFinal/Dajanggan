import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";
import InstanceSelector from "../components/dashboard/InstanceSelector";
import { useInstanceContext } from "../context/InstanceContext";
import type { Instance } from "../types/instance";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  text-align: center;
`;

export default function Home() {
  const navigate = useNavigate();
  const {
    instances,              // 전역 Context에서 인스턴스 목록 받기
    setSelectedInstance,    // 선택된 인스턴스 설정
    refreshInstances,       // 필요시 새로고침 가능
  } = useInstanceContext();

  /** 인스턴스 선택 시 */
  const handleSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    navigate(`/overview?instanceId=${instance.instanceId}`);
  };

  return (
    <Wrapper>
      <InstanceSelector
        instances={instances}
        onSelect={handleSelect}
      />
      {instances.length === 0 && (
        <p style={{ marginTop: "1rem", color: "#aaa" }}>
          등록된 인스턴스가 없습니다.
        </p>
      )}
    </Wrapper>
  );
}
