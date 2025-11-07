// Portal type definitions for multi-portal architecture
export type PortalType = "doctor" | "student" | "patient" | "admin";

export interface Portal {
  id: PortalType;
  title: string;
  subtitle: string;
  buttonText: string;
  loginTitle: string;
  color: string;
  route: string;
}

export interface PortalUser {
  id: string;
  email: string;
  role: string;
  portalType?: PortalType;
  avatar_url?: string;
}

export const PORTAL_ROUTES: Record<PortalType, string> = {
  doctor: "/doctor",
  student: "/student",
  patient: "/patient",
  admin: "/admin",
};

