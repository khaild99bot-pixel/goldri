/**
 * GOLDRIX Profile & Security Settings Modal
 * Language preferences, password rotation, and 2FA authentication management.
 */

import React, { useState } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage, Language } from '../../context/LanguageContext.tsx';
import {
  X,
  User as UserIcon,
  Shield,
  KeyRound,
  Globe,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKYC: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenKYC }) => {
  const { user, refreshUserData } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await api.updateProfile({ fullName, phone, language });
      await refreshUserData();
      setStatusMsg({ type: 'success', text: 'Profile details updated successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Profile update failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setStatusMsg({ type: 'success', text: 'Password rotated successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Password change failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      await api.toggle2FA();
      await refreshUserData();
      setStatusMsg({
        type: 'success',
        text: `Two-Factor Authentication (2FA) is now ${!user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to toggle 2FA' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Profile &amp; Security Settings</h2>
              <p className="text-[11px] text-neutral-400">Account status, credentials, and language preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Account Info Card */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Account ID:</span>
            <span className="font-mono text-neutral-200">{user.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Email Address:</span>
            <span className="font-mono text-white font-semibold">{user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Account Creation:</span>
            <span className="text-neutral-300">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-800/80">
            <span className="text-neutral-400">Verification Status:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-400">{user.kycStatus}</span>
              {user.kycStatus !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKYC();
                  }}
                  className="px-2 py-0.5 bg-amber-400 text-neutral-950 font-bold rounded text-[10px]"
                >
                  Verify Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <span>Interface Language &amp; Direction</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'en', label: 'English (LTR)' },
              { code: 'ar', label: 'العربية (RTL)' },
              { code: 'tr', label: 'Türkçe' },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code as Language)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                  language === l.code
                    ? 'bg-neutral-800 text-emerald-400 border-emerald-500/40 font-semibold shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2FA Toggle */}
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-white">Two-Factor Authentication (2FA)</p>
              <p className="text-[11px] text-neutral-400">Protects withdrawals and password resets</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle2FA}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              user.twoFactorEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Password Rotation Form */}
        <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>Change Account Password</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="password"
                required
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <input
                type="password"
                required
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Update Password
          </button>
        </form>

      </div>
    </div>
  );
};
