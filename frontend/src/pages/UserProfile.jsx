// frontend/src/pages/Profile.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [preview, setPreview] = useState(avatarUrl);

  function onChooseFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setAvatarUrl(r.result); // data URL
      setPreview(r.result);
    };
    r.readAsDataURL(f);
  }

  function onSave() {
    updateProfile({
      name: name.trim() || user.name,
      avatarUrl: avatarUrl || user.avatarUrl,
    });
    nav(-1);
  }

  return (
    <div
      className="container stack"
      style={{ maxWidth: 740 }}
    >
      <h1 className="h2">Profile settings</h1>

      <div
        className="card"
        style={{ padding: 16 }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <img
            src={preview}
            alt="Avatar preview"
            className="avatar-lg"
          />
          <div
            className="stack"
            style={{ flex: 1 }}
          >
            <label>
              <div
                className="muted"
                style={{ marginBottom: 6 }}
              >
                Display name
              </div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <label>
              <div
                className="muted"
                style={{ marginBottom: 6 }}
              >
                Avatar URL (or upload below)
              </div>
              <input
                className="input"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  setPreview(e.target.value);
                }}
                placeholder="https://…"
              />
            </label>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={onChooseFile}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={onSave}
              >
                Save
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => nav(-1)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <p
          className="muted"
          style={{ marginTop: 12 }}
        >
          Note: changes are stored locally for ScheduleEase only (they do not
          change your Google profile).
        </p>
      </div>
    </div>
  );
}
