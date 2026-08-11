import { Plan } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      avatar?: string | null;
      plan?: Plan;
      usageCount?: number;
      usageLimit?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    avatar?: string | null;
    plan?: Plan;
    usageCount?: number;
    usageLimit?: number;
  }
}
