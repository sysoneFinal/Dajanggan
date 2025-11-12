import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
  const prevInstanceIdRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

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
      prevInstanceIdRef.current = parsedInstance.instanceId;
      fetchDatabases(parsedInstance.instanceId);
    }

    if (savedDatabase) {
      const parsedDatabase = JSON.parse(savedDatabase);
      setSelectedDatabase(parsedDatabase);
    }

    // 초기 로드 완료 표시
    isInitialLoadRef.current = false;
  }, [fetchInstances, fetchDatabases]);

  /** 인스턴스 변경 시 — DB 목록 새로 불러오고 선택 초기화 */
  useEffect(() => {
    if (selectedInstance) {
      const currentInstanceId = selectedInstance.instanceId;
      const prevInstanceId = prevInstanceIdRef.current;

      localStorage.setItem("selectedInstance", JSON.stringify(selectedInstance));
      fetchDatabases(currentInstanceId);

      // 실제로 다른 인스턴스로 변경된 경우에만 데이터베이스 초기화
      // 초기 로드가 아니고, 이전 인스턴스 ID와 다른 경우에만 초기화
      if (!isInitialLoadRef.current && prevInstanceId !== null && prevInstanceId !== currentInstanceId) {
        setSelectedDatabase(null);
        localStorage.removeItem("selectedDatabase");
      }

      prevInstanceIdRef.current = currentInstanceId;
    } else {
      localStorage.removeItem("selectedInstance");
      setDatabases([]);
      setSelectedDatabase(null);
      prevInstanceIdRef.current = null;
    }
  }, [selectedInstance, fetchDatabases]);

  /** 데이터베이스 목록 로드 후 자동 선택 (저장된 DB가 없고 목록이 있으면 첫 번째 선택) */
  useEffect(() => {
    // 데이터베이스 목록이 있고, 선택된 데이터베이스가 없을 때만 실행
    if (databases.length > 0 && !selectedDatabase && selectedInstance) {
      const savedDatabase = localStorage.getItem("selectedDatabase");
      
      // 저장된 데이터베이스가 없으면 첫 번째 데이터베이스 자동 선택
      if (!savedDatabase) {
        const firstDatabase = databases[0];
        setSelectedDatabase(firstDatabase);
      }
    }
  }, [databases, selectedDatabase, selectedInstance]);

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
