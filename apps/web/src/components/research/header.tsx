"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ExternalLink, Menu, Users } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { BlockILogo } from "./illinois-logo";

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const [hasScrolled, setHasScrolled] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    const updateHeader = (): void => setHasScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const isSolid = !isHome || hasScrolled;

  return (
    <header
      id="top"
      className={`portal-header${isHome ? " is-home" : ""}${isSolid ? " is-solid" : " is-overlay"}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="portal-container header-inner">
        <Link href="/" className="brand">
          <BlockILogo className="h-10 w-7" />
          <span>
            <strong>Illinois Research</strong>
            <small>University of Illinois Urbana-Champaign</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#about-illinois">Our university</Link>
          <Link href="/#faculty">Researchers</Link>
          <a href="https://illinois.edu" target="_blank" rel="noreferrer">
            About Illinois ↗
          </a>
        </nav>
        <div className="mobile-nav">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mobile-menu-trigger"
                aria-label="Open main navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="mobile-menu-content"
            >
              <DropdownMenuItem asChild>
                <Link href="/#about-illinois">
                  <Building2 aria-hidden="true" />
                  Our university
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/#faculty">
                  <Users aria-hidden="true" />
                  Researchers
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="https://illinois.edu" target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  About Illinois
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
