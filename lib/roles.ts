export const Roles = {
  PLAYER: "PLAYER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles]; 