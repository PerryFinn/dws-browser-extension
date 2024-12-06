import { GalleryVerticalEnd } from "lucide-react";
import type * as React from "react";
import packageJson from "../../../package.json";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from "@/components/ui/sidebar";
import { Link, useMatch, useMatchRoute, useMatches, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { routeTree } from "../routeTree.gen";

export function OptionPageSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const matches = useMatches();
  // const router = useRouter();

  const match = useMatch({ strict: false });

  useEffect(() => {
    console.log("matches :>> ", matches, routeTree, match);
  }, [matches, match]);

  const activeRoute = useMemo(() => {
    const len = matches.length;
    if (len === 0) {
      return null;
    }
    return matches[len - 1];
  }, [matches]);

  const [homeRoute] = matches;

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b h-16">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={homeRoute.fullPath}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  {/* <span className="font-semibold truncate">{packageJson.displayName}</span> */}
                  <span className="font-semibold truncate">{123123}</span>
                  <span className="">{packageJson.version}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem key="settings">
              <SidebarMenuButton asChild>
                <div className="font-medium cursor-auto">设置</div>
              </SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={activeRoute?.fullPath.startsWith("/settings/base")}>
                    <Link to="/settings/base">基本配置</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
            <SidebarMenuItem key="posts">
              <SidebarMenuButton asChild isActive={activeRoute?.fullPath.startsWith("/posts")}>
                <Link to="/posts" className="font-medium">
                  文章
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="comps">
              <SidebarMenuButton asChild isActive={activeRoute?.fullPath.startsWith("/comps")}>
                <Link to="/comps" className="font-medium">
                  组件菜市场
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
