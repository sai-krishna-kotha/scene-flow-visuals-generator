import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Mail, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Account Settings</h1>
          <p className="mt-1 text-text-secondary">Manage your profile and preferences.</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-surface-active bg-surface px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-active bg-surface shadow-sm">
        <div className="border-b border-surface-active p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">{user.email}</h2>
              <p className="text-sm text-text-secondary">Joined recently</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <dl className="divide-y divide-surface-active">
            <div className="flex justify-between py-4 sm:py-5">
              <dt className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <Mail className="h-4 w-4" />
                Email Address
              </dt>
              <dd className="text-sm text-text">{user.email}</dd>
            </div>
            <div className="flex justify-between py-4 sm:py-5">
              <dt className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <Shield className="h-4 w-4" />
                Role
              </dt>
              <dd className="text-sm capitalize text-text">
                <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {user.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
