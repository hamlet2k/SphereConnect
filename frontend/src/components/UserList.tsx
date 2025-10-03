import React, { useState, useEffect } from "react";
import ConfirmModal from "./ConfirmModal";
import { useConfirmModal } from "../hooks/useConfirmModal";

interface User {
  id: string;

  name: string;

  rank?: string;

  squad_id?: string;

  availability: string;

  phonetic?: string;

  created_at?: string;
}

interface UserListProps {
  guildId: string;

  onUserSelect?: (user: User) => void;

  onUserUpdate?: (userId: string, updates: Partial<User>) => void;

  onUserDelete?: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({
  guildId,

  onUserSelect,

  onUserUpdate,

  onUserDelete,
}) => {
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<Partial<User>>({});

  const {
    confirmConfig,
    requestConfirmation,
    confirm: confirmModalConfirm,
    cancel: confirmModalCancel,
  } = useConfirmModal();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (guildId) {
      loadUsers();
    }
  }, [guildId]);

  const loadUsers = async () => {
    setLoading(true);

    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/users?guild_id=${guildId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`);
      }

      const data = await response.json();

      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.id);

    setEditForm({
      name: user.name,

      availability: user.availability,

      phonetic: user.phonetic,
    });
  };

  const handleSave = async (userId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/users/${userId}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",
          },

          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.statusText}`);
      }

      await loadUsers();

      setEditingUser(null);

      setEditForm({});

      if (onUserUpdate) {
        onUserUpdate(userId, editForm);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId: string, skipConfirm = false) => {
    if (!skipConfirm) {
      requestConfirmation({
        title: "Delete User",

        message: "Are you sure you want to delete this user?",

        confirmLabel: "Delete",

        onConfirm: () => handleDelete(userId, true),
      });

      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/users/${userId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }

      await loadUsers();

      if (onUserDelete) {
        onUserDelete(userId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);

    setEditForm({});
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div
          style={{
            width: "40px",

            height: "40px",

            border: "4px solid #f3f3f3",

            borderTop: "4px solid #3182ce",

            borderRadius: "50%",

            animation: "spin 1s linear infinite",

            margin: "0 auto 16px",
          }}
        ></div>

        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Users ({users.length})</h3>

        <button
          onClick={loadUsers}
          style={{
            padding: "8px 16px",

            backgroundColor: "#3182ce",

            color: "white",

            border: "none",

            borderRadius: "4px",

            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px",

            backgroundColor: "#fed7d7",

            color: "#c53030",

            borderRadius: "4px",

            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "white",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f7fafc" }}>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                }}
              >
                Name
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                }}
              >
                Rank
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                }}
              >
                Availability
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                }}
              >
                Phonetic
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #e2e8f0",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      style={{
                        width: "100%",

                        padding: "4px",

                        border: "1px solid #ccc",

                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <span
                      style={{ cursor: onUserSelect ? "pointer" : "default" }}
                      onClick={() => onUserSelect && onUserSelect(user)}
                    >
                      {user.name}
                    </span>
                  )}
                </td>

                <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                  {user.rank || "N/A"}
                </td>

                <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                  {editingUser === user.id ? (
                    <select
                      value={editForm.availability || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          availability: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",

                        padding: "4px",

                        border: "1px solid #ccc",

                        borderRadius: "4px",
                      }}
                    >
                      <option value="online">Online</option>

                      <option value="offline">Offline</option>

                      <option value="away">Away</option>
                    </select>
                  ) : (
                    <span
                      style={{
                        padding: "4px 8px",

                        borderRadius: "12px",

                        fontSize: "12px",

                        backgroundColor:
                          user.availability === "online"
                            ? "#c6f6d5"
                            : user.availability === "away"
                            ? "#fef5e7"
                            : "#f7fafc",

                        color:
                          user.availability === "online"
                            ? "#276749"
                            : user.availability === "away"
                            ? "#744210"
                            : "#4a5568",
                      }}
                    >
                      {user.availability}
                    </span>
                  )}
                </td>

                <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editForm.phonetic || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phonetic: e.target.value })
                      }
                      style={{
                        width: "100%",

                        padding: "4px",

                        border: "1px solid #ccc",

                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    user.phonetic || "N/A"
                  )}
                </td>

                <td style={{ padding: "12px", border: "1px solid #e2e8f0" }}>
                  {editingUser === user.id ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleSave(user.id)}
                        style={{
                          padding: "4px 8px",

                          backgroundColor: "#38a169",

                          color: "white",

                          border: "none",

                          borderRadius: "4px",

                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>

                      <button
                        onClick={handleCancel}
                        style={{
                          padding: "4px 8px",

                          backgroundColor: "#a0aec0",

                          color: "white",

                          border: "none",

                          borderRadius: "4px",

                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: "4px 8px",

                          backgroundColor: "#3182ce",

                          color: "white",

                          border: "none",

                          borderRadius: "4px",

                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(user.id)}
                        style={{
                          padding: "4px 8px",

                          backgroundColor: "#e53e3e",

                          color: "white",

                          border: "none",

                          borderRadius: "4px",

                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#a0aec0" }}>
          No users found for this guild.
        </div>
      )}

      <style>{`



        @keyframes spin {



          0% { transform: rotate(0deg); }



          100% { transform: rotate(360deg); }



        }



      `}</style>

      {confirmConfig && (
        <ConfirmModal
          isOpen
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmModalConfirm}
          onCancel={confirmModalCancel}
          confirmLabel={confirmConfig.confirmLabel}
          cancelLabel={confirmConfig.cancelLabel}
        />
      )}
    </div>
  );
};

export default UserList;
