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

export default function AccessibilityPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Montserrat', system-ui, sans-serif", color: text }}>
      <div style={{ borderBottom: `1px solid ${gold}18`, padding: '20px 24px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="10" height="15" viewBox="0 0 10 15" fill="none" style={{ filter: `drop-shadow(0 0 4px ${gold}66)` }}>
              <rect x="3.5" y="0" width="3" height="15" rx="0.75" fill={gold} />
              <rect x="0" y="3.5" width="10" height="3" rx="0.75" fill={gold} />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: gold }}>The Altar</span>
          </div>
          <Link href="/bible/auth" style={{ fontSize: 11, color: muted, textDecoration: 'none', fontWeight: 600, letterSpacing: '0.08em' }}>← Back</Link>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${dim}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>Legal</p>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12 }}>Accessibility Statement</h1>
          <p style={{ fontSize: 13, color: muted }}>Effective date: April 30, 2026 &nbsp;·&nbsp; Last updated: April 30, 2026</p>
          <p style={{ fontSize: 13, color: muted, marginTop: 6 }}>
            Accessibility issues? Email <span style={{ color: gold }}>accessibility@thealtarco.app</span>
          </p>
        </div>

        <div style={{ background: `${gold}08`, border: `1px solid ${gold}18`, borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: text, lineHeight: 1.8 }}>
          The Altar is committed to making Scripture and Christian community accessible to everyone, including people who use assistive technology. This statement explains the standards we target, what is in place today, where we still have work to do, and how to reach us if something is in your way.
        </div>

        <Section title="1. Conformance Target">
          <P>The Altar targets <strong style={{ color: '#fff' }}>WCAG 2.1 Level AA</strong> as the conformance baseline, and we test against newer guidance (WCAG 2.2) where it does not contradict 2.1. We design for full functionality with keyboard-only navigation and screen-reader use, and we test the Bible reading experience, the prayer wall, and the Settings panel as our primary critical paths.</P>
        </Section>

        <Section title="2. What We Have Done">
          <UL items={[
            'Color contrast tuned for the gold-on-black brand to meet AA contrast ratios on body text and primary actions',
            'Adjustable font size in Settings → Appearance (small / medium / large / extra-large)',
            'Keyboard navigation for all primary flows — sign in, reading, prayer wall, settings',
            'Semantic structure for Scripture (chapter and verse landmarks) so screen readers can navigate by reference',
            'Form fields labeled programmatically with descriptive placeholders and visible focus states',
            'iOS safe-area-inset support so iPhone users with home-indicator gestures can reach every control',
            'Reduced-motion respect in animations where applicable',
          ]} />
        </Section>

        <Section title="3. Known Gaps">
          <P>We list the things we know are not yet meeting AA so you do not have to discover them yourself:</P>
          <UL items={[
            'Some decorative animations on the auth and home screens may not yet honor the prefers-reduced-motion media query end-to-end',
            'Bible map markers and Spotify playback controls (third-party SDKs) inherit the third-party widget accessibility, which we have not independently audited',
            'Voice picker rows in Settings show a play preview button — its label could be clearer for screen readers',
            'Color cues for friend-request status in Community are paired with text labels but the icon-only states would benefit from explicit aria-labels',
          ]} />
          <P>Each of these is on our remediation list. We update this statement as items are closed.</P>
        </Section>

        <Section title="4. Compatibility">
          <P>The Altar is tested in current versions of Safari (macOS / iOS), Chrome (macOS / Windows / Android), and Firefox. Screen-reader spot-checks are run with VoiceOver on iOS and Safari/macOS. We do not officially support Internet Explorer.</P>
        </Section>

        <Section title="5. Reporting an Accessibility Barrier">
          <P>If something stops you from using The Altar, please tell us — even if you are not sure whether it counts as an accessibility issue.</P>
          <UL items={[
            'Email accessibility@thealtarco.app',
            'Describe what you tried to do, what happened, and what device / assistive technology you were using',
            'We aim to respond within 5 business days and to resolve confirmed barriers within 30 days',
          ]} />
        </Section>

        <Section title="6. Legal Basis and Scope">
          <P>This statement reflects our commitments under the Americans with Disabilities Act (ADA), Section 508 of the Rehabilitation Act, and the European Accessibility Act (EAA) for any users in the EU. It is not a representation of full conformance — that is what we are working toward.</P>
        </Section>

        <Section title="7. Contact">
          <P>For accessibility questions, requests for an accessible alternative, or to report a barrier:</P>
          <div style={{ background: dim, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: muted, lineHeight: 1.8 }}>
            <strong style={{ color: '#fff' }}>The Altar — Accessibility</strong><br />
            Email: <span style={{ color: gold }}>accessibility@thealtarco.app</span>
          </div>
        </Section>

        <div style={{ borderTop: `1px solid ${dim}`, paddingTop: 32, textAlign: 'center' }}>
          <Link href="/bible/privacy" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Privacy Policy →</Link>
          <Link href="/bible/terms" style={{ fontSize: 12, color: gold, textDecoration: 'none', fontWeight: 700, marginRight: 24 }}>Terms →</Link>
          <Link href="/bible/auth" style={{ fontSize: 12, color: muted, textDecoration: 'none', fontWeight: 600 }}>Return to The Altar</Link>
        </div>
      </div>
    </div>
  );
}
