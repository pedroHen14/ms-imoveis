"use client";

import type { ReactNode } from "react";
import { trackLeadConversion } from "@/lib/tracking";

interface TrackedWhatsAppLinkProps {
  href: string;
  className?: string;
  label?: string;
  propertyCode?: number;
  propertyTitle?: string;
  value?: number | null;
  children: ReactNode;
  onClick?: () => void;
}

export function TrackedWhatsAppLink({
  href,
  className,
  label,
  propertyCode,
  propertyTitle,
  value,
  children,
  onClick,
}: TrackedWhatsAppLinkProps) {
  function handleClick() {
    trackLeadConversion({
      method: "whatsapp",
      label,
      propertyCode,
      propertyTitle,
      value,
    });
    onClick?.();
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
