import { z } from 'zod';

/**
 * Roles, ordered from least to most privileged.
 *
 * The ordering is meaningful: `roleRank` uses the array index, so a check like
 * "at least a moderator" is a single comparison. New roles slot into the list.
 */
export const ROLES = ['viewer', 'contributor', 'moderator', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];
export const roleSchema = z.enum(ROLES);

export const DEFAULT_ROLE: Role = 'contributor';

/**
 * Permissions are the unit the code actually checks; roles are only a bundle of
 * them. Adding a capability means adding a permission here and granting it to
 * the roles that should have it - route handlers never test a role directly.
 */
export const PERMISSIONS = [
  'feature:create',
  'feature:update:own',
  'feature:update:any',
  'feature:delete:own',
  'feature:delete:any',
  'feature:moderate',
  'feature:read:unpublished',
  'layer:read:unpublished',
  'layer:manage',
  'settings:manage',
  'user:manage',
  'role:assign',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const permissionSchema = z.enum(PERMISSIONS);

const VIEWER_PERMISSIONS: readonly Permission[] = [];

const CONTRIBUTOR_PERMISSIONS: readonly Permission[] = [
  ...VIEWER_PERMISSIONS,
  'feature:create',
  'feature:update:own',
  'feature:delete:own',
];

const MODERATOR_PERMISSIONS: readonly Permission[] = [
  ...CONTRIBUTOR_PERMISSIONS,
  'feature:update:any',
  'feature:delete:any',
  'feature:moderate',
  'feature:read:unpublished',
  'layer:read:unpublished',
];

const ADMIN_PERMISSIONS: readonly Permission[] = [
  ...MODERATOR_PERMISSIONS,
  'layer:manage',
  'settings:manage',
  'user:manage',
];

const SUPERADMIN_PERMISSIONS: readonly Permission[] = [...ADMIN_PERMISSIONS, 'role:assign'];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  viewer: VIEWER_PERMISSIONS,
  contributor: CONTRIBUTOR_PERMISSIONS,
  moderator: MODERATOR_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  superadmin: SUPERADMIN_PERMISSIONS,
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(
  role: Role | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function roleRank(role: Role): number {
  return ROLES.indexOf(role);
}

export function isAtLeast(role: Role | null | undefined, minimum: Role): boolean {
  if (!role) return false;
  return roleRank(role) >= roleRank(minimum);
}

/**
 * Whether `role` may edit a feature, given who created it.
 *
 * Kept here rather than in the API so the web app can grey out the edit button
 * using exactly the rule the server will enforce.
 */
export function canEditFeature(
  actor: { id: string; role: Role } | null | undefined,
  feature: { createdById: string | null },
): boolean {
  if (!actor) return false;
  if (hasPermission(actor.role, 'feature:update:any')) return true;
  return hasPermission(actor.role, 'feature:update:own') && feature.createdById === actor.id;
}

export function canDeleteFeature(
  actor: { id: string; role: Role } | null | undefined,
  feature: { createdById: string | null },
): boolean {
  if (!actor) return false;
  if (hasPermission(actor.role, 'feature:delete:any')) return true;
  return hasPermission(actor.role, 'feature:delete:own') && feature.createdById === actor.id;
}
