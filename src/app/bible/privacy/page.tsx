'use client';

import Link from 'next/link';

const gold = '#c9a84c';
const muted = 'rgba(255,255,255,0.5)';
const text  = 'rgba(255,255,255,0.82)';
const dim   = 'rgba(255,255,255,0.06)';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${gold}22` }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: text, lineHeight: 1.85 }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ color: text, lineHeight: 1.7 }}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Montserrat', system-ui, sans-serif", color: text }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${gold}18`, padding: '20px 24px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="10" height="15" viewBox="0 0 10 15" fill="none" style={{ filter: `drop-shadow(0 0 4px ${gold}66)` }}>
              <rect x="3.5" y="0" width="3" height="15" rx="0.75" fill={gold} />
              <rect x="0" y="3.5" width="10" height="3" rx="0.75" fill={gold} />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: gold }}>The Altar</span>
          </div>
          <Link href="/bible/auth" style={{ fontSize: 11, color: muted, textDecoration: 'none', fontWeight: 600, letterSpacing: '0.08em' }}>
            ← Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Title */}
        <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${dim}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>Legal</p>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: muted }}>Effective date: April 30, 2026 &nbsp;·&nbsp; Last updated: April 30, 2026 &nbsp;·&nbsp; Version 2026-04-30</p>
          <p style={{ fontSize: 13, color: muted, marginTop: 6 }}>
            Questions? Contact us at <span style={{ color: gold }}>privacy@thealtarco.app</span>
          </p>
        </div>

        {/* Intro */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}18`, borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: text, lineHeight: 1.8 }}>
          The Altar ("we," "us," or "our") is a Christian Bible study and community platform. We take your privacy seriously. This Privacy Policy explains what information we collect, how we use it, who we share it with, and the rights you have over your data. By using The Altar, you agree to the practices described here.
        </div>

        <Section title="1. Information We Collect">
          <P><strong style={{ color: '#fff' }}>Account Information.</strong> When you create an account, we collect your email address, display name, and a password (stored securely — we never see it in plain text).</P>
          <P><strong style={{ color: '#fff' }}>Profile Information.</strong> You may optionally provide additional details including your experience level, church, denomination, bio, favorite verse, spiritual gifts, and other profile fields. All of this is voluntary.</P>
          <P><strong style={{ color: '#fff' }}>Content You Create.</strong> We store content you submit to the platform, including:</P>
          <UL items={[
            'Community posts (prayer requests, testimonies)',
            'Comments and prayer engagements on other posts',
            'Personal prayer journal entries',
            'Verse highlights and reading notes',
            'Group messages and direct messages',
            'Devotional and encounter entries',
          ]} />
          <P><strong style={{ color: '#fff' }}>Usage Data.</strong> We may collect basic usage information such as which features you use and your reading streaks, to improve the app experience.</P>
          <P><strong style={{ color: '#fff' }}>Device & Technical Data.</strong> We may collect your device type, browser, and IP address for security and error-diagnosis purposes.</P>
        </Section>

        <Section title="2. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <UL items={[
            'Create and manage your account',
            'Provide, operate, and improve The Altar',
            'Show your content to other community members (for public posts)',
            'Enable community features like prayer walls, groups, and direct messages',
            'Power AI-assisted Bible study features (Claude by Anthropic)',
            'Provide text-to-speech narration (ElevenLabs)',
            'Respond to your questions or support requests',
            'Send security alerts, such as password resets',
            'Ensure a safe, respectful community environment',
          ]} />
          <P>We do <strong style={{ color: '#fff' }}>not</strong> sell or share your personal information for advertising. We do not use your data to train third-party AI models. We do not run ad-tech, analytics, or marketing trackers.</P>
        </Section>

        <Section title="2a. Legal Basis for Processing (GDPR / UK GDPR)">
          <P>For users in the European Economic Area, the United Kingdom, or Switzerland, we rely on the following legal bases under Article 6 of the GDPR:</P>
          <UL items={[
            'Contract — to create and operate your account, deliver community features, and provide support (Art. 6(1)(b))',
            'Legitimate interests — to keep the service secure, prevent abuse, and improve The Altar, balanced against your rights (Art. 6(1)(f))',
            'Consent — for any optional features you choose to enable, such as connecting Spotify; you may withdraw consent at any time (Art. 6(1)(a))',
            'Legal obligation — to comply with applicable law, respond to lawful requests, and meet record-keeping requirements (Art. 6(1)(c))',
          ]} />
          <P>We do not engage in automated decision-making with legal or similarly significant effects. AI-assisted study tools generate text in response to your queries, but do not make decisions about you.</P>
        </Section>

        <Section title="3. Third-Party Services">
          <P>The Altar uses the following third-party services to operate. Each has their own privacy policy:</P>
          <UL items={[
            'Supabase — database, authentication, and real-time features (supabase.com/privacy)',
            'Anthropic (Claude) — AI-powered study tools; your study queries may be processed by Claude (anthropic.com/privacy)',
            'ElevenLabs — text-to-speech audio for Scripture narration (elevenlabs.io/privacy)',
            'Mapbox — Bible geography maps (mapbox.com/legal/privacy)',
            'Spotify — optional worship music integration, used only if you connect it (spotify.com/privacy)',
          ]} />
          <P>We share only the minimum information necessary with these providers to deliver the features you use.</P>
        </Section>

        <Section title="4. Data Storage & Security">
          <P>Your data is stored securely through Supabase, which is hosted on AWS infrastructure. All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text.</P>
          <P>Row-level security policies ensure that your private data — including personal prayers, notes, and highlights — can only be accessed by your own account. We cannot read your personal journal entries.</P>
          <P>While we take reasonable security measures, no system is 100% secure. We encourage you to use a strong, unique password.</P>
        </Section>

        <Section title="5. Data Retention">
          <P>We retain your account data for as long as your account is active. If you delete your account, your personal data is permanently deleted from our systems within 30 days, except where we are required by law to retain it.</P>
          <P>Community posts or comments you have made may remain visible to others after account deletion unless you delete them first.</P>
        </Section>

        <Section title="6. Children's Privacy">
          <P>The Altar is intended for users 13 years of age and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has created an account, please contact us at <span style={{ color: gold }}>privacy@thealtarco.app</span> and we will promptly delete the account and associated data.</P>
        </Section>

        <Section title="7. Your Rights">
          <P>Depending on your location, you may have the following rights regarding your data:</P>
          <UL items={[
            'Access — download a complete copy of your data from Settings → Account → Export My Data',
            'Correction — edit your profile, posts, prayers, and notes inside the app at any time',
            'Deletion — delete your account and personal data from Settings → Account → Delete My Account',
            'Portability — your export is delivered as machine-readable JSON suitable for transfer to another service',
            'Object / Restrict — write to us at privacy@thealtarco.app to object to or restrict any specific processing',
            'Withdraw consent — disconnect optional integrations (e.g., Spotify) at any time from Settings',
            'Opt-out of sale or sharing — we do not sell or share your personal information for advertising; there is nothing to opt out of',
            'Lodge a complaint — EU/UK residents may complain to their local data-protection authority',
          ]} />
          <P>To exercise any of these rights by email, contact <span style={{ color: gold }}>privacy@thealtarco.app</span>. We will respond within 30 days (or the shorter period required by your local law).</P>
          <P>For California residents under the CCPA/CPRA: you have the right to know, the right to delete, the right to correct, and the right to limit use of sensitive personal information. We do not sell or share personal information as those terms are defined under California law.</P>
        </Section>

        <Section title="8. Cookies & Local Storage">
          <P>The Altar does not use third-party advertising, analytics, or marketing cookies. We do not run Google Analytics, Meta Pixel, or any cross-site tracking technology.</P>
          <P>We use:</P>
          <UL items={[
            'Strictly-necessary first-party session cookies issued by Supabase to keep you signed in (HttpOnly, Secure, SameSite=Lax)',
            'Browser local storage on your device for preferences such as theme, font size, default Bible translation, and reading settings — this data never leaves your device',
          ]} />
          <P>Because we set only strictly-necessary cookies and no advertising or analytics trackers, no cookie-consent banner is required under GDPR ePrivacy or CCPA. If we ever add optional cookies in the future, we will request your consent first.</P>
        </Section>

        <Section title="9. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top. If changes are material, we will notify you through the app. Continued use of The Altar after changes take effect constitutes your acceptance of the updated policy.</P>
        </Section>

        <Section title="10. International Transfers">
          <P>The Altar is operated from the United States, and Supabase hosts our database on AWS infrastructure. If you are outside the US, your information will be transferred to and processed in the United States. For transfers from the EU/UK, our processors (Supabase, Anthropic, ElevenLabs, Mapbox, Spotify) operate under Standard Contractual Clauses or equivalent transfer mechanisms.</P>
        </Section>

        <Section title="11. Data Controller">
          <P>The Altar is operated as a project of its founder. For privacy and data-protection inquiries, write to <span style={{ color: gold }}>privacy@thealtarco.app</span>. We are working on appointing a designated EU representative; until then, EU/UK residents may also contact their local data-protection authority directly.</P>
        </Section>

        <Section title="12. Contact Us">
          <P>If you have any questions, concerns, or requests related to this Privacy Policy, please reach out:</P>
          <div style={{ background: dim, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: muted, lineHeight: 1.8 }}>
            <strong style={{ color: '#fff' }}>The Altar</strong><br />
            Privacy: <span style={{ color: gold }}>privacy@thealtarco.app</span><br />
            Accessibility: <span style={{ color: gold }}>accessibility@thealtarco.app</span><br />
            Copyright (DMCA): <span style={{ color: gold }}>dmca@thealtarco.app</span>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${dim}`, paddingTop: 32, textAlign: 'center' }}>
          <Link href="/bible/terms" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Terms →</Link>
          <Link href="/bible/dmca" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>DMCA →</Link>
          <Link href="/bible/accessibility" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Accessibility →</Link>
          <Link href="/bible/auth" style={{ fontSize: 12, color: muted, textDecoration: 'none', fontWeight: 600 }}>Return to The Altar</Link>
        </div>
      </div>
    </div>
  );
}
