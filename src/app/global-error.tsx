"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/** Last-resort recovery UI when the root application cannot render. */
export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Uncaught application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5 text-[#1d1b19]">
        <main className="max-w-lg text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#a9803f] uppercase">Solure Scents</p>
          <h1 className="mt-5 font-serif text-5xl">We lost the scent.</h1>
          <p className="mt-4 leading-7 text-[#6f6a62]">An unexpected error interrupted this experience. Please try again.</p>
          <Button className="mt-8" onClick={unstable_retry}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
