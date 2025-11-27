// 작성자: 김민서
// 인스턴스 수정 페이지 컴포넌트
// 역할: 인스턴스 상세 조회 및 수정 모달 표시

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../api/apiClient";
import NewInstanceModal from "./InstanceRegister";
import type { NewInstance } from "./InstanceRegister";

// 타입 정의
type InstanceDetailDto = {
  instanceId: string | number;
  host: string;
  instanceName: string;
  dbname: string;
  port: number;
  userName: string;
  sslmode?: string;
  isEnabled?: boolean;
};

type InstanceUpdatePayload = {
  host: string;
  instanceName: string;
  port: number;
  userName: string;
  isEnabled: boolean;
  secretRef?: string;
};

// 상수 정의
const ROUTES = {
  INSTANCE_LIST: "/instance-management",
} as const;

const ERROR_MESSAGES = {
  FETCH_FAILED: "인스턴스 조회에 실패했습니다",
  UPDATE_SUCCESS: "수정이 완료되었습니다",
} as const;

export default function EditInstancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InstanceDetailDto | null>(null);

  // 인스턴스 상세 조회
  useEffect(() => {
    let mounted = true;

    const fetchInstanceDetail = async () => {
      if (!id) {
        navigate(ROUTES.INSTANCE_LIST);
        return;
      }

      try {
        setLoading(true);
        const res = await apiClient.get<InstanceDetailDto>(`/instances/${id}`);
        
        if (!mounted) return;
        
        setDetail(res.data);
        setOpen(true);
      } catch (error: any) {
        if (!mounted) return;
        
        const errorMessage = error?.response?.data?.message || error?.message || ERROR_MESSAGES.FETCH_FAILED;
        alert(`${ERROR_MESSAGES.FETCH_FAILED}: ${errorMessage}`);
        navigate(ROUTES.INSTANCE_LIST);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInstanceDetail();

    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  // 모달 닫기 핸들러
  const handleClose = () => {
    setOpen(false);
    navigate(ROUTES.INSTANCE_LIST);
  };

  // 인스턴스 수정 제출 핸들러
  const handleSubmit = async (form: NewInstance) => {
    if (!id) return;

    const payload: InstanceUpdatePayload = {
      host: form.host,
      instanceName: form.instance,
      port: Number(form.port),
      userName: form.userName,
      isEnabled: true,
    };

    // 비밀번호가 입력된 경우에만 포함
    if (form.password?.trim()) {
      payload.secretRef = form.password;
    }

    try {
      await apiClient.put(`/instances/${id}`, payload);
      alert(ERROR_MESSAGES.UPDATE_SUCCESS);
      handleClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "수정에 실패했습니다";
      alert(errorMessage);
      throw error;
    }
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <div>Loading...</div>
      </div>
    );
  }

  // 초기값 변환
  const getInitialValue = (): Partial<NewInstance> | undefined => {
    if (!detail) return undefined;

    return {
      host: detail.host,
      instance: detail.instanceName,
      port: detail.port,
      userName: detail.userName,
      password: "",
    };
  };

  return (
    <NewInstanceModal
      open={open}
      onClose={handleClose}
      initialValue={getInitialValue()}
      onSubmit={handleSubmit}
      mode="edit"
      instanceId={id}
    />
  );
}