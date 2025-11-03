import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/instance/instance.css";
import "/src/styles/instance/instance-register.css";
import "/src/styles/instance/instance-modal.css";

import apiClient from "../../api/apiClient";

export type NewInstance = {
  host: string;
  instance: string;
  database: string;
  port: number | string;
  username: string;
  password: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialValue?: Partial<NewInstance>;
  onSubmit?: (payload: NewInstance) => Promise<void> | void;
  onTest?: (
    payload: NewInstance
  ) => Promise<{ ok: boolean; message?: string }> | { ok: boolean; message?: string };
  mode?: 'create' | 'edit'; // 추가: 생성/편집 모드 구분
  instanceId?: string | number; // 추가: 편집 시 필요한 ID
};

const fieldLabel = {
  host: "Host",
  instance: "Instance",
  database: "Database",
  port: "Port",
  username: "Username",
  password: "Password",
} as const;

const requiredMsg = (k: keyof typeof fieldLabel) => `${fieldLabel[k]} 값이 필요합니다.`;

// 백엔드 DTO로 매핑
const toInstanceDto = (f: NewInstance) => ({
  host: f.host,
  instanceName: f.instance,
  dbname: f.database,
  port: Number(f.port),
  username: f.username,
  secretRef: f.password,
  ssimode: "require",
  isEnabled: true,
  slackEnabled: false,
  slackChannel: undefined,
  slackMention: undefined,
  slackWebhookUrl: undefined
});

