"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/cms/content";

const shortLabels: Record<string, string> = {
  "Informatie voor patiënten": "Voor patiënten & naasten",
  "Informatie voor verwijzers": "Voor verwijzers",
};

export function Navigation({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div
      className="navigation"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          document.getElementById("menu-toggle")?.focus();
        }
      }}
    >
      <button
        id="menu-toggle"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "Sluiten" : "Menu"}
        <span
          className={open ? "menu-lines is-open" : "menu-lines"}
          aria-hidden="true"
        >
          <i />
          <i />
        </span>
      </button>
      <nav
        id="main-navigation"
        className={open ? "main-navigation is-open" : "main-navigation"}
        aria-label="Hoofdnavigatie"
      >
        {items
          .filter((item) => item.href !== "/")
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {shortLabels[item.title] ?? item.title}
            </Link>
          ))}
      </nav>
    </div>
  );
}
