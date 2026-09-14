import { describe, expect, it } from 'vitest';
import {
  ROLES,
  canDeleteFeature,
  canEditFeature,
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
