import type { RoleId } from "./types";

export interface RoleInfo {
  id: RoleId;
  initials: string;
  title: string;
  blurb: string;
}

export const ROLES: Record<RoleId, RoleInfo> = {
  pm: {
    id: "pm",
    initials: "PM",
    title: "Product manager",
    blurb: "Owns scope, priorities and requirements; coordinates the team.",
  },
  architect: {
    id: "architect",
    initials: "AR",
    title: "Architect",
    blurb: "Owns system design, interfaces and technical decisions.",
  },
  dev: {
    id: "dev",
    initials: "DV",
    title: "Developer",
    blurb: "Turns approved designs into implementation plans and code.",
  },
  qa: {
    id: "qa",
    initials: "QA",
    title: "QA engineer",
    blurb: "Owns test strategy, acceptance checks and release readiness.",
  },
};
