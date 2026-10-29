"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export default function PrivacyPolicy() {
  const { isDark } = useAppearance();

  return (
    <PageTransition>
      <main
        className={`min-h-screen ${
          isDark
            ? "bg-zinc-950 text-zinc-100"
            : "bg-zinc-50 text-zinc-900"
        } py-12 px-4 sm:px-6 lg:px-8`}
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <Link
            href="/home"
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            } transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <header className="space-y-4">
            <h1
              className={`text-4xl font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              Privacy Policy
            </h1>
            <p
              className={`text-lg ${
                isDark ? "text-zinc-400" : "text-zinc-600"
              }`}
            >
              Last updated: October 2026
            </p>
          </header>

          <article
            className={`prose ${
              isDark ? "prose-invert" : ""
            } max-w-none`}
          >
            <h2>1. Introduction</h2>
            <p>
              CommunityConnect ("we", "us", or "our") respects your privacy.
              This Privacy Policy explains how we collect, access, use, store,
              disclose, and protect information when you use our website and
              services, including when you connect a Google Account.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
              <li>
                <strong>Identity data:</strong> such as your name, username,
                and profile information you choose to provide.
              </li>
              <li>
                <strong>Contact data:</strong> such as your email address and
                telephone number.
              </li>
              <li>
                <strong>Technical data:</strong> such as IP address, browser
                type, device information, and login or diagnostic data.
              </li>
              <li>
                <strong>Google user data:</strong> only the Google Account
                information and data permitted by the OAuth permissions you
                approve and needed to provide the features you use. The exact
                data depends on the Google services and scopes requested by
                CommunityConnect.
              </li>
            </ul>

            <h2>3. How We Use Google User Data</h2>
            <p>
              We access and use Google user data only to provide the
              CommunityConnect features that you request, to operate those
              features, and to maintain their security. We do not use Google
              user data for serving advertisements, sell it to data brokers,
              or use it to determine creditworthiness or for lending purposes.
              We do not use Google user data to train generalized artificial
              intelligence or machine-learning models.
            </p>
            <p>
              We do not request or access Google data beyond the permissions
              necessary for the features you choose to use. You can revoke
              CommunityConnect's access through your Google Account security
              settings.
            </p>

            <h2>4. How We Share, Transfer, or Disclose Google User Data</h2>
            <p>
              We do not sell Google user data. We do not share, transfer, or
              disclose Google user data to third parties except in the limited
              circumstances described below:
            </p>
            <ul>
              <li>
                <strong>Service providers:</strong> We may process data through
                hosting, storage, security, or infrastructure providers only
                when needed to operate CommunityConnect. They may process data
                on our behalf under appropriate confidentiality and security
                obligations. List the actual providers used by your app here
                before publishing this policy.
              </li>
              <li>
                <strong>At your direction:</strong> Data may be transferred
                when necessary to perform a feature you explicitly request,
                with any consent required for that transfer.
              </li>
              <li>
                <strong>Legal and security reasons:</strong> We may disclose
                data when required by law or when reasonably necessary to
                detect, prevent, or address fraud, abuse, or security
                incidents, or to protect users and the service.
              </li>
              <li>
                <strong>Business transfers:</strong> Google user data will not
                be transferred as part of a merger, acquisition, or sale of
                assets unless permitted by applicable law and the relevant
                Google policies, with required prior notice and consent.
              </li>
            </ul>
            <p>
              We do not allow third parties to use Google user data for their
              own advertising, data brokerage, or unrelated purposes. Any
              handling of Google user data is subject to the Google API
              Services User Data Policy, including its Limited Use requirements.
            </p>

            <h2>5. Data Protection and Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational
              safeguards designed to protect personal information and Google
              user data against unauthorized access, loss, misuse, alteration,
              or disclosure. Depending on the systems used to operate
              CommunityConnect, safeguards may include HTTPS/TLS for data in
              transit, restricted access to production systems, authentication
              and access controls, secure secret and token handling, and
              monitoring for suspicious activity. Only include safeguards in
              this list that your deployed application actually implements.
            </p>
            <p>
              OAuth access tokens and other credentials must be stored securely
              and must not be exposed in client-side code, public repositories,
              URLs, or application logs. Access is limited to the people and
              systems that need it to operate and secure the service.
              No method of transmission or storage is completely secure.
            </p>

            <h2>6. Data Retention and Deletion</h2>
            <p>
              We retain personal information and Google user data only for as
              long as reasonably necessary to provide the requested features,
              meet legitimate operational needs, resolve disputes, and comply
              with legal obligations. When data is no longer needed, we delete
              it or securely dispose of it in accordance with our retention
              practices, subject to legal requirements and backup cycles.
            </p>
            <p>
              You may request deletion of data associated with your account by
              contacting us. Revoking Google access prevents future access
              through that authorization, but may not automatically delete
              information already stored by CommunityConnect; contact us to
              request deletion of such information.
            </p>

            <h2>7. Your Choices and Rights</h2>
            <p>
              You can choose whether to grant Google permissions, revoke
              previously granted access in your Google Account, and contact us
              to ask about, correct, or delete your personal information,
              subject to applicable law.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              CommunityConnect is not intended for children who are not
              permitted to use the service under applicable law. If you believe
              a child has provided personal information in violation of
              applicable requirements, contact us so we can review the request.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy when our practices or legal
              obligations change. We will publish the updated policy on this
              page and revise the "Last updated" date.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              For questions, requests, or concerns about this Privacy Policy
              or our handling of Google user data, contact us at{" "}
              <a href="mailto:privacy@communityconnect.io">
                privacy@communityconnect.io
              </a>
              .
            </p>
          </article>
        </div>
      </main>
    </PageTransition>
  );
}
