// 작성자: 김민서
// 알람 규칙 관리 페이지 - 메인 컨테이너
// 역할: 규칙 목록 조회, 생성/수정/삭제 처리, 모달 관리

import { useEffect, useState, useCallback } from "react";
import apiClient from "../../api/apiClient";
import { useInstanceContext } from "../../context/InstanceContext";
import { useLoader } from "../../context/LoaderContext";
import AlarmRuleTable from "./AlarmRuleTable";
import SlackSettingsModal from "./SlackSetting";
import AlarmRuleModal from "./AlarmRuleModal";
import AlarmRuleEditModal from "./AlarmRuleEditModal";
import AlarmRuleDetailModal from "./AlarmRuleDetailModal";
import type { AlarmRulePayload } from "./AlarmRuleModal";
import { CATEGORY_LABELS } from "./AlarmRuleModal";
import "/src/styles/alarm/alarm-list.css";

// ============= Types =============
export type AlarmRuleRow = {
  id: number;
  instanceId: number;
  databaseId: number;
  instanceName: string;
  databaseName: string;
  section: string;
  metricType: string;
  enabled: boolean;
};

type RuleThreshold = {
  threshold: number | null;
  minDurationMin: number | null;
  occurCount: number | null;
  windowMin: number | null;
  resolveThreshold: number | null;
  resolveDurationMin: number | null;
  cooldownMin: number | null;
};

type ServerCreatePayload = {
  instanceId: number | null;
  databaseId: number | null;
  metricType: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
};

type ServerUpdatePayload = {
  alarmRuleId?: number;
  metricCategory?: string;
  metricType?: string;
  operator?: "gt" | "gte" | "lt" | "lte" | "eq";
  enabled: boolean;
  levels: {
    info: RuleThreshold;
    warn: RuleThreshold;
    critical: RuleThreshold;
  };
};

// ============= Utilities =============
// FE 페이로드(warn/danger) -> 서버 페이로드(warn/critical)
function toServerCreatePayload(p: AlarmRulePayload): ServerCreatePayload {
  return {
    instanceId: p.instanceId,
    databaseId: p.databaseId,
    metricType: p.metricType,
    operator: p.operator || "gt",
    enabled: p.enabled,
    levels: {
      info: p.levels.info,
      warn: p.levels.warn,
      critical: p.levels.danger, // danger -> critical
    },
  };
}

// 편집 페이로드를 서버 형식으로 변환
function toServerUpdatePayload(p: any): ServerUpdatePayload {
  const lv = p.levels || {};
  const hasServerKeys = lv.warn && lv.critical;
  const hasClientKeys = lv.warn && lv.danger;

  return {
    alarmRuleId: p.alarmRuleId,
    metricCategory: p.metricCategory,
    metricType: p.metricType,
    operator: p.operator,
    enabled: p.enabled,
    levels: hasServerKeys
      ? { info: lv.info, warn: lv.warn, critical: lv.critical }
      : hasClientKeys
      ? { info: lv.info, warn: lv.warn, critical: lv.danger }
      : lv,
  };
}

// API 응답 -> 테이블 행 변환
function parseRuleRows(data: any[]): AlarmRuleRow[] {
  return data.map((rule: any) => ({
    id: rule.alarmRuleId,
    instanceId: rule.instanceId,
    databaseId: rule.databaseId,
    instanceName: rule.instanceName || "Unknown",
    databaseName: rule.databaseName || "Unknown",
    section: rule.section || "N/A",
    metricType: rule.metricType,
    enabled: rule.enabled ?? false,
  }));
}

