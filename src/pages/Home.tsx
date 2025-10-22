import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import InstanceSelector from "../components/dashboard/InstanceSelector";
import apiClient from "../api/apiClient";

interface Instance {
  id: number;
  name: string;
  status: "normal" | "warning";
}

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
  const [instances, setInstances] = useState<Instance[]>([]);

  // 인스턴스 정보 가져오기
  const getInstanceInfo = async () => {
    try {
      const response = await apiClient.get("/instances");
      console.log("인스턴스 정보: ", response.data);
      setInstances(response.data);
    } catch (error) {
      console.error("인스턴스 정보를 불러오는데 실패하였습니다. ", error);
    }
  };

  useEffect(() => {
    getInstanceInfo();
  }, []);

  return (
    <Wrapper>
      {/* props로 전달 */}
      <InstanceSelector instances={instances} />
    </Wrapper>
  );
}
