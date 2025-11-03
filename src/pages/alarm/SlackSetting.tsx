import React, { useEffect, useRef, useState } from "react";
import "/src/styles/alarm/slack.css"; 
/**
 * Slack 연동 설정 모달 (sl-* 스타일 재사용)
 * - Props: open, onClose, onSave, instances, initialValue
 * - ESC / 바깥 클릭 닫기, Tab 포커스 트랩(간단)
 */

export type SlackSettings = {
  instance: string;
  webhookUrl: string;
  defaultChannel: string;
  mention: string;
  enabled: boolean;
};

export default function SlackSettingsModal({
  open,
  onClose,
  onSave,
  instances = ["postgres", "prod-pg01", "staging-pg", "analytics"],
  initialValue,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: SlackSettings) => void | Promise<void>;
  instances?: string[];
  initialValue?: Partial<SlackSettings>;
}) {
  const [form, setForm] = useState<SlackSettings>({
    instance: initialValue?.instance ?? "postgres",
    webhookUrl: initialValue?.webhookUrl ?? "",
    defaultChannel: initialValue?.defaultChannel ?? "",
    mention: initialValue?.mention ?? "",
    enabled: initialValue?.enabled ?? true,
  });

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      instance: initialValue?.instance ?? prev.instance,
      webhookUrl: initialValue?.webhookUrl ?? prev.webhookUrl,
      defaultChannel: initialValue?.defaultChannel ?? prev.defaultChannel,
      mention: initialValue?.mention ?? prev.mention,
      enabled: initialValue?.enabled ?? prev.enabled,
    }));
  }, [open]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (open) {
      // 포커스 이동
      firstFieldRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const set = (k: keyof SlackSettings, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v } as SlackSettings));

  const submit = async () => {
    await onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOutside}
      className="sl-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="slack-modal-title"
    >
      <div className="sl-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="sl-modal__header">
          <div id="slack-modal-title" className="sl-modal__title">Slack 연동 설정</div>
        </header>

        <div className="sl-modal__body">
          {/* 대상 인스턴스 */}
          <div className="sl-row">
            <div className="sl-label">대상 인스턴스</div>
            <select
              ref={firstFieldRef}
              className="ar-select"
              value={form.instance}
              onChange={(e) => set("instance", e.target.value)}
            >
              {instances.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Webhook URL */}
          <div className="sl-row">
            <div className="sl-label">Slack WebHook URL</div>
            <input
              className="ar-input"
              placeholder="https://www.slack..."
              value={form.webhookUrl}
              onChange={(e) => set("webhookUrl", e.target.value)}
            />
          </div>

          {/* 기본 채널 + 멘션 */}
          <div className="sl-row">
            <div className="sl-label" />
            <div className="sl-field-wrap">
              <div className="sl-field">
                <div className="ar-kicker">기본 채널</div>
                <input
                  className="ar-input"
                  placeholder="#db-alerts"
                  value={form.defaultChannel}
                  onChange={(e) => set("defaultChannel", e.target.value)}
                />
              </div>
              <div className="sl-field">
                <div className="ar-kicker">멘션</div>
                <input
                  className="ar-input"
                  placeholder="@dba-team"
                  value={form.mention}
                  onChange={(e) => set("mention", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 활성화 토글 */}
          <div className="sl-row" style={{ marginTop: 6 }}>
            <div className="sl-label">활성화</div>
            <button
              type="button"
              aria-pressed={form.enabled}
              onClick={() => set("enabled", !form.enabled)}
              className={`sl-toggle ${form.enabled ? "sl-toggle--on" : ""}`}
              title={form.enabled ? "활성화" : "비활성화"}
            >
              <span className="sl-dot"/>
            </button>
          </div>
        </div>

        <footer className="sl-modal__footer">
          <button className="sl-btn" onClick={onClose}>취소</button>
          <button className="sl-btn sl-btn--primary" onClick={submit}>저장</button>
        </footer>
      </div>
    </div>
  );
}

