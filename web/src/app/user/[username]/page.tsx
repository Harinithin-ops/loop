import React, { Suspense } from "react";
import UserClientPage from "./UserClientPage";

// Implement generateStaticParams to satisfy Next.js static export compilation.
// Returns a default fallback slug during the static build, while letting client-side
// dynamic route resolving handle any loaded profiles inside the Capacitor web app.
export async function generateStaticParams() {
  return [
    { username: "user" }
  ];
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="pt-32 flex flex-col items-center justify-center space-y-4 min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
        <p className="text-xs font-semibold text-primary/60 font-sans tracking-widest animate-pulse">DECRYPTING PROFILE MODULE...</p>
      </div>
    }>
      <UserClientPage />
    </Suspense>
  );
}
