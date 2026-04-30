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

export default function DmcaPage() {
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
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', marginBottom: 12 }}>DMCA Copyright Policy</h1>
          <p style={{ fontSize: 13, color: muted }}>Effective date: April 30, 2026 &nbsp;·&nbsp; Last updated: April 30, 2026</p>
          <p style={{ fontSize: 13, color: muted, marginTop: 6 }}>
            Notices: <span style={{ color: gold }}>dmca@thealtarco.app</span>
          </p>
        </div>

        <div style={{ background: `${gold}08`, border: `1px solid ${gold}18`, borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: text, lineHeight: 1.8 }}>
          The Altar respects the intellectual property rights of others and expects users to do the same. We respond to valid notices of alleged copyright infringement under the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512. This page describes how to send a notice and how counter-notices work.
        </div>

        <Section title="1. Filing a DMCA Notice">
          <P>If you believe content on The Altar infringes a copyright you own or are authorized to enforce, send a written notice to our designated agent that includes:</P>
          <UL items={[
            'A physical or electronic signature of the owner (or someone authorized to act for the owner)',
            'Identification of the copyrighted work claimed to have been infringed',
            'Identification of the material claimed to be infringing — enough detail for us to find it (URL, post id, screenshot)',
            'Your contact information — full name, mailing address, telephone number, and email',
            'A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law',
            'A statement, made under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the owner',
          ]} />
          <P>Notices missing any of the items above may be invalid under the DMCA and may be rejected.</P>
        </Section>

        <Section title="2. Designated Agent">
          <P>Send notices to our DMCA agent:</P>
          <div style={{ background: dim, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: muted, lineHeight: 1.8, marginBottom: 12 }}>
            <strong style={{ color: '#fff' }}>The Altar — DMCA Agent</strong><br />
            Email: <span style={{ color: gold }}>dmca@thealtarco.app</span><br />
            Postal address: provided on request via the email above.
          </div>
          <P>Email is the fastest path. We will acknowledge receipt of valid notices within 5 business days.</P>
        </Section>

        <Section title="3. What Happens Next">
          <P>If a notice is valid we will, in our discretion and consistent with our obligations under the DMCA, either remove or disable access to the material identified, and we will notify the user who posted it that we have done so. Repeat infringers will have their accounts terminated under our repeat-infringer policy.</P>
        </Section>

        <Section title="4. Counter-Notice">
          <P>If you believe content of yours was removed or disabled by mistake or misidentification, you may file a counter-notice with our DMCA agent. A valid counter-notice must include:</P>
          <UL items={[
            'Your physical or electronic signature',
            'Identification of the material that was removed and the location at which it appeared before removal',
            'A statement under penalty of perjury that you have a good-faith belief the material was removed by mistake or misidentification',
            'Your name, address, and telephone number',
            'A statement that you consent to the jurisdiction of the federal district court where you reside (or, if outside the US, the federal district court for any judicial district in which The Altar is located), and that you will accept service of process from the original complainant',
          ]} />
          <P>If we receive a valid counter-notice, we may restore the material in 10–14 business days unless the original complainant files a court action seeking to keep it offline.</P>
        </Section>

        <Section title="5. False Claims">
          <P>Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing — or that material was removed by mistake — may be liable for damages. Do not file a notice or counter-notice unless you are the rights holder or are authorized to act on their behalf, and you have considered fair use.</P>
        </Section>

        <Section title="6. Repeat-Infringer Policy">
          <P>It is our policy to terminate the accounts of users we determine in our reasonable discretion to be repeat infringers.</P>
        </Section>

        <Section title="7. Contact">
          <P>For DMCA-specific questions, use the email above. For general legal matters, see our <Link href="/bible/terms" style={{ color: gold, fontWeight: 700, textDecoration: 'none' }}>Terms of Service</Link>.</P>
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
