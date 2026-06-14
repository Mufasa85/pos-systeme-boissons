// ============================================================
// Role-based access control (RBAC) for the POS UI.
//
// Three roles exist server-side (`cashier`, `manager`, `admin`).
// They are mapped onto the front-end routes and UI capabilities
// here so every component (sidebar, route guard, branding
// dialog trigger, …) shares a single source of truth.
//
// Access matrix
// -------------
//                   cashier  manager  admin
//   Point of Sale     ✅       ✅      ✅
//   Dashboard                   ✅      ✅
//   Menu              ✅       ✅      ✅
//   Stock                       ✅      ✅
//   Categories                  ✅      ✅
//   Users                                ✅
//   Reports                               ✅   ← intentionally
//   History             ✅       ✅      ✅
//   Branding dialog                          ✅
//
// Manager is *not* allowed to touch branding, users or reports.
// Cashier is only allowed to operate the till (POS, menu, history).
// ============================================================

export type Role = "cashier" | "manager" | "admin";

/** The route key used in the sidebar and the route guard. */
export type NavKey =
  | "pos"
  | "dashboard"
  | "menu"
  | "stock"
  | "categories"
  | "users"
  | "reports"
  | "history";

/** Mapping between nav key and the URL it points to. */
export const NAV_PATHS: Record<NavKey, string> = {
  pos: "/",
  dashboard: "/dashboard",
  menu: "/menu",
  stock: "/stock",
  categories: "/categories",
  users: "/users",
  reports: "/reports",
  history: "/history",
};

/** Inverse lookup: URL → nav key (used by the route guard). */
export const PATH_TO_NAV: Record<string, NavKey> = Object.fromEntries(
  (Object.entries(NAV_PATHS) as [NavKey, string][]).map(([key, path]) => [
    path,
    key,
  ]),
) as Record<string, NavKey>;

/** Roles that can access each nav entry. */
export const NAV_ACCESS: Record<NavKey, readonly Role[]> = {
  pos: ["cashier", "manager", "admin"],
  dashboard: ["manager", "admin"],
  menu: ["cashier", "manager", "admin"],
  stock: ["manager", "admin"],
  categories: ["manager", "admin"],
  users: ["admin"],
  reports: ["admin"],
  history: ["cashier", "manager", "admin"],
};

/** Capability flags. The branding dialog is admin-only. */
export const CAPABILITIES = {
  /** Can open the Branding settings dialog. */
  manageBranding: ["admin"] as readonly Role[],
  /** Can CRUD users. */
  manageUsers: ["admin"] as readonly Role[],
  /** Can see reports. */
  viewReports: ["admin"] as readonly Role[],
  /** Can CRUD products and categories. */
  manageCatalog: ["manager", "admin"] as readonly Role[],
  /** Can see the analytics dashboard. */
  viewDashboard: ["manager", "admin"] as readonly Role[],
} as const;

export type Capability = keyof typeof CAPABILITIES;

/**
 * Returns true when the role is allowed to access the given nav
 * key. `null` means "no role" (not logged in) — never allowed.
 */
export function canAccessNav(role: Role | null | undefined, key: NavKey) {
  if (!role) return false;
  return NAV_ACCESS[key].includes(role);
}

/** Returns true when the role is allowed to use a capability. */
export function hasCapability(
  role: Role | null | undefined,
  capability: Capability,
) {
  if (!role) return false;
  return CAPABILITIES[capability].includes(role);
}

/** A short, human-friendly label for a role (used in the UI). */
export const ROLE_LABELS: Record<Role, string> = {
  cashier: "Caissier",
  manager: "Manager",
  admin: "Administrateur",
};