// ============= Main Component =============
export default function AlarmRulePage() {
  const { selectedInstance, selectedDatabase } = useInstanceContext();
  const { showLoader, hideLoader } = useLoader();

  const [data, setData] = useState<AlarmRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [openSlack, setOpenSlack] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [detailRuleId, setDetailRuleId] = useState<number | null>(null);

  // 규칙 목록 새로고침
  const refreshRules = useCallback(async () => {
    if (!selectedInstance) return;

    try {
      const params: any = { instanceId: selectedInstance.instanceId };
      if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

      const res = await apiClient.get("/alarms/rules", { params });
      setData(parseRuleRows(res.data.rules || []));
    } catch (error: any) {
      console.error("규칙 목록 새로고침 실패:", error);
    }
  }, [selectedInstance, selectedDatabase]);

  // 초기 목록 조회
  useEffect(() => {
    if (!selectedInstance) {
      setData([]);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = { instanceId: selectedInstance.instanceId };
        if (selectedDatabase) params.databaseId = selectedDatabase.databaseId;

        const res = await apiClient.get("/alarms/rules", { params, signal: ac.signal });
        setData(parseRuleRows(res.data.rules || []));
      } catch (e: any) {
        if (e?.name !== "CanceledError") {
          console.error("규칙 목록 조회 실패:", e);
          setError(e?.response?.data?.message ?? "알림 규칙 조회 실패");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [selectedInstance, selectedDatabase]);

  // 로딩 상태 관리
  useEffect(() => {
    if (loading) {
      showLoader("알람 규칙 목록을 불러오는 중...");
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  // 규칙 생성
  const handleCreateRule = useCallback(
    async (payload: AlarmRulePayload) => {
      const categoryLabel = CATEGORY_LABELS[payload.metricCategory];

      // 중복 체크
      const isDuplicate = data.some(
        (rule) =>
          rule.instanceId === payload.instanceId &&
          rule.databaseId === payload.databaseId &&
          rule.section === categoryLabel &&
          rule.metricType === payload.metricType
      );

      if (isDuplicate) {
        alert("동일한 인스턴스, 데이터베이스, 카테고리, 지표를 가진 알림 규칙이 이미 존재합니다.");
        return;
      }

      try {
        const serverPayload = toServerCreatePayload(payload);
        await apiClient.post("/alarms/rules", serverPayload);
        await refreshRules();
        alert("알림 규칙이 생성되었습니다.");
      } catch (e: any) {
        console.error("규칙 생성 실패:", e);
        const errorMessage = e?.response?.data?.message || e?.message || "";
        if (
          errorMessage.includes("중복") ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("already exists")
        ) {
          alert("동일한 인스턴스, 데이터베이스, 카테고리, 지표를 가진 알림 규칙이 이미 존재합니다.");
        } else {
          alert(`알림 규칙 생성에 실패했습니다: ${errorMessage || "알 수 없는 오류"}`);
        }
      }
    },
    [data, refreshRules]
  );

  // 규칙 수정
  const handleUpdateRule = useCallback(
    async (payload: any) => {
      if (!editingRuleId) return;

      try {
        const serverPayload = toServerUpdatePayload(payload);
        await apiClient.put(`/alarms/rules/${editingRuleId}`, serverPayload);
        await refreshRules();
        setOpenEdit(false);
        setEditingRuleId(null);
        alert("알림 규칙이 수정되었습니다.");
      } catch (e: any) {
        console.error("규칙 수정 실패:", e);
        alert(`알림 규칙 수정에 실패했습니다: ${e?.response?.data?.message || e.message}`);
      }
    },
    [editingRuleId, refreshRules]
  );

  // 규칙 삭제
  const handleDeleteRule = useCallback(
    async (id: number) => {
      if (!confirm("이 규칙을 삭제하시겠습니까?")) return;

      try {
        await apiClient.delete(`/alarms/rules/${id}`);
        setData((prev) => prev.filter((r) => r.id !== id));
        alert("규칙이 삭제되었습니다.");
      } catch (e: any) {
        console.error("규칙 삭제 실패:", e);
        alert("규칙 삭제에 실패했습니다.");
      }
    },
    []
  );

  // 편집 모달에서 삭제
  const handleDeleteFromEdit = useCallback(async () => {
    if (!editingRuleId) return;
    await handleDeleteRule(editingRuleId);
    setOpenEdit(false);
    setEditingRuleId(null);
  }, [editingRuleId, handleDeleteRule]);

  // 수정 버튼 클릭
  const handleEdit = useCallback((id: number) => {
    setEditingRuleId(id);
    setOpenEdit(true);
  }, []);

  // 행 클릭 (상세)
  const handleRowClick = useCallback((id: number) => {
    setDetailRuleId(id);
    setOpenDetail(true);
  }, []);

  // 상세에서 수정으로 이동
  const handleEditFromDetail = useCallback((ruleId: number) => {
    setOpenDetail(false);
    setEditingRuleId(ruleId);
    setOpenEdit(true);
  }, []);

  if (!selectedInstance) {
    return (
      <main className="alarm-page">
        <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
          <p style={{ fontSize: "18px", fontWeight: "500" }}>Instance를 선택해주세요</p>
        </div>
      </main>
    );
  }

  return (
    <main className="alarm-page">
      <AlarmRuleTable
        data={data}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDeleteRule}
        onRowClick={handleRowClick}
        onOpenSlack={() => setOpenSlack(true)}
        onOpenCreate={() => setOpenCreate(true)}
      />

      {/* 모달들 */}
      <SlackSettingsModal
        open={openSlack}
        onClose={() => setOpenSlack(false)}
        instanceId={selectedInstance?.instanceId ?? null}
        instanceName={selectedInstance?.instanceName}
      />

      <AlarmRuleModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        mode="create"
        onSubmit={handleCreateRule}
      />

      <AlarmRuleEditModal
        open={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setEditingRuleId(null);
        }}
        ruleId={editingRuleId ?? undefined}
        onSubmit={handleUpdateRule}
        onDelete={handleDeleteFromEdit}
      />

      <AlarmRuleDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        ruleId={detailRuleId ?? undefined}
        onEdit={handleEditFromDetail}
      />
    </main>
  );
}
