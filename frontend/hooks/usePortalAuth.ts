"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PortalType, PORTAL_ROUTES } from "@/types/portal";
import log from "@/lib/logger";

/**
 * Portal authentication and route guard hook
 * Ensures users are authenticated before accessing portal-specific routes
 * 
 * @param requiredPortal - The portal type required for this route (optional)
 * @returns Authentication state and portal utilities
 */
export function usePortalAuth(requiredPortal?: PortalType) {
  const { user, isLoading, openLoginModal, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady || isLoading) return;

    // If user is not authenticated and trying to access a portal route
    if (!user && requiredPortal) {
      log.info(`Unauthenticated access to ${requiredPortal} portal, redirecting to home`);
      router.push("/");
      // Optionally open login modal
      // openLoginModal();
      return;
    }

    // TODO: Add role-based access control here
    // Check if user has permission to access this portal
    // if (user && requiredPortal) {
    //   const hasAccess = checkPortalAccess(user, requiredPortal);
    //   if (!hasAccess) {
    //     router.push("/");
    //   }
    // }
  }, [user, isLoading, isReady, requiredPortal, router, pathname]);

  /**
   * Navigate to a specific portal
   */
  const navigateToPortal = (portalType: PortalType) => {
    const route = PORTAL_ROUTES[portalType];
    if (route) {
      router.push(route);
    } else {
      log.error(`Invalid portal type: ${portalType}`);
    }
  };

  /**
   * Check if user has access to a specific portal
   * TODO: Implement based on your business logic
   */
  const hasPortalAccess = (portalType: PortalType): boolean => {
    if (!user) return false;
    
    // Example: Admin has access to all portals
    if (user.role === "admin") return true;
    
    // TODO: Add more granular permission checks
    // For now, authenticated users have access to all portals
    return true;
  };

  /**
   * Get current portal from pathname
   */
  const getCurrentPortal = (): PortalType | null => {
    if (pathname.includes("/doctor")) return "doctor";
    if (pathname.includes("/patient")) return "patient";
    if (pathname.includes("/admin")) return "admin";
    return null;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isReady,
    navigateToPortal,
    hasPortalAccess,
    getCurrentPortal,
    currentPortal: getCurrentPortal(),
  };
}

