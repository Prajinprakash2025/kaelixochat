import { WorkspaceMember, Department, DepartmentCode, MemberRole } from "@/types";

/**
 * Checks if a user is a Workspace Owner or Global Admin.
 */
export function isWorkspaceOwner(user: WorkspaceMember | null | undefined): boolean {
  if (!user?.role) return false;
  const r = user.role.toLowerCase().trim();
  return r === "owner" || r === "workspace owner" || r === "admin";
}

/**
 * Checks if a user is a Department Head or Manager.
 */
export function isDepartmentHead(user: WorkspaceMember | null | undefined): boolean {
  if (!user?.role) return false;
  const r = user.role.toLowerCase().trim();
  return r === "manager" || r === "department head" || r === "lead";
}

/**
 * Backward-compatible alias for isDepartmentHead.
 */
export function isDepartmentManager(user: WorkspaceMember | null | undefined): boolean {
  return isDepartmentHead(user);
}

/**
 * Checks if a user has permission to add new members.
 * Workspace Owners can add to any department.
 * Department Managers can add to their own department.
 * Regular members cannot add.
 */
export function canAddMember(currentUser: WorkspaceMember | null | undefined): boolean {
  if (!currentUser) return false;
  return isWorkspaceOwner(currentUser) || isDepartmentHead(currentUser);
}

/**
 * Returns allowed departments and whether department selection is locked for adding a member.
 */
export function getAddMemberDepartmentScope(
  currentUser: WorkspaceMember,
  departments: Department[]
): {
  allowedDepartments: Department[];
  isLocked: boolean;
  defaultDepartment: DepartmentCode;
} {
  if (isWorkspaceOwner(currentUser)) {
    return {
      allowedDepartments: departments.filter((d) => d.code !== "all"),
      isLocked: false,
      defaultDepartment: "dev",
    };
  }
  if (isDepartmentHead(currentUser)) {
    const managerDept = departments.find((d) => d.code === currentUser.department);
    return {
      allowedDepartments: managerDept ? [managerDept] : [],
      isLocked: true,
      defaultDepartment: currentUser.department,
    };
  }
  return {
    allowedDepartments: [],
    isLocked: true,
    defaultDepartment: "dev",
  };
}

/**
 * Determines whether currentUser has permission to remove targetMember.
 *
 * Rules:
 * 1. Cannot remove self.
 * 2. Cannot remove a Workspace Owner.
 * 3. Workspace Owner can remove Managers and Members across any department.
 * 4. Department Head/Manager can ONLY remove Members within their own department.
 * 5. Department Head/Manager CANNOT remove another Manager/Head.
 * 6. Regular Member cannot remove anyone.
 */
export function canRemoveMember(
  currentUser: WorkspaceMember | null | undefined,
  targetMember: WorkspaceMember | null | undefined
): { allowed: boolean; reason?: string } {
  if (!currentUser || !targetMember) {
    return { allowed: false, reason: "Invalid member reference." };
  }

  // Guard 1: Cannot remove self
  if (currentUser.id === targetMember.id) {
    return { allowed: false, reason: "You cannot remove your own account." };
  }

  // Guard 2: Cannot remove Workspace Owner
  if (isWorkspaceOwner(targetMember)) {
    return { allowed: false, reason: "Workspace Owners cannot be removed." };
  }

  // Scenario 3: Workspace Owner authority
  if (isWorkspaceOwner(currentUser)) {
    return { allowed: true };
  }

  // Scenario 4: Department Manager authority
  if (isDepartmentHead(currentUser)) {
    // Cross-department check
    if (targetMember.department !== currentUser.department) {
      return {
        allowed: false,
        reason: `Department Managers can only manage staff in their assigned department (${currentUser.department.toUpperCase()}).`,
      };
    }
    // Cannot remove peer manager
    if (isDepartmentHead(targetMember)) {
      return {
        allowed: false,
        reason: "Only the Workspace Owner can remove a Department Manager.",
      };
    }
    return { allowed: true };
  }

  // Scenario 5: Regular Member
  return {
    allowed: false,
    reason: "Only Workspace Owners and Department Managers can remove members.",
  };
}

/**
 * Normalizes member role to human-friendly Title Case label.
 */
export function formatRoleLabel(role: MemberRole | string | undefined): string {
  if (!role) return "Member";
  const r = role.toLowerCase().trim();
  switch (r) {
    case "owner":
    case "workspace owner":
      return "Workspace Owner";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "department head":
      return "Department Head";
    default:
      return "Member";
  }
}
