import { Suspense } from "react";
import SettingsContent from "./SettingsContent";
import AppLayout from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

function SettingsLoading() {
  return (
    <AppLayout>
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    </AppLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
