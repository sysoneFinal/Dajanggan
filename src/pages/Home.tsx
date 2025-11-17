import styled from "@emotion/styled";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstanceSelector from "../components/dashboard/InstanceSelector";
import { useInstanceContext } from "../context/InstanceContext";
import type { Instance } from "../types/instance";
import NewInstanceModal from "./instance/InstanceRegister";

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
  const { instances, setSelectedInstance } = useInstanceContext();
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    navigate(`/overview?instanceId=${instance.instanceId}`);
  };

  return (
    <Wrapper>
      <InstanceSelector 
        instances={instances} 
        onSelect={handleSelect} 
        onAdd={() => setModalOpen(true)} 
      />

      {modalOpen && (
        <NewInstanceModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Wrapper>
  );
}
