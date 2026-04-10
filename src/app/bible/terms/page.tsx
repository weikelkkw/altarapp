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

export default function TermsPage() {
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
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12 }}>Terms of Service</h1>
          <p style={{ fontSize: 13, color: muted }}>Effective date: April 10, 2026 &nbsp;·&nbsp; Last updated: April 10, 2026</p>
          <p style={{ fontSize: 13, color: muted, marginTop: 6 }}>
            Questions? Contact us at <span style={{ color: gold }}>legal@thealtarco.app</span>
          </p>
        </div>

        {/* Intro */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}18`, borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: text, lineHeight: 1.8 }}>
          Welcome to The Altar. By creating an account or using this platform, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, do not use The Altar.
        </div>

        <Section title="1. Acceptance of Terms">
          <P>These Terms of Service ("Terms") form a legally binding agreement between you and The Altar ("we," "us," or "our"). By accessing or using the app — whether on web, iOS, or Android — you agree to these Terms and our <Link href="/bible/privacy" style={{ color: gold, textDecoration: 'none', fontWeight: 700 }}>Privacy Policy</Link>.</P>
          <P>We may update these Terms from time to time. We will notify you of significant changes through the app. Continued use after changes take effect means you accept the updated Terms.</P>
        </Section>

        <Section title="2. Eligibility">
          <P>You must be at least 13 years of age to use The Altar. By creating an account, you confirm that you meet this requirement.</P>
          <P>If you are between 13 and 18, you confirm that you have your parent or guardian's permission to use the app and that they have reviewed and agreed to these Terms on your behalf.</P>
        </Section>

        <Section title="3. Your Account">
          <P>You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with others. You are responsible for all activity that occurs under your account.</P>
          <P>You agree to provide accurate and truthful information when registering and to keep your information up to date.</P>
          <P>We reserve the right to suspend or terminate accounts that violate these Terms, without notice.</P>
        </Section>

        <Section title="4. Acceptable Use">
          <P>The Altar is a Christian faith community. You agree to use it respectfully and in good faith. You may:</P>
          <UL([
            'Share prayer requests, testimonies, and faith reflections',
            'Engage with other members in a spirit of grace and encouragement',
            'Use Bible study tools, reading plans, and personal journaling features',
            'Participate in or create Kingdom Groups',
          ] as string[])} />
          <P>You may <strong style={{ color: '#fff' }}>not</strong>:</P>
          <UL([
            'Post content that is hateful, abusive, harassing, or threatening',
            'Post sexually explicit, violent, or graphic content',
            'Promote or glorify harmful behavior, self-harm, or substance abuse',
            'Attack, demean, or mock other members, their faith, or their denomination',
            'Spam, advertise products or services, or solicit other users',
            'Impersonate another person or falsely claim affiliation with any organization',
            'Attempt to access, tamper with, or disrupt the platform\'s systems',
            'Share another user\'s private messages or personal information without consent',
            'Post content that infringes on any third party\'s intellectual property rights',
            'Use the platform for any illegal purpose',
          ] as string[])} />
        </Section>

        <Section title="5. Community Standards">
          <P>The Altar is built on the belief that all Christians — across every denomination, background, and tradition — deserve a place to seek God together. We ask that all members:</P>
          <UL([
            'Speak with grace, even in theological disagreement',
            'Respect that others may worship and interpret Scripture differently',
            'Pray for one another genuinely and without condition',
            'Treat this space as you would a house of God',
          ] as string[])} />
          <P>We reserve the right to remove any content, without explanation, that we determine violates the spirit of this community — even if not explicitly listed above.</P>
        </Section>

        <Section title="6. Content You Post">
          <P><strong style={{ color: '#fff' }}>Your ownership.</strong> You retain ownership of the content you create — your prayers, notes, posts, and testimonies are yours.</P>
          <P><strong style={{ color: '#fff' }}>License to us.</strong> By posting content on The Altar, you grant us a non-exclusive, royalty-free, worldwide license to display, store, and distribute that content within the platform, solely for the purpose of operating and improving the service. We will never sell your content or use it in advertising.</P>
          <P><strong style={{ color: '#fff' }}>Responsibility.</strong> You are solely responsible for the content you post. We are not liable for any content posted by users.</P>
          <P><strong style={{ color: '#fff' }}>Removal.</strong> We may remove any content that violates these Terms or our community standards, at our sole discretion.</P>
        </Section>

        <Section title="7. AI-Powered Features">
          <P>The Altar uses AI models (including Claude by Anthropic) to power Bible study tools, devotionals, and study assistance. These are tools to supplement — not replace — your personal relationship with God, your pastor, or your church community.</P>
          <P>AI responses may occasionally be inaccurate or incomplete. Always test AI-generated content against Scripture itself. We are not responsible for decisions made based on AI-generated content.</P>
        </Section>

        <Section title="8. Intellectual Property">
          <P>All design, branding, original written content, and code that makes up The Altar is owned by us and protected by copyright. You may not copy, reproduce, or distribute any part of the platform without our written permission.</P>
          <P>Scripture quotations and biblical text are sourced from publicly available translations and are used for educational and devotional purposes.</P>
        </Section>

        <Section title="9. Termination">
          <P>You may delete your account at any time from the Settings tab. Upon deletion, your personal data will be removed within 30 days.</P>
          <P>We may suspend or terminate your access at any time, with or without notice, if we determine that you have violated these Terms. If we terminate your account in error, please contact us at <span style={{ color: gold }}>legal@thealtarco.app</span>.</P>
        </Section>

        <Section title="10. Disclaimers">
          <P>The Altar is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or completely secure.</P>
          <P>We are a spiritual community platform — we are not a licensed counseling service, church, or mental health provider. If you are in crisis, please contact a qualified professional or call 988 (Suicide & Crisis Lifeline).</P>
        </Section>

        <Section title="11. Limitation of Liability">
          <P>To the maximum extent permitted by law, The Altar and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of — or inability to use — the platform, even if we have been advised of the possibility of such damages.</P>
          <P>Our total liability to you for any claim arising from these Terms or your use of the service shall not exceed the amount you paid us in the 12 months preceding the claim (which, if you use the free version, is $0).</P>
        </Section>

        <Section title="12. Governing Law">
          <P>These Terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of the applicable jurisdiction, and you consent to personal jurisdiction in those courts.</P>
        </Section>

        <Section title="13. Contact">
          <P>If you have questions about these Terms, want to report a violation, or need to reach us for any legal matter:</P>
          <div style={{ background: dim, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: muted, lineHeight: 1.8 }}>
            <strong style={{ color: '#fff' }}>The Altar</strong><br />
            Email: <span style={{ color: gold }}>legal@thealtarco.app</span>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${dim}`, paddingTop: 32, textAlign: 'center' }}>
          <Link href="/bible/privacy" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Privacy Policy →</Link>
          <Link href="/bible/auth" style={{ fontSize: 12, color: muted, textDecoration: 'none', fontWeight: 600 }}>Return to The Altar</Link>
        </div>
      </div>
    </div>
  );
}
