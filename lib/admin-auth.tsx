'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface AdminAccount {
  username: string;
  role: 'superadmin' | 'organizer';
  displayName: string;
  creatorId?: string;
  organizationName?: string;
}

export const KNOWN_ADMINS: (AdminAccount & { password: string })[] = [
  {
    username: 'Admin123',
    password: 'Mimamame21',
    role: 'superadmin',
    displayName: 'Luis Fernando (Super Admin)',
    organizationName: 'EventPass Platform',
  },
  {
    username: 'Carlos123',
    password: 'Carlos2026',
    role: 'organizer',
    displayName: 'Carlos Productor',
    creatorId: 'user_org_1',
    organizationName: 'Tech Summit Producciones',
  },
  {
    username: 'Mariana123',
    password: 'Mariana2026',
    role: 'organizer',
    displayName: 'Mariana Soto',
    creatorId: 'user_org_2',
    organizationName: 'Mariana Soto Festivales',
  },
];

interface AdminAuthContextType {
  admin: AdminAccount | null;
  login: (user: AdminAccount) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  login: () => {},
  logout: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Pure volatile in-memory state: always null on page refresh
  const [admin, setAdmin] = useState<AdminAccount | null>(null);

  const login = (user: AdminAccount) => {
    setAdmin(user);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ep_admin_role_change', { detail: user }));
    }
  };

  const logout = () => {
    setAdmin(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ep_admin_logout'));
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
