import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Map routes to required permissions
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard/students": ["CAN_MANAGE_STUDENTS"],
  "/dashboard/fees/collect": ["CAN_COLLECT_FEES"],
  "/dashboard/fees/dues": ["CAN_COLLECT_FEES"],
  "/dashboard/fees/config": ["CAN_MANAGE_CONFIG"],
  "/dashboard/fees/receipt": ["CAN_COLLECT_FEES"],
  "/dashboard/accounts": ["CAN_MANAGE_CONFIG"],
  "/dashboard/expenses": ["CAN_ADD_EXPENSE"],
  "/dashboard/reports": ["CAN_VIEW_REPORTS"],
  "/dashboard/staff": ["CAN_MANAGE_STAFF"],
  "/dashboard/roles": ["CAN_MANAGE_CONFIG"],
  "/dashboard/inventory": ["CAN_MANAGE_INVENTORY"],
  "/dashboard/audit-log": ["CAN_VIEW_AUDIT_LOG"],
  // ADMIN_ONLY is a sentinel no role has; only the Admin role (which
  // bypasses permission checks) can reach these routes.
  "/dashboard/settings": ["ADMIN_ONLY"],
};

function getRequiredPermissions(pathname: string): string[] | null {
  // Check exact match first, then prefix match for dynamic routes
  for (const [route, perms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return perms;
    }
  }
  return null; // No restriction (e.g., /dashboard, /login)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login.
  // /api/cron/* is excluded — those routes have no browser session and
  // enforce their own CRON_SECRET bearer check instead.
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api/cron")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // RBAC: check route permissions for authenticated users on dashboard routes
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const requiredPerms = getRequiredPermissions(request.nextUrl.pathname);

    if (requiredPerms) {
      // Fetch user's permissions via staff -> role -> role_permissions -> permissions
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("role:roles(name, role_permissions(permission:permissions(code)))")
        .eq("user_id", user.id)
        .maybeSingle();

      let userPerms: string[] = [];

      if (staffRecord?.role) {
        const role = staffRecord.role as unknown as {
          name: string;
          role_permissions: { permission: { code: string } }[];
        };
        // Admin bypasses all checks
        if (role.name === "Admin") {
          return supabaseResponse;
        }
        userPerms = role.role_permissions.map((rp) => rp.permission.code);
      }

      const hasAccess = requiredPerms.some((p) => userPerms.includes(p));
      if (!hasAccess) {
        // Redirect to dashboard with no access
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
