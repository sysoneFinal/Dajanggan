import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../api/apiClient";
import type { Instance } from "../types/instance";
import type { Database } from "../types/database";

interface InstanceContextType {
  instances: Instance[];
  selectedInstance: Instance | null;
  setSelectedInstance: (instance: Instance | null) => void;

  databases: Database[];
  selectedDatabase: Database | null;
  setSelectedDatabase: (db: Database | null) => void;

  refreshInstances: () => Promise<void>;
  refreshDatabases: (instanceId: number) => Promise<void>;
}

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

export const InstanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);

  /** 인스턴스 목록 가져오기 */
  const fetchInstances = useCallback(async () => {
    try {
      const res = await apiClient.get("/instances");
      console.log("instance 목록 확인:", res.data);
      setInstances(res.data);
    } catch (err) {
      console.error("인스턴스 목록 불러오기 실패:", err);
    }
  }, []);

  /** 특정 인스턴스의 DB 목록 가져오기 */
  const fetchDatabases = useCallback(async (instanceId: number) => {
    try {
      const res = await apiClient.get(`/instances/${instanceId}/databases`);
      console.log("db 목록 확인:", res.data);
      setDatabases(res.data);
    } catch (err) {
      console.error("데이터베이스 목록 불러오기 실패:", err);
      setDatabases([]);
    }
  }, []);

  /** 초기 로드 (앱 시작 시 복원) */
  useEffect(() => {
    fetchInstances();

    const savedInstance = localStorage.getItem("selectedInstance");
    const savedDatabase = localStorage.getItem("selectedDatabase");

    if (savedInstance) {
      const parsedInstance = JSON.parse(savedInstance);
      setSelectedInstance(parsedInstance);
      fetchDatabases(parsedInstance.instanceId);
    }

    if (savedDatabase) {
      const parsedDatabase = JSON.parse(savedDatabase);
      setSelectedDatabase(parsedDatabase);
    }
  }, [fetchInstances, fetchDatabases]);

  /** 인스턴스 변경 시 — DB 목록 새로 불러오고 선택 초기화 */
  useEffect(() => {
    if (selectedInstance) {
      localStorage.setItem("selectedInstance", JSON.stringify(selectedInstance));
      fetchDatabases(selectedInstance.instanceId);
      setSelectedDatabase(null);
      localStorage.removeItem("selectedDatabase");
    } else {
      localStorage.removeItem("selectedInstance");
      setDatabases([]);
      setSelectedDatabase(null);
    }
  }, [selectedInstance, fetchDatabases]);

  /** 선택된 DB 변경 시 로컬 저장 */
  useEffect(() => {
    if (selectedDatabase) {
      localStorage.setItem("selectedDatabase", JSON.stringify(selectedDatabase));
    } else {
      localStorage.removeItem("selectedDatabase");
    }
  }, [selectedDatabase]);

  return (
    <InstanceContext.Provider
      value={{
        instances,
        selectedInstance,
        setSelectedInstance,
        databases,
        selectedDatabase,
        setSelectedDatabase,
        refreshInstances: fetchInstances,
        refreshDatabases: fetchDatabases,
      }}
    >
      {children}
    </InstanceContext.Provider>
  );
};

/**  Hook: Context 접근용 */
export const useInstanceContext = () => {
  const ctx = useContext(InstanceContext);
  if (!ctx)
    throw new Error(" instance context 에러 발생");
  return ctx;
};