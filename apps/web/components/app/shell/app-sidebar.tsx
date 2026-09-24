"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/components/providers/session-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { isActive, PRIMARY_NAV, SETTINGS_NAV, type NavItem } from "./nav";
import { UserMenu } from "./user-menu";

function NavGroup({ label, items }: { label?: string; items: NavItem[] }) {
  const pathname = usePathname();
  const can = useCan();
  const visible = items.filter((item) => !item.requires || can(item.requires.action, item.requires.subject));
  if (!visible.length) return null;

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
                  P
                </span>
                <span className="font-semibold tracking-tight">Poyesis</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={PRIMARY_NAV} />
        <NavGroup label="Settings" items={SETTINGS_NAV} />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
