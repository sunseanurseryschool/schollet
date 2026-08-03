"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  Settings,
  BookOpen,
  BarChart3,
  Package,
  UserCog,
  ClipboardList,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type NavItem = { title: string; href: string; icon: typeof LayoutDashboard; permissions?: string[]; adminOnly?: boolean };

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Students", href: "/dashboard/students", icon: Users, permissions: ["CAN_MANAGE_STUDENTS"] },
  { title: "Collect Fee", href: "/dashboard/fees/collect", icon: IndianRupee, permissions: ["CAN_COLLECT_FEES"] },
  { title: "Pending Dues", href: "/dashboard/fees/dues", icon: AlertCircle, permissions: ["CAN_COLLECT_FEES"] },
  { title: "Fee Config", href: "/dashboard/fees/config", icon: Settings, permissions: ["CAN_MANAGE_CONFIG"] },
];

const financeNav: NavItem[] = [
  { title: "Accounts", href: "/dashboard/accounts", icon: BookOpen, permissions: ["CAN_MANAGE_CONFIG"] },
  { title: "Expenses", href: "/dashboard/expenses", icon: ClipboardList, permissions: ["CAN_ADD_EXPENSE"] },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3, permissions: ["CAN_VIEW_REPORTS"] },
];

const adminNav: NavItem[] = [
  { title: "Staff", href: "/dashboard/staff", icon: UserCog, permissions: ["CAN_MANAGE_STAFF"] },
  { title: "Roles", href: "/dashboard/roles", icon: Settings, permissions: ["CAN_MANAGE_CONFIG"] },
  { title: "Inventory", href: "/dashboard/inventory", icon: Package, permissions: ["CAN_MANAGE_INVENTORY"] },
  { title: "Audit Log", href: "/dashboard/audit-log", icon: FileText, permissions: ["CAN_VIEW_AUDIT_LOG"] },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, adminOnly: true },
];

interface UserInfo {
  name: string;
  role: string;
  permissions: string[];
}

function filterNav(items: NavItem[], permissions: string[], role: string): NavItem[] {
  return items.filter((item) => {
    if (item.adminOnly) return role === "Admin";
    if (!item.permissions) return true;
    return item.permissions.some((p) => permissions.includes(p));
  });
}

export function AppSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      supabase
        .from("staff")
        .select("name, role:roles(name, role_permissions(permission:permissions(code)))")
        .eq("user_id", authUser.id)
        .maybeSingle()
        .then(({ data }) => {
          const role = data?.role as unknown as {
            name: string;
            role_permissions: { permission: { code: string } }[];
          } | null;
          const perms = role?.role_permissions.map((rp) => rp.permission.code) ?? [];
          setUser({
            name: (data?.name as string) ?? authUser.email ?? "",
            role: role?.name ?? "Admin",
            permissions: perms,
          });
        });
    });
  }, []);

  const perms = user?.permissions ?? [];
  const role = user?.role ?? "";
  const visibleMain = filterNav(mainNav, perms, role);
  const visibleFinance = filterNav(financeNav, perms, role);
  const visibleAdmin = filterNav(adminNav, perms, role);

  return (
    <Sidebar className="border-r border-border-light/80 bg-surface/95 backdrop-blur-md">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SidebarHeader className="px-4 py-5 border-b border-border-lighter">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="Schollet"
            width={36}
            height={36}
            className="rounded-lg transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-text-primary tracking-tight leading-tight">
              {APP_NAME}
            </span>
            {user && (
              <span className="text-[11px] text-text-tertiary leading-tight mt-0.5">
                <span className="inline-flex items-center rounded-full bg-brand-light px-1.5 py-px text-[10px] font-medium text-brand">
                  {user.role}
                </span>
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Nav content ────────────────────────────────────────────────────── */}
      <SidebarContent className="px-2 py-3 overflow-y-auto">
        {/* Main */}
        {visibleMain.length > 0 && (
        <SidebarGroup className="mb-1">
          <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className={`
                        relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm
                        font-medium transition-all duration-150
                        before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
                        before:h-5 before:w-0.5 before:rounded-full before:transition-all before:duration-200
                        ${
                          isActive
                            ? "bg-brand-light text-brand before:bg-brand before:opacity-100"
                            : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary before:opacity-0 hover:before:opacity-40 hover:before:bg-brand"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                          isActive ? "text-brand" : "text-text-secondary"
                        }`}
                      />
                      <span
                        className={` ${
                          isActive ? "text-brand" : "text-text-secondary"
                        }`}
                      >
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Finance */}
        {visibleFinance.length > 0 && (
          <SidebarGroup className="mb-1">
            <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Finance
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleFinance.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        className={`
                          relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm
                          font-medium transition-all duration-150
                          before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
                          before:h-5 before:w-0.5 before:rounded-full before:transition-all before:duration-200
                          ${
                            isActive
                              ? "bg-brand-light text-brand before:bg-brand before:opacity-100"
                              : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary before:opacity-0 hover:before:opacity-40 hover:before:bg-brand"
                          }
                        `}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            isActive ? "text-brand" : "text-text-secondary"
                          }`}
                        />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        className={`
                          relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm
                          font-medium transition-all duration-150
                          before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
                          before:h-5 before:w-0.5 before:rounded-full before:transition-all before:duration-200
                          ${
                            isActive
                              ? "bg-brand-light text-brand before:bg-brand before:opacity-100"
                              : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary before:opacity-0 hover:before:opacity-40 hover:before:bg-brand"
                          }
                        `}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            isActive ? "text-brand" : "text-text-secondary"
                          }`}
                        />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <SidebarFooter className="px-4 py-3 border-t border-border-lighter">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
            v1.0
          </span>

          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
