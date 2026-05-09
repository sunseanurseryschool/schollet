import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/*
         * Smooth radial-gradient bg with a subtle noise-like dot pattern.
         * Light mode: faint blue-tinted white at top → #F8FAFC at bottom.
         * Dark mode: deep slate gradient via dark: class variants.
         */}
        <main
          className="
            flex-1 min-h-screen
            bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#DBEAFE33_0%,transparent_60%),linear-gradient(180deg,#F0F6FF_0%,#F8FAFC_30%,#F8FAFC_100%)]
            dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#1E3A5F55_0%,transparent_60%),linear-gradient(180deg,#0F172A_0%,#0F172A_30%,#0F172A_100%)]
            [background-attachment:fixed]
          "
        >
          {/* Subtle dot-grid texture overlay — reduced opacity in dark mode */}
          <div
            className="pointer-events-none fixed inset-0 -z-0 opacity-100 dark:opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, #CBD5E133 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative z-10">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
