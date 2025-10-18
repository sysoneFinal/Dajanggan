import React, { useMemo, useState } from "react";
import "../styles/instance.css";

export type NewInstance = {
  host: string;
  instance: string;
  database: string;
  port: number | string;
  username: string;
  password: string;
};

type Props = {
  initialValue?: Partial<NewInstance>;
  onSubmit?: (payload: NewInstance) => Promise<void> | void;
  onTest?: (
    payload: NewInstance
  ) => Promise<{ ok: boolean; message?: string }> | { ok: boolean; message?: string };
  className?: string;
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

export default function NewInstanceForm({
  initialValue,
  onSubmit,
  onTest,
  className = "",
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


  const validate = (): boolean => {
    const next: Partial<Record<keyof NewInstance, string>> = {};
    if (!form.host.trim()) next.host = requiredMsg("host");
    if (!form.instance.trim()) next.instance = requiredMsg("instance");
    if (!form.database.trim()) next.database = requiredMsg("database");
    if (!form.port || Number(form.port) < 1 || Number(form.port) > 65535)
        next.port = "1~65535 사이 정수를 입력하세요.";
    if (!form.username.trim()) next.username = requiredMsg("username");
    if (!form.password) next.password = requiredMsg("password");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const connectionString = useMemo(() => {
    const user = encodeURIComponent(form.username);
    const host = form.host || "";
    const db = form.database || "";
    return `postgresql://${user}:••••••••@${host}:${form.port}/${db}`;
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
      await onSubmit?.(form);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    if (!validate()) return;
    try {
      setTesting(true);
      const res = await onTest?.(form);
      if (res) setTestResult(res);
      else {
        await new Promise((r) => setTimeout(r, 800));
        setTestResult({ ok: true, message: "연결 성공 (mock)" });
      }
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={["nif-root", className].join(" ")}>
      <div className="nif-card">
        <div className="nif-header">
          <h1 className="nif-title">New Instance</h1>
          <p className="nif-sub">Instance 등록을 위한 정보를 입력해주세요.</p>
        </div>

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

            <Field label="Password" error={errors.password}>
              <input
                type="password"
                className={inputCls(!!errors.password)}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </Field>

            <div className="nif-hint">
              연결 문자열 미리보기: <span className="nif-code">{connectionString}</span>
            </div>

            <div className="nif-actions">
              <button
                type="button"
                onClick={handleTest}
                className="btn btn-ghost"
                disabled={submitting || testing}
              >
                {testing ? "Testing…" : "Test"}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || testing}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>

            {testResult && (
              <div
                className={[
                  "nif-alert",
                  testResult.ok ? "is-ok" : "is-error",
                ].join(" ")}
              >
                {testResult.ok ? "연결 테스트 성공" : "연결 테스트 실패"}
                {testResult.message ? ` — ${testResult.message}` : null}
              </div>
            )}
          </div>
        </form>
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
