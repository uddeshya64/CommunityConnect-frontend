"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export default function TermsOfService() {
  const { isDark, activeAccent } = useAppearance();

  return (
    <PageTransition>
      <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"} py-12 px-4 sm:px-6 lg:px-8`}>
        <div className="max-w-3xl mx-auto space-y-8">
          <Link
            href="/home"
            className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"} transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="space-y-4">
            <h1 className={`text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Terms of Service
            </h1>
            <p className={`text-lg ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Last updated: August 2026
            </p>
          </div>

          <div className={`prose ${isDark ? "prose-invert" : ""} max-w-none`}>
            <h3>1. Terms</h3>
            <p>
              By accessing the website at CommunityConnect, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
            </p>

            <h3>2. Use License</h3>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on CommunityConnect's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>

            <h3>3. Disclaimer</h3>
            <p>
              The materials on CommunityConnect's website are provided on an 'as is' basis. CommunityConnect makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h3>4. Limitations</h3>
            <p>
              In no event shall CommunityConnect or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on CommunityConnect's website.
            </p>

            <h3>5. Revisions and Errata</h3>
            <p>
              The materials appearing on CommunityConnect's website could include technical, typographical, or photographic errors. CommunityConnect does not warrant that any of the materials on its website are accurate, complete or current.
            </p>

            <h3>6. Governing Law</h3>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
