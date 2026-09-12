import { FormEvent, useEffect, useState } from "react";
import {
  AdminRole,
  AuthUser,
  createAdminUser,
  getAdminUsers,
  resetAdminInitialPassword,
  TicketApiError,
  updateAdminUser,
} from "./api.js";

type ScreenState = "loading" | "ready" | "forbidden" | "error";
type FormMode = "create" | "edit";
const roles: AdminRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

const emptyForm = {
  name: "",
  email: "",
  role: "REQUESTER" as AdminRole,
  isActive: true,
  initialPassword: "",
};

type UserFormField = keyof typeof emptyForm;
type FieldErrors = Partial<Record<UserFormField, string>>;

function Message({ kind, children }: { kind: "success" | "danger" | "warning"; children: React.ReactNode }) {
  return <div className={`alert alert-${kind}`} role="alert" aria-live="polite">{children}</div>;
}

function validationMessage(form: typeof emptyForm, mode: FormMode): string {
  if (!form.name.trim() || form.name.trim().length > 150) return "Name must contain 1-150 characters.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim()) || form.email.trim().length > 254) return "Enter a valid email address.";
  if (mode === "create" && !form.initialPassword) return "Initial password is required.";
  return "";
}

function localFieldErrors(form: typeof emptyForm, mode: FormMode): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length > 150) errors.name = "Name must contain 1-150 characters.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim()) || form.email.trim().length > 254) errors.email = "Enter a valid email address.";
  if (mode === "create" && !form.initialPassword) errors.initialPassword = "Initial password is required.";
  return errors;
}

function safeActionMessage(error: unknown, fallback: string): string {
  if (!(error instanceof TicketApiError)) return fallback;
  const message = error.message.trim();
  if (!message || /password(?:hash)?|secret|stack trace|prisma|sql|internal details/i.test(message)) return fallback;
  return message;
}

function errorId(field: UserFormField): string {
  return `admin-user-${field}-error`;
}

