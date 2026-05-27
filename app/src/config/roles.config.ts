import { UserRoles } from './user-roles.enum';

export type RolesConfig = {
  [K in UserRoles]: string[];
};

export const ROLES_CONFIG: RolesConfig = {
  [UserRoles.DEMO]: ['users.view_profile'],
  [UserRoles.ADMIN]: ['users.view_profile'],
};

export function getAllPermissions(): string[] {
  const allPermissions = new Set<string>();
  for (const permissions of Object.values(ROLES_CONFIG)) {
    permissions.forEach((permission) => allPermissions.add(permission));
  }
  return Array.from(allPermissions);
}

export function getAllRoleNames(): string[] {
  return Object.values(UserRoles);
}

export function getPermissionsForRole(role: UserRoles): string[] {
  return ROLES_CONFIG[role] || [];
}
