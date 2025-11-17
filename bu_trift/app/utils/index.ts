import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with proper conflict resolution
 * This is used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a page URL for navigation
 * In React Router, we can use direct paths
 */
export function createPageUrl(page: string): string {
  // Convert page names to routes
  const routeMap: Record<string, string> = {
    Home: "/",
    Browse: "/items",
    Sell: "/sell",
    ItemDetails: "/items",
    Messages: "/messages",
    Profile: "/profile",
  };

  return routeMap[page] || `/${page.toLowerCase()}`;
}