function describedBy(field: UserFormField, hasError: boolean): string | undefined {
  const ids = field === "name" ? ["admin-user-help"] : [];
  if (hasError) ids.push(errorId(field));
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FieldError({ field, errors }: { field: UserFormField; errors: FieldErrors }) {
  const message = errors[field];
  return message ? <div id={errorId(field)} className="invalid-feedback d-block">{message}</div> : null;
}

export default function UserManagement() {
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | AdminRole>("");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRole, setDraftRole] = useState<"" | AdminRole>("");
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<FormMode>("create");
  const [form, setForm] = useState(emptyForm);
  const [resetPassword, setResetPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ kind: "success" | "danger" | "warning"; text: string } | null>(null);

  async function load(nextSearch = search, nextRole = roleFilter) {
    setScreen("loading");
    try {
      const result = await getAdminUsers({ search: nextSearch, ...(nextRole ? { role: nextRole } : {}) });
      setUsers(result.items);
      setSearch(nextSearch);
      setRoleFilter(nextRole);
      setScreen("ready");
    } catch (error) {
      setScreen(error instanceof TicketApiError && error.status === 403 ? "forbidden" : "error");
    }
  }

  useEffect(() => { void load("", ""); }, []);

  function startCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setResetPassword("");
    setFeedback(null);
    setFieldErrors({});
  }

  function startEdit(user: AuthUser) {
    setMode("edit");
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive, initialPassword: "" });
    setResetPassword("");
    setFeedback(null);
    setFieldErrors({});
  }

  function updateForm<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validationMessage(form, mode);
    if (validation) { setFieldErrors(localFieldErrors(form, mode)); setFeedback({ kind: "danger", text: validation }); return; }
    if (mode === "edit" && editing && editing.isActive && !form.isActive && !window.confirm("Deactivate this user? Existing sessions will be revoked.")) return;
    setBusy(mode);
    setFeedback(null);
    setFieldErrors({});
    try {
      if (mode === "create") {
        await createAdminUser({ name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive, initialPassword: form.initialPassword });
        setFeedback({ kind: "success", text: "User created successfully." });
        setForm(emptyForm);
      } else if (editing) {
        await updateAdminUser(editing.id, { name: form.name.trim(), email: form.email.trim(), role: form.role, isActive: form.isActive });
        setFeedback({ kind: "success", text: "User updated successfully." });
      }
      await load();
    } catch (error) {
      setFieldErrors(error instanceof TicketApiError ? error.fields as FieldErrors : {});
      setFeedback({ kind: error instanceof TicketApiError && error.status === 409 ? "warning" : "danger", text: safeActionMessage(error, mode === "create" ? "Unable to create the user." : "Unable to update the user.") });
    } finally {
      setBusy("");
    }
  }

  async function resetPasswordForUser() {
    if (!editing || resetPassword.length === 0) { setFeedback({ kind: "danger", text: "Initial password is required." }); return; }
    setBusy("reset");
    setFeedback(null);
    setFieldErrors({});
    try {
      await resetAdminInitialPassword(editing.id, resetPassword);
      setResetPassword("");
      setFeedback({ kind: "success", text: "Initial password reset successfully." });
      await load();
    } catch (error) {
      setFieldErrors(error instanceof TicketApiError ? error.fields as FieldErrors : {});
      setFeedback({ kind: "danger", text: safeActionMessage(error, "Unable to reset the initial password.") });
    } finally {
      setBusy("");
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    void load(draftSearch.trim(), draftRole);
  }

  if (screen === "loading") return <section aria-labelledby="user-management-title"><div className="alert alert-info" role="status">Loading User Management...</div></section>;
  if (screen === "forbidden") return <section aria-labelledby="user-management-title"><h2 id="user-management-title" className="h4">User Management</h2><Message kind="warning">Access denied. Only Administrators can manage users.</Message></section>;
  if (screen === "error") return <section aria-labelledby="user-management-title"><h2 id="user-management-title" className="h4">User Management</h2><Message kind="danger">Unable to load users. Please try again.</Message><button type="button" className="btn btn-outline-success" onClick={() => void load()}>Retry</button></section>;

  return <section aria-labelledby="user-management-title">
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
      <div><h2 id="user-management-title" className="h4 mb-1">User Management</h2><p className="text-body-secondary mb-0">Manage account identity, role and activation state.</p></div>
      <button type="button" className="btn btn-success" onClick={startCreate}>Create User</button>
    </div>
    {feedback && <Message kind={feedback.kind}>{feedback.text}</Message>}

    <form className="card shadow-sm mb-3" aria-label="User search and filters" onSubmit={applyFilters}>
      <div className="card-body"><div className="row g-3 align-items-end">
        <div className="col-12 col-md-7"><label className="form-label" htmlFor="user-search">Search users</label><input id="user-search" className="form-control" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Name or email" /></div>
        <div className="col-12 col-md-3"><label className="form-label" htmlFor="user-role-filter">Role</label><select id="user-role-filter" className="form-select" value={draftRole} onChange={(event) => setDraftRole(event.target.value as "" | AdminRole)}><option value="">All roles</option>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></div>
        <div className="col-12 col-md-2"><button className="btn btn-outline-success w-100" type="submit">Apply</button></div>
      </div></div>
    </form>

    <form className="card shadow-sm mb-3" aria-label={`${mode === "create" ? "Create" : "Edit"} user form`} onSubmit={submit}>
      <div className="card-body"><h3 className="h5">{mode === "create" ? "Create User" : `Edit ${editing?.name ?? "User"}`}</h3>
        <div className="row g-3">
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="admin-user-name">Name</label><input id="admin-user-name" className="form-control" value={form.name} onChange={(event) => updateForm("name", event.target.value)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={describedBy("name", Boolean(fieldErrors.name))} /><FieldError field="name" errors={fieldErrors} /></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="admin-user-email">Email</label><input id="admin-user-email" type="email" className="form-control" value={form.email} onChange={(event) => updateForm("email", event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={describedBy("email", Boolean(fieldErrors.email))} /><FieldError field="email" errors={fieldErrors} /></div>
          <div className="col-12 col-md-4"><label className="form-label" htmlFor="admin-user-role">Role</label><select id="admin-user-role" className="form-select" value={form.role} onChange={(event) => updateForm("role", event.target.value as AdminRole)} aria-invalid={Boolean(fieldErrors.role)} aria-describedby={describedBy("role", Boolean(fieldErrors.role))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><FieldError field="role" errors={fieldErrors} /></div>
          <div className="col-12 col-md-4"><label className="form-label" htmlFor="admin-user-status">Status</label><select id="admin-user-status" className="form-select" value={form.isActive ? "active" : "inactive"} onChange={(event) => updateForm("isActive", event.target.value === "active")} aria-invalid={Boolean(fieldErrors.isActive)} aria-describedby={describedBy("isActive", Boolean(fieldErrors.isActive))}><option value="active">Active</option><option value="inactive">Inactive</option></select><FieldError field="isActive" errors={fieldErrors} /></div>
          {mode === "create" && <div className="col-12 col-md-4"><label className="form-label" htmlFor="admin-user-password">Initial Password</label><input id="admin-user-password" type="password" className="form-control" value={form.initialPassword} onChange={(event) => updateForm("initialPassword", event.target.value)} aria-invalid={Boolean(fieldErrors.initialPassword)} aria-describedby={describedBy("initialPassword", Boolean(fieldErrors.initialPassword))} /><FieldError field="initialPassword" errors={fieldErrors} /></div>}
        </div>
        <p id="admin-user-help" className="form-text">Each user has one role. Initial passwords are never shown after saving.</p>
        <div className="d-flex gap-2"><button type="submit" className="btn btn-success" disabled={busy !== ""}>{busy === mode ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}</button>{mode === "edit" && <button type="button" className="btn btn-outline-success" onClick={startCreate} disabled={busy !== ""}>Cancel</button>}</div>
      </div>
    </form>

    {mode === "edit" && editing && <section className="card shadow-sm mb-3" aria-labelledby="reset-password-title"><div className="card-body"><h3 id="reset-password-title" className="h5">Set New Initial Password</h3><p className="text-body-secondary">The user must change this password at the next login.</p><label className="form-label" htmlFor="reset-initial-password">New Initial Password</label><input id="reset-initial-password" type="password" className="form-control mb-3" value={resetPassword} onChange={(event) => { setResetPassword(event.target.value); setFieldErrors((current) => { const next = { ...current }; delete next.initialPassword; return next; }); }} aria-invalid={Boolean(fieldErrors.initialPassword)} aria-describedby={describedBy("initialPassword", Boolean(fieldErrors.initialPassword))} /><FieldError field="initialPassword" errors={fieldErrors} /><button type="button" className="btn btn-outline-success" onClick={() => void resetPasswordForUser()} disabled={busy !== ""}>{busy === "reset" ? "Saving..." : "Reset Initial Password"}</button></div></section>}

    {users.length === 0 ? <div className="card"><div className="card-body text-center py-5"><h3 className="h5">No users match the current search or filters.</h3></div></div> : <div className="table-responsive"><table className="table table-bordered align-middle"><caption className="visually-hidden">Administrator User List</caption><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td><span className={user.isActive ? "text-success" : "text-body-secondary"}>{user.isActive ? "Active" : "Inactive"}</span></td><td><button type="button" className="btn btn-sm btn-outline-success" onClick={() => startEdit(user)}>Edit</button></td></tr>)}</tbody></table></div>}
  </section>;
}
