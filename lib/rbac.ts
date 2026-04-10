// ═══════════════════════════════════════════════════════════
// TenderShield — Role-Based Access Control (RBAC)
// Permission matrix and data scoping for multi-tenant access
// ═══════════════════════════════════════════════════════════

export type Role = 'OFFICER' | 'BIDDER' | 'AUDITOR' | 'NIC_ADMIN';

export type Permission =
  | 'read_own_tenders' | 'read_all_tenders'
  | 'create_tender' | 'edit_tender' | 'delete_tender'
  | 'submit_bid' | 'read_own_bids' | 'read_all_bids'
  | 'flag_tender' | 'freeze_tender' | 'investigate'
  | 'view_audit_trail' | 'export_report'
  | 'manage_users' | 'manage_roles' | 'system_config';

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  OFFICER: [
    'read_own_tenders', 'create_tender', 'edit_tender',
    'read_own_bids', 'view_audit_trail', 'export_report',
  ],
  BIDDER: [
    'read_own_tenders', 'submit_bid', 'read_own_bids',
  ],
  AUDITOR: [
    'read_all_tenders', 'read_all_bids',
    'flag_tender', 'freeze_tender', 'investigate',
    'view_audit_trail', 'export_report',
  ],
  NIC_ADMIN: [
    'read_all_tenders', 'create_tender', 'edit_tender', 'delete_tender',
    'read_all_bids', 'submit_bid',
    'flag_tender', 'freeze_tender', 'investigate',
    'view_audit_trail', 'export_report',
    'manage_users', 'manage_roles', 'system_config',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return PERMISSION_MATRIX[role] || [];
}

/**
 * Check if a role can access a specific dashboard route
 */
export function canAccessRoute(role: Role, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    '/dashboard/tenders/create': ['create_tender'],
    '/dashboard/auditor': ['flag_tender', 'investigate'],
    '/dashboard/bids': ['submit_bid', 'read_own_bids', 'read_all_bids'],
    '/admin': ['manage_users', 'manage_roles'],
  };

  const required = routePermissions[route];
  if (!required) return true; // No restrictions
  return required.some(p => checkPermission(role, p));
}

/**
 * Get Supabase query filter for data scoping
 * Officers see only their ministry's data
 * Auditors see everything
 * Bidders see only their eligible tenders
 */
export function getDataScope(role: Role, userId?: string, ministryCode?: string) {
  switch (role) {
    case 'OFFICER':
      return { field: 'ministry_code', value: ministryCode || 'unknown', operator: 'eq' as const };
    case 'BIDDER':
      return { field: 'status', value: 'OPEN', operator: 'eq' as const };
    case 'AUDITOR':
    case 'NIC_ADMIN':
      return null; // Full access
    default:
      return { field: 'id', value: '___none___', operator: 'eq' as const }; // Block unknown roles
  }
}

/**
 * Human-readable role description
 */
export function getRoleInfo(role: Role) {
  const info: Record<Role, { label: string; icon: string; description: string; color: string }> = {
    OFFICER: { label: 'Ministry Officer', icon: '🏛️', description: 'Create and manage tenders for your ministry', color: '#6366f1' },
    BIDDER: { label: 'Company Bidder', icon: '🏢', description: 'View open tenders and submit sealed bids', color: '#22c55e' },
    AUDITOR: { label: 'CAG Auditor', icon: '🔍', description: 'Investigate, flag, and freeze suspicious tenders', color: '#f59e0b' },
    NIC_ADMIN: { label: 'NIC Administrator', icon: '🛡️', description: 'Full system access and user management', color: '#ef4444' },
  };
  return info[role] || info.OFFICER;
}
