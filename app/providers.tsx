"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function SessionSync() {
  const { update } = useSession();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      void update();
    }
  }, [searchParams, update]);

  return null;
}

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <SessionSync />
      </Suspense>
      {children}
    </SessionProvider>
  );
}
