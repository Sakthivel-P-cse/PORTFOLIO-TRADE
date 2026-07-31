"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesCombined, CircleHelp, Landmark, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { ModalManager } from "@/components/modals/modal-manager";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { title: string; user: { name: string | null; email: string; avatarUrl: string | null }; children: ReactNode }) {
  const pathname = usePathname();
  const openModal = useUIStore((state) => state.openModal);
  return <div className="aureum-shell">
    <aside className="aureum-sidebar">
      <div className="aureum-brand"><span><Landmark size={20}/></span><div><strong>Aureum Capital</strong><small>{user.name ?? user.email}</small></div></div>
      <button className="aureum-button primary aureum-new-trade" onClick={() => openModal({ type: "journal" })}><Plus size={18}/> New trade</button>
      <nav className="aureum-nav" aria-label="Primary navigation">{navItems.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""}><item.icon size={19}/><span>{item.label}</span></Link>; })}</nav>
      <nav className="aureum-utility" aria-label="Secondary navigation"><a href="mailto:support@aureum.app"><CircleHelp size={19}/> Support</a><form action="/auth/signout" method="post"><button type="submit"><LogOut size={19}/> Sign out</button></form></nav>
    </aside>
    <main className="aureum-main">{children}</main>
    <nav className="aureum-mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""}><item.icon size={20}/><span>{item.label}</span></Link>; })}<button onClick={() => openModal({ type: "journal" })} aria-label="Add trade"><Plus size={22}/></button></nav>
    <ModalManager/>
  </div>;
}
