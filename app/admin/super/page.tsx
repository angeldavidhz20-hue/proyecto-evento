'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSuperRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/super');
  }, [router]);

  return (
    <div className="p-12 text-center text-xs text-purple-600 font-mono">
      Redirigiendo al Portal de Super Admin (/super)...
    </div>
  );
}
