// 작성자: 김민서
// Slack 연동 설정 모달
// 역할: Slack Webhook 설정 조회/생성/수정/삭제
// 기능: 읽기 모드와 수정 모드 지원

import { useEffect, useRef, useState, useCallback } from "react";
import "/src/styles/alarm/slack.css";
import apiClient from "../../api/apiClient";

// ============= Types =============
export type SlackSettings = {
  webhookUrl: string;
  defaultChannel: string;
  mention: string;
  enabled: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: number | null;
  instanceName?: string;
};

// ============= Constants =============
const INITIAL_SETTINGS: SlackSettings = {
  webhookUrl: "",
  defaultChannel: "",
  mention: "",
  enabled: true,
};

// ============= Main Component =============
export default function SlackSettingsModal({ open, onClose, instanceId, instanceName }: Props) {
  const [form, setForm] = useState<SlackSettings>(INITIAL_SETTINGS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // 설정 조회
  useEffect(() => {
    if (!open || !instanceId) {
      setIsEditMode(false);
      setHasSettings(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/instances/slack-settings/${instanceId}`);
        const settings = res.data;

        if (settings && (settings.webhookUrl || settings.defaultChannel || settings.mention)) {
          setForm({
            webhookUrl: settings.webhookUrl || "",
            defaultChannel: settings.defaultChannel || "",
            mention: settings.mention || "",
            enabled: settings.enabled ?? true,
          });
          setHasSettings(true);
        } else {
          setForm(INITIAL_SETTINGS);
          setHasSettings(false);
        }
        setIsEditMode(false);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setForm(INITIAL_SETTINGS);
          setHasSettings(false);
        } else {
          console.error("설정 조회 실패:", error);
          alert("슬랙 설정 조회에 실패했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [open, instanceId]);

  // ESC 키 처리 및 포커스
  useEffect(() => {
    if (open && isEditMode) {
      firstFieldRef.current?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isEditMode]);

  const handleOutside = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      if (isEditMode) {
        setIsEditMode(false);
      } else {
        onClose();
      }
    }
  };

  const updateField = useCallback((key: keyof SlackSettings, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const handleCancel = useCallback(() => {
    // 원래 설정 다시 불러오기
    if (instanceId) {
      apiClient
        .get(`/instances/slack-settings/${instanceId}`)
        .then((res) => {
          const settings = res.data;
          if (settings) {
            setForm({
              webhookUrl: settings.webhookUrl || "",
              defaultChannel: settings.defaultChannel || "",
              mention: settings.mention || "",
              enabled: settings.enabled ?? true,
            });
          }
        })
        .catch(() => {
          // 에러 무시
        });
    }
    setIsEditMode(false);
  }, [instanceId]);

  const handleSubmit = useCallback(async () => {
    if (!instanceId) return;

    try {
      setLoading(true);
      await apiClient.put(`/instances/slack-settings/${instanceId}`, {
        webhookUrl: form.webhookUrl,
        defaultChannel: form.defaultChannel,
        mention: form.mention,
        enabled: form.enabled,
      });

      setHasSettings(true);
      setIsEditMode(false);
      alert("슬랙 설정이 저장되었습니다.");
    } catch (error: any) {
      console.error("설정 저장 실패:", error);
      alert(
        `슬랙 설정 저장에 실패했습니다: ${error?.response?.data?.message || error?.message || "알 수 없는 오류"}`
      );
    } finally {
      setLoading(false);
    }
  }, [instanceId, form]);

  const handleDelete = useCallback(async () => {
    if (!instanceId) return;

    if (!confirm("슬랙 연동 설정을 삭제하시겠습니까?")) return;

    try {
      setLoading(true);
      await apiClient.delete(`/instances/slack-settings/${instanceId}`);

      setHasSettings(false);
      setForm(INITIAL_SETTINGS);
      alert("슬랙 설정이 삭제되었습니다.");
    } catch (error: any) {
      console.error("설정 삭제 실패:", error);
      alert(
        `슬랙 설정 삭제에 실패했습니다: ${error?.response?.data?.message || error?.message || "알 수 없는 오류"}`
      );
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  if (!open || !instanceId) return null;

  const isReadOnly = !isEditMode && hasSettings;

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
          <div id="slack-modal-title" className="sl-modal__title">
            Slack 연동 설정
          </div>
        </header>

        <div className="sl-modal__body">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>로딩 중...</div>
          ) : (
            <>
              {/* 대상 인스턴스 */}
              <InstanceInfo instanceName={instanceName} instanceId={instanceId} />

              {/* Webhook URL */}
              <FormField
                label="Slack WebHook URL"
                value={form.webhookUrl}
                placeholder="https://www.slack..."
                isReadOnly={isReadOnly}
                fieldRef={firstFieldRef}
                onChange={(value) => updateField("webhookUrl", value)}
              />

              {/* 기본 채널 + 멘션 */}
              <ChannelMentionFields
                defaultChannel={form.defaultChannel}
                mention={form.mention}
                isReadOnly={isReadOnly}
                onChannelChange={(value) => updateField("defaultChannel", value)}
                onMentionChange={(value) => updateField("mention", value)}
              />

              {/* 활성화 토글 */}
              <EnabledToggle
                enabled={form.enabled}
                isReadOnly={isReadOnly}
                onToggle={() => !isReadOnly && updateField("enabled", !form.enabled)}
              />
            </>
          )}
        </div>

        <footer className="sl-modal__footer">
          {isReadOnly ? (
            <>
              <button className="sl-btn" onClick={onClose}>
                닫기
              </button>
              <button
                className="sl-btn"
                onClick={handleDelete}
                disabled={loading}
                style={{ color: "#EF4444", borderColor: "#EF4444" }}
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
              <button className="sl-btn sl-btn--primary" onClick={handleEdit}>
                수정
              </button>
            </>
          ) : (
            <>
              <button className="sl-btn" onClick={isEditMode ? handleCancel : onClose}>
                {isEditMode ? "취소" : "닫기"}
              </button>
              <button className="sl-btn sl-btn--primary" onClick={handleSubmit} disabled={loading}>
                {loading ? "저장 중..." : "저장"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

// ============= InstanceInfo Component =============
// 대상 인스턴스 정보 표시

function InstanceInfo({ instanceName, instanceId }: { instanceName?: string; instanceId: number }) {
  return (
    <div className="sl-row">
      <div className="sl-label">대상 인스턴스</div>
      <div style={{ color: "var(--text)", fontWeight: 500 }}>
        {instanceName || `Instance #${instanceId}`}
      </div>
    </div>
  );
}

// ============= FormField Component =============
// 단일 입력 필드

type FormFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  isReadOnly: boolean;
  fieldRef?: React.RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
};

function FormField({ label, value, placeholder, isReadOnly, fieldRef, onChange }: FormFieldProps) {
  return (
    <div className="sl-row">
      <div className="sl-label">{label}</div>
      <input
        ref={fieldRef}
        className="ar-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isReadOnly}
        readOnly={isReadOnly}
        style={isReadOnly ? { backgroundColor: "#F9FAFB", cursor: "not-allowed" } : {}}
      />
    </div>
  );
}

// ============= ChannelMentionFields Component =============
// 채널 + 멘션 필드 (2개 가로 배치)

type ChannelMentionFieldsProps = {
  defaultChannel: string;
  mention: string;
  isReadOnly: boolean;
  onChannelChange: (value: string) => void;
  onMentionChange: (value: string) => void;
};

function ChannelMentionFields({
  defaultChannel,
  mention,
  isReadOnly,
  onChannelChange,
  onMentionChange,
}: ChannelMentionFieldsProps) {
  return (
    <div className="sl-row">
      <div className="sl-label" />
      <div className="sl-field-wrap">
        <div className="sl-field">
          <div className="ar-kicker">기본 채널</div>
          <input
            className="ar-input"
            placeholder="#db-alerts"
            value={defaultChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            disabled={isReadOnly}
            readOnly={isReadOnly}
            style={isReadOnly ? { backgroundColor: "#F9FAFB", cursor: "not-allowed" } : {}}
          />
        </div>
        <div className="sl-field">
          <div className="ar-kicker">멘션</div>
          <input
            className="ar-input"
            placeholder="@dba-team"
            value={mention}
            onChange={(e) => onMentionChange(e.target.value)}
            disabled={isReadOnly}
            readOnly={isReadOnly}
            style={isReadOnly ? { backgroundColor: "#F9FAFB", cursor: "not-allowed" } : {}}
          />
        </div>
      </div>
    </div>
  );
}

// ============= EnabledToggle Component =============
// 활성화 토글 버튼

type EnabledToggleProps = {
  enabled: boolean;
  isReadOnly: boolean;
  onToggle: () => void;
};

function EnabledToggle({ enabled, isReadOnly, onToggle }: EnabledToggleProps) {
  return (
    <div className="sl-row" style={{ marginTop: 6 }}>
      <div className="sl-label">활성화</div>
      <button
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
        className={`sl-toggle ${enabled ? "sl-toggle--on" : ""}`}
        title={enabled ? "활성화" : "비활성화"}
        disabled={isReadOnly}
        style={isReadOnly ? { opacity: 0.6, cursor: "not-allowed" } : {}}
      >
        <span className="sl-dot" />
      </button>
    </div>
  );
}