import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../api/apiClient";
import NewInstanceModal from "./InstanceRegister";
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
  const { id } = useParams();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InstanceDetailDto | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<InstanceDetailDto>(`/api/instances/${id}`);
        if (!mounted) return;
        setDetail(res.data);
        setOpen(true); // 데이터 로드 후 모달 열기
      } catch (e: any) {
        alert(`조회 실패: ${e?.response?.data?.message ?? e?.message}`);
        navigate("/instance-management");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, navigate]);

  const handleClose = () => {
    setOpen(false);
    navigate("/instance-management"); // 모달 닫으면 목록으로
  };

  const handleSubmit = async (form: NewInstance) => {
    const payload: any = {
      host: form.host,
      instanceName: form.instance,
      dbname: form.database,
      port: Number(form.port),
      username: form.username,
      sslmode: "require",
      isEnabled: true,
    };
    if (form.password?.trim()) {
      payload.secretRef = form.password;
    }

    await apiClient.put(`/api/instances/${id}`, payload);
    alert("수정 완료!");
  };

  if (loading) return <div>Loading...</div>;

  const initialValue: Partial<NewInstance> | undefined = detail ? {
    host: detail.host,
    instance: detail.instanceName,
    database: detail.dbname,
    port: detail.port,
    username: detail.username,
    password: "",
  } : undefined;

  return (
    <NewInstanceModal
      open={open}
      onClose={handleClose}
      initialValue={initialValue}
      onSubmit={handleSubmit}
      mode="edit"
      instanceId={id}
    />
  );
}