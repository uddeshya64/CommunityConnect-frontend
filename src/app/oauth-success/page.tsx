import { Suspense } from "react";
import OAuthSuccessContent from "./OAuthSuccessContent";

function OAuthSuccessLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin mx-auto" />

        <p className="mt-4 text-zinc-400">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={<OAuthSuccessLoading />}>
      <OAuthSuccessContent />
    </Suspense>
  );
}