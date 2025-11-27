// 작성자: 김민서
// 인스턴스 등록/수정 모달 컴포넌트
// 역할: 인스턴스 정보 입력, 유효성 검증, 연결 테스트, 등록/수정 처리

import React, { useEffect, useMemo, useRef, useState } from "react";
import "/src/styles/instance/instance.css";
import "/src/styles/instance/instance-register.css";
import "/src/styles/instance/instance-modal.css";

import apiClient from "../../api/apiClient";


// ============= Types =============
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
  mode?: "create" | "edit";
  instanceId?: string | number;
};

type ValidationErrors = Partial<Record<keyof NewInstance, string>>;

type TestResult = {
  ok: boolean;
  message?: string;
};

type InstancePayload = {
  host: string;
  instanceName: string;
  port: number;
  userName: string;
  isEnabled: boolean;
  secretRef?: string;
};

// ============= Constants =============
const FIELD_LABELS = {
  host: "Host",
  instance: "Instance",
  port: "Port",
  userName: "Username",
  password: "Password",
} as const;

const ERROR_MESSAGES = {
  REQUIRED: (label: string) => `${label} 값이 필요합니다.`,
  INVALID_PORT: "1~65535 사이 정수를 입력하세요.",
  TEST_REQUIRED: "먼저 연결 테스트를 완료해주세요.",
  TEST_FAILED: "연결 테스트 실패",
} as const;

const SUCCESS_MESSAGES = {
  CREATE: (id: string) => `등록 성공! ID: ${id}`,
  UPDATE: "수정 성공!",
  TEST_SUCCESS: "✓ 연결 테스트 성공",
  TEST_FAILED: "✗ 연결 테스트 실패",
} as const;

const PORT_RANGE = {
  MIN: 1,
  MAX: 65535,
} as const;

const MODAL_CONFIG = {
  create: {
    title: "New Instance",
    submitLabel: "Submit",
    description: "Instance 등록을 위한 정보를 입력해주세요.",
    testRequiredNote: "* 등록 전 연결 테스트를 완료해야 합니다.",
  },
  edit: {
    title: "Edit Instance",
    submitLabel: "Update",
    description: "Instance 수정을 위한 정보를 입력해주세요.",
    testRequiredNote: "",
  },
} as const;

// ============= Utilities =============
const getRequiredMessage = (key: keyof typeof FIELD_LABELS): string =>
  ERROR_MESSAGES.REQUIRED(FIELD_LABELS[key]);

const toInstanceDto = (form: NewInstance) => ({
  host: form.host,
  instanceName: form.instance,
  port: Number(form.port),
  userName: form.userName,
  secretRef: form.password,
});

const buildConnectionString = (
  userName: string,
  host: string,
  port: number | string
): string => {
  const user = encodeURIComponent(userName);
  return `postgresql://${user}:@${host || ""}:${port}`;
};

const isValidPort = (port: number | string): boolean => {
  const portNum = Number(port);
  return portNum >= PORT_RANGE.MIN && portNum <= PORT_RANGE.MAX;
};

