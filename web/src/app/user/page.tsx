"use client";

import React, { Suspense } from "react";
import UserClientPage from "./[username]/UserClientPage";

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
