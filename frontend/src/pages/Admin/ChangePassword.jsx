import { useState } from 'react';
import { FaShieldAlt, FaKey } from 'react-icons/fa';
import API, { setToken } from '../../services/api';
import { PasswordField, PasswordRequirements, passwordValid } from '../../components/PasswordField';

export default function ChangePassword() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const change = key => e => { setForm(f => ({ ...f, [key]: e.target.value })); setNotice(''); };
  const submit = async e => {
    e.preventDefault(); setError(''); setNotice('');
    if (!passwordValid(form.newPassword)) return setError('Your new password must meet both requirements below.');
    if (form.newPassword !== form.confirm) return setError('The new passwords do not match.');
    if (form.oldPassword === form.newPassword) return setError('Choose a different password from your current one.');
    setBusy(true);
    try {
      const { data } = await API.post('/auth/change-password', { oldPassword: form.oldPassword, newPassword: form.newPassword });
      if (data.token) { localStorage.setItem('admin_token', data.token); setToken(data.token); }
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
      setNotice(data.message || 'Password updated successfully.');
    } catch (err) { setError(err.response?.data?.message || 'Unable to change your password. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="admin-workspace"><div className="admin-page-header"><div><p className="admin-kicker">Account / Security</p><h1>Protect your workspace.</h1><p className="admin-page-copy">Update your password and keep your account in your hands.</p></div><span className="cms-security-icon"><FaShieldAlt /></span></div>
    <div className="cms-security-layout"><form onSubmit={submit} className="cms-panel cms-writing"><div className="cms-panel-heading"><h2>Change password</h2><FaKey /></div><p className="cms-muted">Signed in as {localStorage.getItem('admin_email') || 'administrator'}</p>
      {error && <p className="admin-form-error" role="alert">{error}</p>}{notice && <p className="admin-form-status" role="status">{notice}</p>}
      <PasswordField label="Current password" value={form.oldPassword} onChange={change('oldPassword')} autoComplete="current-password" disabled={busy} />
      <PasswordField label="New password" value={form.newPassword} onChange={change('newPassword')} disabled={busy} />
      <PasswordRequirements value={form.newPassword} />
      <PasswordField label="Confirm new password" value={form.confirm} onChange={change('confirm')} disabled={busy} />
      {form.confirm && <p className="cms-muted" aria-live="polite">{form.confirm === form.newPassword ? '✓ Passwords match' : 'Passwords do not match yet'}</p>}
      <button className="cms-button is-primary" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}</button>
    </form><aside className="cms-panel cms-security-guide"><span className="cms-badge">Good account habits</span><h2>A stronger password.<br />A fresh start.</h2><p>Use a unique passphrase that you do not use on another website. A password manager can help you create and store it.</p><div><strong>What happens next?</strong><p>This session stays signed in. Other sessions are invalidated when they next access the API.</p></div><div><strong>No password sharing</strong><p>Create a separate account for each collaborator and give them only the role they need.</p></div></aside></div>
  </div>;
}
