'use client';

import { useAuthStore } from '@/lib/store';
import { checkPermission, type Permission, type Role } from '@/lib/rbac';

interface PermissionGuardProps {
  /** Permission required to see children */
  permission: Permission;
  children: React.ReactNode;
  /** Shown when user lacks permission (defaults to nothing) */
  fallback?: React.ReactNode;
}

/**
 * Client-side permission gate.
 * Renders children only if the current user's role has the required permission.
 *
 * Usage:
 *   <PermissionGuard permission="create_tender">
 *     <button>Create Tender</button>
 *   </PermissionGuard>
 */
export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const user = useAuthStore(s => s.user);

  if (!user?.role) return null;
  if (!checkPermission(user.role as Role, permission)) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}

/**
 * Client-side role gate — shows content only for specific roles.
 */
export function RoleGuard({
  roles,
  children,
  fallback,
}: {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const user = useAuthStore(s => s.user);
  if (!user?.role || !roles.includes(user.role as Role)) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}