const sanitizePortInput = (value: string): number => {
  return Number(value.replace(/[^0-9]/g, ""));
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function NewInstanceModal({
  open,
  onClose,
  initialValue,
  onSubmit,
  mode = "create",
  instanceId,
}: Props) {
  // 상태 관리
  const [form, setForm] = useState<NewInstance>({
    host: initialValue?.host ?? "",
    instance: initialValue?.instance ?? "",
    port: initialValue?.port ?? "",
    userName: initialValue?.userName ?? "",
    password: initialValue?.password ?? "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // initialValue 변경 시 폼 업데이트
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

  // ESC 키 핸들러
  useEffect(() => {
    if (!open) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [open, onClose]);

  // ============================================================================
  // 계산된 값
  // ============================================================================

  const connectionString = useMemo(
    () => buildConnectionString(form.userName, form.host, form.port),
    [form.userName, form.host, form.port]
  );

  const modalConfig = MODAL_CONFIG[mode];
  const canSubmit = mode === "edit" || connectionTested;

  // ============================================================================
  // 유효성 검증
  // ============================================================================

  const validate = (): boolean => {
    const nextErrors: ValidationErrors = {};

    if (!form.host.trim()) {
      nextErrors.host = getRequiredMessage("host");
    }

    if (!form.instance.trim()) {
      nextErrors.instance = getRequiredMessage("instance");
    }

    if (!form.port || !isValidPort(form.port)) {
      nextErrors.port = ERROR_MESSAGES.INVALID_PORT;
    }

    if (!form.userName.trim()) {
      nextErrors.userName = getRequiredMessage("userName");
    }

    if (mode === "create" && !form.password) {
      nextErrors.password = getRequiredMessage("password");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

 
// ============= Event handler =============
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleChange = (key: keyof NewInstance, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "port" ? sanitizePortInput(value) : value,
    }));

    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setConnectionTested(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTestResult(null);
    setConnectionTested(false);

    if (!validate()) return;

    try {
      setTesting(true);

      const payload = toInstanceDto(form);
      const res = await apiClient.post("/instances/test-connection", payload);

      if (res.data.success) {
        const message =
          res.data.message +
          (res.data.version ? ` (PostgreSQL ${res.data.version})` : "");
        setTestResult({ ok: true, message });
        setConnectionTested(true);
      } else {
        setTestResult({ ok: false, message: res.data.message });
        setConnectionTested(false);
      }
    } catch (error: any) {
      console.error("연결 테스트 실패:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        ERROR_MESSAGES.TEST_FAILED;
      setTestResult({ ok: false, message });
      setConnectionTested(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (mode === "create" && !connectionTested) {
      alert(ERROR_MESSAGES.TEST_REQUIRED);
      return;
    }

    try {
      setSubmitting(true);

      if (onSubmit) {
        await onSubmit(form);
      } else {
        if (mode === "edit" && instanceId) {
          await handleEditInstance();
        } else {
          await handleCreateInstance();
        }
      }

      onClose();
    } catch (error: any) {
      console.error(error);
      const action = mode === "edit" ? "수정" : "등록";
      const message =
        error?.response?.data?.message || error.message || `${action} 실패`;
      alert(`${action} 실패: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInstance = async () => {
    if (!instanceId) return;

    const payload: InstancePayload = {
      host: form.host,
      instanceName: form.instance,
      port: Number(form.port),
      userName: form.userName,
      isEnabled: true,
    };

    if (form.password?.trim()) {
      payload.secretRef = form.password;
    }

    await apiClient.put(`/instances/${instanceId}`, payload);
    alert(SUCCESS_MESSAGES.UPDATE);
  };

  const handleCreateInstance = async () => {
    const payload = toInstanceDto(form);
    const res = await apiClient.post("/instances", payload);
    const id = res.data?.instanceId ?? "unknown";
    alert(SUCCESS_MESSAGES.CREATE(id));
  };

  
// ============= randering =============
  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutsideClick}
      className="im-overlay"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="im-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: 700 }}
      >
        <header className="im-modal__header">
          <div className="im-modal__title">{modalConfig.title}</div>
          <button className="im-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="im-modal__body">
          <p
            style={{
              marginBottom: "24px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            {modalConfig.description}
            {modalConfig.testRequiredNote && (
              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "13px",
                  color: "#9ca3af",
                }}
              >
                {modalConfig.testRequiredNote}
              </span>
            )}
          </p>

          <form onSubmit={handleSubmit} className="nif-form">
            <div className="nif-grid">
              <Field label="Host" error={errors.host}>
                <input
                  className={getInputClassName(!!errors.host)}
                  placeholder="호스트 명을 입력하세요"
                  value={form.host}
                  onChange={(e) => handleChange("host", e.target.value)}
                />
              </Field>

              <Field label="Instance" error={errors.instance}>
                <input
                  className={getInputClassName(!!errors.instance)}
                  value={form.instance}
                  onChange={(e) => handleChange("instance", e.target.value)}
                />
              </Field>

              <Field label="Port" error={errors.port}>
                <input
                  className={getInputClassName(!!errors.port)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(form.port)}
                  onChange={(e) => handleChange("port", e.target.value)}
                />
              </Field>

              <Field label="Username" error={errors.userName}>
                <input
                  className={getInputClassName(!!errors.userName)}
                  value={form.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                />
              </Field>

              <Field label="Password" error={errors.password}>
                <input
                  type="password"
                  className={getInputClassName(!!errors.password)}
                  placeholder={
                    mode === "edit" ? "반드시 비밀번호를 입력하세요" : ""
                  }
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </Field>

              <div className="nif-hint">
                연결 문자열 미리보기:{" "}
                <span className="nif-code">{connectionString}</span>
              </div>

              {testResult && (
                <div
                  className={[
                    "nif-alert",
                    testResult.ok ? "is-ok" : "is-error",
                  ].join(" ")}
                >
                  {testResult.ok
                    ? SUCCESS_MESSAGES.TEST_SUCCESS
                    : SUCCESS_MESSAGES.TEST_FAILED}
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
            title={
              mode === "create" && !connectionTested
                ? ERROR_MESSAGES.TEST_REQUIRED
                : ""
            }
          >
            {submitting
              ? `${modalConfig.submitLabel}ting…`
              : modalConfig.submitLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}


// ============= Sub components =============
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

function getInputClassName(hasError?: boolean): string {
  return ["nif-input", hasError ? "has-error" : ""].join(" ");
}