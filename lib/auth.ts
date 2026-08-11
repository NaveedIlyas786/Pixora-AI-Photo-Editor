import { Plan } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "./prisma";

const common = async ({
  email,
  name,
  avatar,
  plan,
  usageCount,
  usageLimit,
}: {
  email: string;
  name: string;
  avatar: string;
  plan: Plan;
  usageCount: number;
  usageLimit: number;
}) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      const user = await prisma.users.create({
        data: {
          email,
          name,
          avatar,
          plan,
          usageCount,
          usageLimit,
        },
      });
      return user;
    } else {
      return user;
    }
  } catch (error) {
    console.log(error);
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile: async (profile) => {
        const email = profile.email;
        const name = profile.name;
        const avatar = profile.picture;

        if (!email || !name || !avatar) {
          throw new Error("Google profile is missing required fields");
        }

        await common({
          email,
          name,
          avatar,
          plan: "Free",
          usageCount: 0,
          usageLimit: 3,
        });
        return {
          id: profile.sub, // Use 'sub' as the ID from Google OAuth
          email,
          name,
          image: avatar, // Use 'picture' for avatar
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // JWT callback to add custom fields to the token
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.avatar = user.image;
        token.plan = "Free";
        token.usageCount = 0;
        token.usageLimit = 3;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = token.email;
      session.user.avatar = token.avatar;
      session.user.plan = token.plan;
      session.user.usageCount = token.usageCount;
      session.user.usageLimit = token.usageLimit;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};