export default function NewInstanceModal({
  open,
  onClose,
  initialValue,
  onSubmit,
  onTest,
  mode = 'create',
  instanceId,
}: Props) {
  const [form, setForm] = useState<NewInstance>({
    host: initialValue?.host ?? "",
    instance: initialValue?.instance ?? "",
    database: initialValue?.database ?? "",
    port: initialValue?.port ?? "",
    username: initialValue?.username ?? "",
    password: initialValue?.password ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewInstance, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message?: string }>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // initialValue가 변경되면 form 업데이트 (편집 모드에서 데이터 로드 시)
  useEffect(() => {
    if (initialValue) {
      setForm({
        host: initialValue.host ?? "",
        instance: initialValue.instance ?? "",
        database: initialValue.database ?? "",
        port: initialValue.port ?? "",
        username: initialValue.username ?? "",
        password: initialValue.password ?? "",
      });
    }
  }, [initialValue]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof NewInstance, string>> = {};
    if (!form.host.trim()) next.host = requiredMsg("host");
    if (!form.instance.trim()) next.instance = requiredMsg("instance");
    if (!form.database.trim()) next.database = requiredMsg("database");
    if (!form.port || Number(form.port) < 1 || Number(form.port) > 65535)
      next.port = "1~65535 사이 정수를 입력하세요.";
    if (!form.username.trim()) next.username = requiredMsg("username");
    // 편집 모드에서는 비밀번호가 비어있어도 OK (변경하지 않는 경우)
    if (mode === 'create' && !form.password) {
      next.password = requiredMsg("password");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const connectionString = useMemo(() => {
    const user = encodeURIComponent(form.username);
    const host = form.host || "";
    const db = form.database || "";
    return `postgresql://${user}:@${host}:${form.port}/${db}`;
  }, [form]);

  const handleChange = (key: keyof NewInstance, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "port" ? Number(value.replace(/[^0-9]/g, "")) : value,
    }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    if (!validate()) return;
    try {
      setSubmitting(true);

      if (onSubmit) {
        await onSubmit(form);
      } else {
        if (mode === 'edit' && instanceId) {
          // 편집 모드: PUT 요청
          const payload: any = {
            host: form.host,
            instanceName: form.instance,
            dbname: form.database,
            port: Number(form.port),
            username: form.username,
            ssimode: "require",
            isEnabled: true,
          };
          // 비밀번호가 입력된 경우에만 포함
          if (form.password && form.password.trim()) {
            payload.secretRef = form.password;
          }
          const res = await apiClient.put(`/api/instances/${instanceId}`, payload);
          alert(`수정 성공!`);
        } else {
          // 생성 모드: POST 요청
          const payload = toInstanceDto(form);
          const res = await apiClient.post("/api/instances", payload);
          alert(`등록 성공! ID: ${res.data?.id ?? "unknown"}`);
        }
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      const action = mode === 'edit' ? '수정' : '등록';
      alert(`${action} 실패: ${err?.response?.data?.message ?? err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    if (!validate()) return;
    try {
      setTesting(true);

      if (onTest) {
        const res = await onTest(form);
        setTestResult(res);
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setTestResult({ ok: true, message: "연결 성공 (mock)" });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message ?? "테스트 실패" });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  const title = mode === 'edit' ? 'Edit Instance' : 'New Instance';
  const submitLabel = mode === 'edit' ? 'Update' : 'Submit';

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="im-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div className="im-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <header className="im-modal__header">
          <div className="im-modal__title">{title}</div>
          <button className="im-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="im-modal__body">
          <p style={{ marginBottom: "24px", color: "#6b7280", fontSize: "14px" }}>
            Instance {mode === 'edit' ? '수정' : '등록'}을 위한 정보를 입력해주세요.
            {mode === 'edit' && <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#9ca3af' }}>
          
            </span>}
          </p>

          <form onSubmit={handleSubmit} className="nif-form">
            <div className="nif-grid">
              <Field label="Host" error={errors.host}>
                <input
                  className={inputCls(!!errors.host)}
                  placeholder="호스트 명을 입력하세요"
                  value={form.host}
                  onChange={(e) => handleChange("host", e.target.value)}
                />
              </Field>

              <Field label="Instance" error={errors.instance}>
                <input
                  className={inputCls(!!errors.instance)}
                  value={form.instance}
                  onChange={(e) => handleChange("instance", e.target.value)}
                />
              </Field>

              <Field label="Database" error={errors.database}>
                <input
                  className={inputCls(!!errors.database)}
                  value={form.database}
                  onChange={(e) => handleChange("database", e.target.value)}
                />
              </Field>

              <Field label="Port" error={errors.port}>
                <input
                  className={inputCls(!!errors.port)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(form.port)}
                  onChange={(e) => handleChange("port", e.target.value)}
                />
              </Field>

              <Field label="Username" error={errors.username}>
                <input
                  className={inputCls(!!errors.username)}
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                />
              </Field>

              <Field 
                label="Password" 
                error={errors.password}
              >
                <input
                  type="password"
                  className={inputCls(!!errors.password)}
                  placeholder={mode === 'edit' ? '변경하지 않으려면 비워두세요' : ''}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </Field>

              <div className="nif-hint">
                연결 문자열 미리보기: <span className="nif-code">{connectionString}</span>
              </div>

              {testResult && (
                <div
                  className={[
                    "nif-alert",
                    testResult.ok ? "is-ok" : "is-error",
                  ].join(" ")}
                >
                  {testResult.ok ? "✓ 연결 테스트 성공" : "✗ 연결 테스트 실패"}
                  {testResult.message ? ` — ${testResult.message}` : null}
                </div>
              )}
            </div>
          </form>
        </div>

        <footer className="im-modal__footer">
          <button
            type="button"
            onClick={handleTest}
            className="im-btn"
            disabled={submitting || testing}
          >
            {testing ? "Testing…" : "Test"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="im-btn im-btn--primary"
            disabled={submitting || testing}
          >
            {submitting ? `${submitLabel}ting…` : submitLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="nif-field">
      <span className="nif-label">{label}</span>
      {children}
      {error ? <span className="nif-error">{error}</span> : null}
    </label>
  );
}

function inputCls(hasError?: boolean) {
  return ["nif-input", hasError ? "has-error" : ""].join(" ");
}