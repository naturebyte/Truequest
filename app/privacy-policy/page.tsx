import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – TrueQuest Learning",
  description:
    "Learn how TrueQuest Learning collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
            TrueQuest Learning
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold">
            Privacy Policy
          </h1>
          <p className="text-sm text-white/70">Last updated: 11 February 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Introduction</h2>
          <p>
            At TrueQuest Learning, we are committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you visit our website or engage with
            our services. By using our website, you agree to the terms outlined
            in this policy.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            Information We Collect
          </h2>
          <p>
            We may collect personal information such as your name, email
            address, phone number, and postal address when you submit inquiries,
            subscribe to our newsletter, or interact with our services. We also
            collect non-personal data, such as browser type, IP address, and
            pages visited, through cookies and similar technologies to enhance
            your experience.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            How We Use Your Information
          </h2>
          <p>
            Your information is used to provide and improve our services,
            respond to inquiries, send promotional offers, and ensure the
            functionality of our website. We may also use it for analytics to
            understand user preferences and optimize our offerings, ensuring a
            personalized experience for you.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Data Security</h2>
          <p>
            We implement robust security measures, including encryption and
            secure servers, to protect your data from unauthorized access, loss,
            or misuse. However, no online transmission is entirely secure, and
            we strive to maintain the highest standards to safeguard your
            information.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            Sharing of Information
          </h2>
          <p>
            We do not sell or rent your personal information. We may share it
            with trusted third-party service providers (e.g., email marketing
            platforms) who assist us in operating our website and delivering
            services, provided they adhere to strict confidentiality agreements.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            Cookies and Tracking Technologies
          </h2>
          <p>
            Our website uses cookies to track user activity, improve navigation,
            and serve relevant content. You can manage cookie preferences
            through your browser settings, though disabling them may affect
            website functionality.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal
            information held by us. You may also opt out of marketing
            communications at any time by clicking the &quot;unsubscribe&quot;
            link in our emails or contacting us directly.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            International Data Transfer
          </h2>
          <p>
            If you are located outside India, your data may be transferred to
            and processed in India or other countries where our service
            providers operate. We ensure such transfers comply with applicable
            data protection laws, including safeguards for your privacy.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to
            fulfill the purposes outlined in this policy or as required by law.
            Once no longer needed, we securely delete or anonymize your data.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Children&apos;s Data</h2>
          <p>
            Our services are not directed at individuals under 13 years of age.
            If we learn that we have collected personal information from a child
            under 13 without parental consent, we will take steps to delete it
            promptly.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Third-Party Links</h2>
          <p>
            Our website may contain links to third-party sites. We are not
            responsible for their privacy practices or content. We encourage you
            to review the privacy policies of these sites before providing any
            personal information.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">
            Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy periodically to reflect changes in
            our practices or legal requirements. Updates will be posted on this
            page with the revised effective date, and we encourage you to review
            it regularly.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed text-white/85">
          <h2 className="text-lg font-semibold text-white">Contact Information</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our
            data practices, please contact us or visit us at our office in
            Sulthan Bathery, Wayanad, Kerala, India, or call us at{" "}
            <span className="whitespace-nowrap">+91 97470 03913</span> and{" "}
            <span className="whitespace-nowrap">+91 97470 03918</span>.
          </p>
        </section>

        <p className="pt-4 text-xs text-white/55">
          This Privacy Policy is provided for general information purposes only
          and is not legal advice. For specific legal guidance, please consult a
          qualified professional.
        </p>
      </div>
    </main>
  );
}

