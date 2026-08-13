"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p className={`text-lg ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Last updated: August 2026
            </p>
          </div>

          <div className={`prose ${isDark ? "prose-invert" : ""} max-w-none`}>
            <h3>1. Introduction</h3>
            <p>
              Welcome to CommunityConnect. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>

            <h3>2. The Data We Collect About You</h3>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul>
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
            </ul>

            <h3>3. How We Use Your Personal Data</h3>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul>
              <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>

            <h3>4. Data Security</h3>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
            </p>

            <h3>5. Contact Us</h3>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@communityconnect.io.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
