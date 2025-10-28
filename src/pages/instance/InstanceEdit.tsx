import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/apiClient";
import NewInstancePage from "./InstanceRegister";
import type { NewInstance } from "./InstanceRegister";

type InstanceDetailDto = {
  instanceId: string | number;
  host: string;
  instanceName: string;
  dbname: string;
  port: number;
  username: string;
  sslmode?: string;
  isEnabled?: boolean;
};

export default function EditInstancePage() {
  const { id } = useParams(); // /instances/:id/edit
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InstanceDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) 상세 불러오기
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<InstanceDetailDto>(`/api/instances/${id}`);
        if (!mounted) return;
        setDetail(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? e?.message ?? "상세 조회 실패");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // 2) NewInstancePage의 initialValue로 변환
  const initialValue: Partial<NewInstance> | undefined = useMemo(() => {
    if (!detail) return undefined;
    return {
      host: detail.host ?? "",
      instance: detail.instanceName ?? "",
      database: detail.dbname ?? "",
      port: detail.port ?? "",
      username: detail.username ?? "",
      // password는 서버에서 내려주지 않는 게 일반적 → 빈 값
      password: "",
    };
  }, [detail]);

  // 3) 제출(수정) 핸들러 – PUT
  const handleSubmit = async (form: NewInstance) => {
    // 업데이트 DTO(비밀번호 빈 값이면 제외)
    const payload: any = {
      host: form.host,
      instanceName: form.instance,
      dbname: form.database,
      port: Number(form.port),
      username: form.username,
      sslmode: "require",
      isEnabled: true,
      // 필요한 필드만 유지
    };
    if (form.password && form.password.trim().length > 0) {
      payload.secretRef = form.password; // 비번 변경시에만 전송
    }

    await apiClient.put(`/api/instances/${id}`, payload);
    alert("수정 완료!");
    navigate("/instance-management"); // 목록으로 이동
  };

  if (loading) return <div className="nif-root"><div className="nif-card">불러오는 중…</div></div>;
  if (error)   return <div className="nif-root"><div className="nif-card">오류: {error}</div></div>;
  if (!detail) return <div className="nif-root"><div className="nif-card">데이터가 없습니다.</div></div>;

  // 4) 재사용: 제목만 바꾸고, onSubmit만 교체
  return (
    <NewInstancePage
      initialValue={initialValue}
      onSubmit={handleSubmit}
      className="edit-instance"
    />
  );
}

