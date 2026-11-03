import { describe, expect, it } from 'vitest';
import {
  ROLES,
  canDeleteFeature,
  canBlockUser,
  canEditFeature,
  invitableRoles,
  hasPermission,
  isAtLeast,
  permissionsForRole,
} from './permissions.js';

describe('role permissions', () => {
  it('gives viewers no write permissions', () => {
    expect(permissionsForRole('viewer')).toEqual([]);
  });

  it('is cumulative up the role ladder', () => {
    for (let i = 1; i < ROLES.length; i += 1) {
      const lower = ROLES[i - 1]!;
      const higher = ROLES[i]!;
      for (const permission of permissionsForRole(lower)) {
        expect(
          permissionsForRole(higher),
          `${higher} should keep ${lower}'s "${permission}"`,
        ).toContain(permission);
      }
    }
  });

  it('lets only admins manage layers and settings', () => {
    expect(hasPermission('moderator', 'layer:manage')).toBe(false);
    expect(hasPermission('admin', 'layer:manage')).toBe(true);
    expect(hasPermission('admin', 'settings:manage')).toBe(true);
  });

  it('reserves role assignment for superadmins', () => {
    expect(hasPermission('admin', 'role:assign')).toBe(false);
    expect(hasPermission('superadmin', 'role:assign')).toBe(true);
  });

  it('treats a missing role as having nothing', () => {
    expect(hasPermission(null, 'feature:create')).toBe(false);
    expect(isAtLeast(undefined, 'viewer')).toBe(false);
  });
});

describe('feature ownership rules', () => {
  const author = { id: 'aaaaaaaa-0000-4000-8000-000000000001', role: 'contributor' as const };
  const stranger = { id: 'bbbbbbbb-0000-4000-8000-000000000002', role: 'contributor' as const };
  const moderator = { id: 'cccccccc-0000-4000-8000-000000000003', role: 'moderator' as const };
  const feature = { createdById: author.id };

  it('lets contributors edit their own features', () => {
    expect(canEditFeature(author, feature)).toBe(true);
    expect(canDeleteFeature(author, feature)).toBe(true);
  });

  it('stops contributors editing somebody else’s feature', () => {
    expect(canEditFeature(stranger, feature)).toBe(false);
    expect(canDeleteFeature(stranger, feature)).toBe(false);
  });

  it('lets moderators edit anything', () => {
    expect(canEditFeature(moderator, feature)).toBe(true);
    expect(canDeleteFeature(moderator, feature)).toBe(true);
  });

  it('stops anonymous visitors editing', () => {
    expect(canEditFeature(null, feature)).toBe(false);
  });

  it('never lets anyone claim an orphaned feature by ownership', () => {
    expect(canEditFeature(author, { createdById: null })).toBe(false);
    expect(canEditFeature(moderator, { createdById: null })).toBe(true);
  });
});

describe('invitableRoles', () => {
  it('lets an admin invite up to moderator, never a peer', () => {
    expect(invitableRoles('admin')).toEqual(['viewer', 'contributor', 'moderator']);
  });

  it('lets a superadmin invite up to admin, but never another superadmin', () => {
    expect(invitableRoles('superadmin')).toEqual(['viewer', 'contributor', 'moderator', 'admin']);
  });

  it('gives nobody below admin an invitation to hand out', () => {
    expect(invitableRoles('moderator')).toEqual([]);
    expect(invitableRoles('contributor')).toEqual([]);
    expect(invitableRoles(null)).toEqual([]);
  });
});

describe('canBlockUser', () => {
  const superadmin = { id: 's', role: 'superadmin' as const };
  const admin = { id: 'a', role: 'admin' as const };
  const otherAdmin = { id: 'a2', role: 'admin' as const };
  const moderator = { id: 'm', role: 'moderator' as const };
  const contributor = { id: 'c', role: 'contributor' as const };

  it('lets an admin block anyone below admin', () => {
    expect(canBlockUser(admin, moderator)).toBe(true);
    expect(canBlockUser(admin, contributor)).toBe(true);
  });

  it('stops admins blocking each other or the superadmin', () => {
    expect(canBlockUser(admin, otherAdmin)).toBe(false);
    expect(canBlockUser(admin, superadmin)).toBe(false);
  });

  it('lets the superadmin block an admin', () => {
    expect(canBlockUser(superadmin, admin)).toBe(true);
  });

  it('never lets anyone block themselves', () => {
    expect(canBlockUser(superadmin, superadmin)).toBe(false);
  });

  it('gives a moderator no blocking power at all', () => {
    expect(canBlockUser(moderator, contributor)).toBe(false);
    expect(canBlockUser(null, contributor)).toBe(false);
  });
});
