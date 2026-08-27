import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    locationId: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      locationId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    locationId?: string;
  }
}
