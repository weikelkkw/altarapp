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
          <p style={{ fontSize: 13, color: muted }}>Effective date: April 10, 2026 &nbsp;·&nbsp; Last updated: April 10, 2026</p>
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
          <UL([
            'Community posts (prayer requests, testimonies)',
            'Comments and prayer engagements on other posts',
            'Personal prayer journal entries',
            'Verse highlights and reading notes',
            'Group messages and direct messages',
            'Devotional and encounter entries',
          ] as string[])} />
          <P><strong style={{ color: '#fff' }}>Usage Data.</strong> We may collect basic usage information such as which features you use and your reading streaks, to improve the app experience.</P>
          <P><strong style={{ color: '#fff' }}>Device & Technical Data.</strong> We may collect your device type, browser, and IP address for security and error-diagnosis purposes.</P>
        </Section>

        <Section title="2. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <UL([
            'Create and manage your account',
            'Provide, operate, and improve The Altar',
            'Show your content to other community members (for public posts)',
            'Enable community features like prayer walls, groups, and direct messages',
            'Power AI-assisted Bible study features (Claude by Anthropic)',
            'Provide text-to-speech narration (ElevenLabs)',
            'Respond to your questions or support requests',
            'Send security alerts, such as password resets',
            'Ensure a safe, respectful community environment',
          ] as string[])} />
          <P>We do <strong style={{ color: '#fff' }}>not</strong> sell your personal information. We do not use your data for advertising.</P>
        </Section>

        <Section title="3. Third-Party Services">
          <P>The Altar uses the following third-party services to operate. Each has their own privacy policy:</P>
          <UL([
            'Supabase — database, authentication, and real-time features (supabase.com/privacy)',
            'Anthropic (Claude) — AI-powered study tools; your study queries may be processed by Claude (anthropic.com/privacy)',
            'ElevenLabs — text-to-speech audio for Scripture narration (elevenlabs.io/privacy)',
            'Mapbox — Bible geography maps (mapbox.com/legal/privacy)',
            'Spotify — optional worship music integration, used only if you connect it (spotify.com/privacy)',
          ] as string[])} />
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
          <UL([
            'Access — request a copy of the data we hold about you',
            'Correction — ask us to correct inaccurate information',
            'Deletion — request that we delete your account and personal data',
            'Portability — request your data in a portable format',
            'Opt-out — you may stop using the app and request account deletion at any time',
          ] as string[])} />
          <P>To exercise any of these rights, contact us at <span style={{ color: gold }}>privacy@thealtarco.app</span>. We will respond within 30 days.</P>
          <P>You can delete your account and data directly from the Settings tab inside the app.</P>
        </Section>

        <Section title="8. Cookies & Local Storage">
          <P>The Altar uses browser local storage (not traditional cookies) to remember your preferences — such as your chosen theme, font size, Bible translation, and reading settings. This data lives only on your device and is never sent to our servers.</P>
          <P>Authentication sessions are managed through Supabase's secure session tokens.</P>
        </Section>

        <Section title="9. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top. If changes are material, we will notify you through the app. Continued use of The Altar after changes take effect constitutes your acceptance of the updated policy.</P>
        </Section>

        <Section title="10. Contact Us">
          <P>If you have any questions, concerns, or requests related to this Privacy Policy, please reach out:</P>
          <div style={{ background: dim, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: muted, lineHeight: 1.8 }}>
            <strong style={{ color: '#fff' }}>The Altar</strong><br />
            Email: <span style={{ color: gold }}>privacy@thealtarco.app</span>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${dim}`, paddingTop: 32, textAlign: 'center' }}>
          <Link href="/bible/terms" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Terms of Service →</Link>
          <Link href="/bible/auth" style={{ fontSize: 12, color: muted, textDecoration: 'none', fontWeight: 600 }}>Return to The Altar</Link>
        </div>
      </div>
    </div>
  );
}
