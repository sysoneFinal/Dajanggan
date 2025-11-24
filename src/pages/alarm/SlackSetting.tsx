import React, { useEffect, useRef, useState } from "react";
import "/src/styles/alarm/slack.css";
import apiClient from "../../api/apiClient";
/**
 * Slack 연동 설정 모달 (sl-* 스타일 재사용)
 * - Props: open, onClose, instanceId, instanceName
 * - ESC / 바깥 클릭 닫기, Tab 포커스 트랩(간단)
 * - 조회 모드와 수정 모드 지원
 */

export type SlackSettings = {
  webhookUrl: string;
  defaultChannel: string;
  mention: string;
  enabled: boolean;
};

export default function SlackSettingsModal({
  open,
  onClose,
  instanceId,
  instanceName,
}: {
  open: boolean;
  onClose: () => void;
  instanceId: number | null;
  instanceName?: string;
}) {
  const [form, setForm] = useState<SlackSettings>({
    webhookUrl: "",
    defaultChannel: "",
    mention: "",
    enabled: true,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  // 슬랙 설정 조회
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
          setForm({
            webhookUrl: "",
            defaultChannel: "",
            mention: "",
            enabled: true,
          });
          setHasSettings(false);
        }
        setIsEditMode(false);
      } catch (e: any) {
        // 404 등 에러는 설정이 없는 것으로 간주
        if (e?.response?.status === 404) {
          setForm({
            webhookUrl: "",
            defaultChannel: "",
            mention: "",
            enabled: true,
          });
          setHasSettings(false);
        } else {
          console.error("Failed to fetch slack settings:", e);
          alert("슬랙 설정 조회에 실패했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [open, instanceId]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && isEditMode) {
      // 수정 모드일 때만 포커스 이동
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

  const set = (k: keyof SlackSettings, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v } as SlackSettings));

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // 원래 설정 다시 불러오기
    if (instanceId) {
      apiClient.get(`/instances/slack-settings/${instanceId}`)
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
  };

  const handleSubmit = async () => {
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
    } catch (e: any) {
      console.error("Failed to save slack settings:", e);
      alert(`슬랙 설정 저장에 실패했습니다: ${e?.response?.data?.message || e?.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!instanceId) return;

    if (!confirm("슬랙 연동 설정을 삭제하시겠습니까?")) return;

    try {
      setLoading(true);
      await apiClient.delete(`/instances/slack-settings/${instanceId}`);
      
      setHasSettings(false);
      setForm({
        webhookUrl: "",
        defaultChannel: "",
        mention: "",
        enabled: true,
      });
      alert("슬랙 설정이 삭제되었습니다.");
    } catch (e: any) {
      console.error("Failed to delete slack settings:", e);
      alert(`슬랙 설정 삭제에 실패했습니다: ${e?.response?.data?.message || e?.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

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
          <div id="slack-modal-title" className="sl-modal__title">Slack 연동 설정</div>
        </header>

        <div className="sl-modal__body">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9CA3AF" }}>
              로딩 중...
            </div>
          ) : (
            <>
              {/* 대상 인스턴스 */}
              <div className="sl-row">
                <div className="sl-label">대상 인스턴스</div>
                <div style={{ color: "var(--text)", fontWeight: 500 }}>
                  {instanceName || `Instance #${instanceId}`}
                </div>
              </div>

              {/* Webhook URL */}
              <div className="sl-row">
                <div className="sl-label">Slack WebHook URL</div>
                <input
                  ref={firstFieldRef}
                  className="ar-input"
                  placeholder="https://www.slack..."
                  value={form.webhookUrl}
                  onChange={(e) => set("webhookUrl", e.target.value)}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  style={isReadOnly ? { backgroundColor: "#F9FAFB", cursor: "not-allowed" } : {}}
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
                      value={form.mention}
                      onChange={(e) => set("mention", e.target.value)}
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                      style={isReadOnly ? { backgroundColor: "#F9FAFB", cursor: "not-allowed" } : {}}
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
                  onClick={() => !isReadOnly && set("enabled", !form.enabled)}
                  className={`sl-toggle ${form.enabled ? "sl-toggle--on" : ""}`}
                  title={form.enabled ? "활성화" : "비활성화"}
                  disabled={isReadOnly}
                  style={isReadOnly ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                >
                  <span className="sl-dot"/>
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="sl-modal__footer">
          {isReadOnly ? (
            <>
              <button className="sl-btn" onClick={onClose}>닫기</button>
              <button 
                className="sl-btn" 
                onClick={handleDelete}
                disabled={loading}
                style={{ color: "#EF4444", borderColor: "#EF4444" }}
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
              <button className="sl-btn sl-btn--primary" onClick={handleEdit}>수정</button>
            </>
          ) : (
            <>
              <button className="sl-btn" onClick={isEditMode ? handleCancel : onClose}>
                {isEditMode ? "취소" : "닫기"}
              </button>
              <button 
                className="sl-btn sl-btn--primary" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "저장 중..." : "저장"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

