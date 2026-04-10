'use client';

import { useState } from 'react';
import { T } from '../types';

interface Props {
  accentColor: string;
}

interface NameEntry {
  hebrew: string;
  english: string;
  meaning: string;
  ref: string;
  category: string;
}

const NAMES: NameEntry[] = [
  { hebrew: 'Elohim', english: 'God / Creator', meaning: 'The all-powerful Creator. Used 2,600+ times. Emphasizes God\'s sovereignty and creative power.', ref: 'Genesis 1:1', category: 'Power' },
  { hebrew: 'Yahweh (YHWH)', english: 'LORD / I AM', meaning: 'The self-existent, eternal, covenant-keeping God. The most sacred name, revealed to Moses at the burning bush.', ref: 'Exodus 3:14', category: 'Covenant' },
  { hebrew: 'Adonai', english: 'Lord / Master', meaning: 'Acknowledges God as sovereign ruler and master over all. Often used in place of YHWH out of reverence.', ref: 'Psalm 8:1', category: 'Authority' },
  { hebrew: 'El Shaddai', english: 'God Almighty', meaning: 'The all-sufficient God who provides and sustains. Revealed to Abraham as the God of the impossible promise.', ref: 'Genesis 17:1', category: 'Provision' },
  { hebrew: 'El Elyon', english: 'God Most High', meaning: 'The supreme God above all other powers. Emphasizes His position above everything in heaven and earth.', ref: 'Genesis 14:18-20', category: 'Power' },
  { hebrew: 'El Roi', english: 'God Who Sees', meaning: 'The God who sees the oppressed, the forgotten, the suffering. Named by Hagar in the wilderness.', ref: 'Genesis 16:13', category: 'Comfort' },
  { hebrew: 'Yahweh Yireh', english: 'The LORD Will Provide', meaning: 'God as provider. Named by Abraham on Mount Moriah after God provided the ram in place of Isaac.', ref: 'Genesis 22:14', category: 'Provision' },
  { hebrew: 'Yahweh Rapha', english: 'The LORD Who Heals', meaning: 'God as healer of body, mind, and spirit. Declared after the bitter waters of Marah were made sweet.', ref: 'Exodus 15:26', category: 'Healing' },
  { hebrew: 'Yahweh Nissi', english: 'The LORD Our Banner', meaning: 'God as our victory and rallying point in battle. Named after Israel defeated the Amalekites.', ref: 'Exodus 17:15', category: 'Protection' },
  { hebrew: 'Yahweh Shalom', english: 'The LORD Is Peace', meaning: 'God as the source of wholeness and peace. Named by Gideon after encountering the Angel of the Lord.', ref: 'Judges 6:24', category: 'Peace' },
  { hebrew: 'Yahweh Tsidkenu', english: 'The LORD Our Righteousness', meaning: 'God as the one who makes us righteous. A prophetic name for the coming Messiah.', ref: 'Jeremiah 23:6', category: 'Covenant' },
  { hebrew: 'Yahweh Rohi', english: 'The LORD My Shepherd', meaning: 'God as the caring, guiding, protecting shepherd. The most intimate of the compound names.', ref: 'Psalm 23:1', category: 'Comfort' },
  { hebrew: 'Yahweh Shammah', english: 'The LORD Is There', meaning: 'God\'s promise of eternal presence. The name of the restored city in Ezekiel\'s vision — He will never leave.', ref: 'Ezekiel 48:35', category: 'Presence' },
  { hebrew: 'Yahweh Sabaoth', english: 'LORD of Hosts / Armies', meaning: 'Commander of heavenly armies. Used 285 times. Emphasizes God\'s power over all spiritual and earthly forces.', ref: '1 Samuel 1:3', category: 'Power' },
  { hebrew: 'El Olam', english: 'The Everlasting God', meaning: 'The eternal, unchanging God. He exists beyond time, without beginning or end.', ref: 'Genesis 21:33', category: 'Eternal' },
  { hebrew: 'Abba', english: 'Father / Daddy', meaning: 'The intimate, personal name for God as Father. Used by Jesus in Gethsemane and given to believers through the Spirit.', ref: 'Romans 8:15', category: 'Intimacy' },
];

const CATEGORIES = ['All', ...Array.from(new Set(NAMES.map(n => n.category)))];

export default function NamesOfGod({ accentColor }: Props) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const { cream } = T;

  const filtered = activeCategory === 'All'
    ? NAMES
    : NAMES.filter(n => n.category === activeCategory);

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: cream, marginBottom: 4 }}>
          Names of God
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          The Hebrew names reveal who He is
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24,
        justifyContent: 'center',
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${isActive ? accentColor : 'rgba(255,255,255,0.1)'}`,
                background: isActive ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                color: isActive ? accentColor : 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Name cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(name => {
          const isExpanded = expandedName === name.hebrew;
          return (
            <div
              key={name.hebrew}
              onClick={() => setExpandedName(isExpanded ? null : name.hebrew)}
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                background: isExpanded
                  ? `${accentColor}0a`
                  : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isExpanded ? `${accentColor}30` : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Hebrew name — large and prominent */}
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: isExpanded ? accentColor : cream,
                letterSpacing: 0.5,
                marginBottom: 4,
                transition: 'color 0.2s',
              }}>
                {name.hebrew}
              </div>

              {/* English translation */}
              <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: isExpanded ? 14 : 0,
              }}>
                {name.english}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  animation: 'fadeSlideIn 0.25s ease',
                }}>
                  {/* Meaning */}
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 14,
                  }}>
                    {name.meaning}
                  </div>

                  {/* Reference + Category */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: `${accentColor}15`,
                      border: `1px solid ${accentColor}25`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: accentColor,
                    }}>
                      {name.ref}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                      {name.category}
                    </span>
                  </div>
                </div>
              )}

              {/* Collapsed: show reference inline */}
              {!isExpanded && (
                <div style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {name.ref}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Count */}
      <div style={{
        textAlign: 'center', marginTop: 24, paddingBottom: 20,
        fontSize: 12, color: 'rgba(255,255,255,0.2)',
      }}>
        {filtered.length} of {NAMES.length} names
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
