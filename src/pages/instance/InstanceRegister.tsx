import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/instance/instance.css";
import "/src/styles/instance/instance-register.css";
import "/src/styles/instance/instance-modal.css";

import apiClient from "../../api/apiClient";

export type NewInstance = {
  host: string;
  instance: string;
  port: number | string;
  userName: string;
  password: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialValue?: Partial<NewInstance>;
  onSubmit?: (payload: NewInstance) => Promise<void> | void;
  mode?: 'create' | 'edit';
  instanceId?: string | number;
};

const fieldLabel = {
  host: "Host",
  instance: "Instance",
  port: "Port",
  userName: "Username",
  password: "Password",
} as const;

const requiredMsg = (k: keyof typeof fieldLabel) => `${fieldLabel[k]} 값이 필요합니다.`;

const toInstanceDto = (f: NewInstance) => ({
  host: f.host,
  instanceName: f.instance,
  port: Number(f.port),
  userName: f.userName,
  secretRef: f.password,
});

export default function NewInstanceModal({
  open,
  onClose,
  initialValue,
  onSubmit,
  mode = 'create',
  instanceId,
}: Props) {
  const [form, setForm] = useState<NewInstance>({
    host: initialValue?.host ?? "",
    instance: initialValue?.instance ?? "",
    port: initialValue?.port ?? "",
    userName: initialValue?.userName ?? "",
    password: initialValue?.password ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewInstance, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message?: string }>(null);
  const [connectionTested, setConnectionTested] = useState(false); // 연결 테스트 완료 여부
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue) {
      setForm({
        host: initialValue.host ?? "",
        instance: initialValue.instance ?? "",
        port: initialValue.port ?? "",
        userName: initialValue.userName ?? "",
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
    if (!form.port || Number(form.port) < 1 || Number(form.port) > 65535)
      next.port = "1~65535 사이 정수를 입력하세요.";
    if (!form.userName.trim()) next.userName = requiredMsg("userName");
    if (mode === 'create' && !form.password) {
      next.password = requiredMsg("password");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const connectionString = useMemo(() => {
    const user = encodeURIComponent(form.userName);
    const host = form.host || "";
    return `postgresql://${user}:@${host}:${form.port}`;
  }, [form]);

  const handleChange = (key: keyof NewInstance, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "port" ? Number(value.replace(/[^0-9]/g, "")) : value,
    }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    // 폼이 변경되면 다시 테스트해야 함
    setConnectionTested(false);
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // 생성 모드에서는 연결 테스트 필수
    if (mode === 'create' && !connectionTested) {
      alert('먼저 연결 테스트를 완료해주세요.');
      return;
    }
    
    try {
      setSubmitting(true);

      if (onSubmit) {
        await onSubmit(form);
      } else {
        if (mode === 'edit' && instanceId) {
          const payload: any = {
            host: form.host,
            instanceName: form.instance,
            port: Number(form.port),
            userName: form.userName,
            sslmode: "require",
            isEnabled: true,
          };
          if (form.password && form.password.trim()) {
            payload.secretRef = form.password;
          }
          await apiClient.put(`/instances/${instanceId}`, payload);
          alert(`수정 성공!`);
        } else {
          const payload = toInstanceDto(form);
          const res = await apiClient.post("/instances", payload);
          alert(`등록 성공! ID: ${res.data?.instanceId ?? "unknown"}`);
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
    setConnectionTested(false);
    
    if (!validate()) return;
    
    try {
      setTesting(true);

      // 백엔드 연결 테스트 API 호출
      const payload = {
        host: form.host,
        instanceName: form.instance,
        port: Number(form.port),
        userName: form.userName,
        secretRef: form.password,
      };
      
      const res = await apiClient.post("/instances/test-connection", payload);
      
      if (res.data.success) {
        setTestResult({ 
          ok: true, 
          message: res.data.message + (res.data.version ? ` (PostgreSQL ${res.data.version})` : '')
        });
        setConnectionTested(true);
      } else {
        setTestResult({ 
          ok: false, 
          message: res.data.message 
        });
        setConnectionTested(false);
      }
    } catch (e: any) {
      console.error('연결 테스트 실패:', e);
      setTestResult({ 
        ok: false, 
        message: e?.response?.data?.message ?? e?.message ?? "연결 테스트 실패" 
      });
      setConnectionTested(false);
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  const title = mode === 'edit' ? 'Edit Instance' : 'New Instance';
  const submitLabel = mode === 'edit' ? 'Update' : 'Submit';
  const canSubmit = mode === 'edit' || connectionTested; // 편집 모드이거나 연결 테스트 성공

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
            {mode === 'create' && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: '#9ca3af' }}>
                * 등록 전 연결 테스트를 완료해야 합니다.
              </span>
            )}
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

              <Field label="Port" error={errors.port}>
                <input
                  className={inputCls(!!errors.port)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(form.port)}
                  onChange={(e) => handleChange("port", e.target.value)}
                />
              </Field>

              <Field label="Username" error={errors.userName}>
                <input
                  className={inputCls(!!errors.userName)}
                  value={form.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <input
                  type="password"
                  className={inputCls(!!errors.password)}
                  placeholder={mode === 'edit' ? "반드시 비밀번호를 입력하세요" : ""}
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
            disabled={submitting || testing || !canSubmit}
            title={mode === 'create' && !connectionTested ? '먼저 연결 테스트를 완료해주세요' : ''}
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