'use client';

import { useState } from 'react';
import { T, cleanMarkdown } from '../types';

interface Props {
  accentColor: string;
  selectedBibleAbbr: string;
}

interface Topic {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const TOPIC_CATEGORIES: { label: string; topics: Topic[] }[] = [
  {
    label: 'Core Beliefs',
    topics: [
      { id: 'salvation', name: 'Salvation', icon: '✝', desc: 'How to be saved, justification by faith, the work of Christ on the cross' },
      { id: 'faith', name: 'Faith & Trust', icon: '🛡', desc: 'What faith is, heroes of faith, trusting God in uncertainty' },
      { id: 'holyspirit', name: 'The Holy Spirit', icon: '🔥', desc: 'Who the Spirit is, gifts of the Spirit, being filled' },
      { id: 'identity', name: 'Identity in Christ', icon: '👤', desc: 'Who you are in God, new creation, adopted as sons and daughters' },
    ],
  },
  {
    label: 'Spiritual Growth',
    topics: [
      { id: 'prayer', name: 'Prayer', icon: '🙏', desc: 'How to pray, types of prayer, examples from Scripture' },
      { id: 'holiness', name: 'Holiness & Sanctification', icon: '✦', desc: 'Being set apart, spiritual growth, walking in the Spirit' },
      { id: 'worship', name: 'Worship', icon: '🎵', desc: 'What true worship is, worship in spirit and truth, the Psalms' },
      { id: 'wisdom', name: 'Wisdom', icon: '📖', desc: 'Godly wisdom vs worldly wisdom, decision-making, Proverbs' },
    ],
  },
  {
    label: 'Heart & Emotions',
    topics: [
      { id: 'love', name: 'Love', icon: '❤️', desc: 'God\'s love, loving others, the greatest commandment' },
      { id: 'forgiveness', name: 'Forgiveness', icon: '🕊', desc: 'God\'s forgiveness, forgiving others, freedom from guilt' },
      { id: 'anxiety', name: 'Anxiety & Peace', icon: '🌿', desc: 'Overcoming worry, casting cares, the peace of God' },
      { id: 'suffering', name: 'Suffering & Trials', icon: '🔥', desc: 'Purpose in pain, God\'s comfort, perseverance' },
    ],
  },
  {
    label: 'Life & Calling',
    topics: [
      { id: 'marriage', name: 'Marriage & Family', icon: '💍', desc: 'God\'s design for marriage, parenting, family life' },
      { id: 'money', name: 'Money & Stewardship', icon: '💰', desc: 'Generosity, tithing, contentment, trusting God with finances' },
      { id: 'leadership', name: 'Godly Leadership', icon: '👑', desc: 'Servant leadership, biblical examples, leading with integrity' },
      { id: 'endtimes', name: 'End Times & Prophecy', icon: '📜', desc: 'Revelation, Daniel, the return of Christ, signs of the times' },
    ],
  },
];

export default function TopicalGuides({ accentColor, selectedBibleAbbr }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [guide, setGuide] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGuide = async (topic: Topic) => {
    setSelectedTopic(topic);
    setGuide('');
    setLoading(true);
    try {
      const res = await fetch('/api/altar/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: `Topical Study: ${topic.name}`,
          verseText: topic.desc,
          translation: selectedBibleAbbr,
          question: `Create a comprehensive topical Bible study guide on "${topic.name}" (${topic.desc}).

Structure it as follows:

OVERVIEW
A 2-3 sentence introduction to this topic in Scripture.

KEY VERSES
List 8-10 of the most important verses on this topic. For each:
- The reference (e.g., Philippians 4:6-7)
- The verse text quoted from ${selectedBibleAbbr}
- One sentence on why this verse matters for this topic

WHAT THE BIBLE TEACHES
A flowing 3-4 paragraph explanation covering:
- What the Old Testament says about this topic
- What Jesus taught about it
- What the New Testament epistles add
- How it all connects

COMMON QUESTIONS
3-4 questions people often ask about this topic, with brief biblical answers.

PERSONAL APPLICATION
3 practical steps someone can take this week to apply what they've learned.

PRAYER
A short closing prayer related to this topic.

Do not use any markdown formatting, asterisks, or headers. Use the section labels above (OVERVIEW, KEY VERSES, etc.) as plain text labels. Keep it warm, pastoral, and deeply biblical.`,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setGuide(text);
      }
    } catch {
      setGuide('Could not load study guide. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (selectedTopic) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedTopic(null); setGuide(''); }}
          className="text-xs font-semibold" style={{ color: `${accentColor}88` }}>
          ← Back to Topics
        </button>

        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{selectedTopic.icon}</span>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{selectedTopic.name}</h2>
              <p className="text-xs" style={{ color: `${accentColor}66` }}>{selectedTopic.desc}</p>
            </div>
          </div>

          {loading && !guide && (
            <div className="flex items-center gap-3 py-8">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
              <p className="text-sm" style={{ color: 'rgba(232,240,236,0.4)' }}>Building your study guide…</p>
            </div>
          )}

          {guide && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,236,0.7)', fontFamily: 'Georgia, serif' }}>
              {cleanMarkdown(guide)}
              {loading && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: accentColor, borderRadius: 1 }} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {TOPIC_CATEGORIES.map(cat => (
        <div key={cat.label}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-6 w-1 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}44)` }} />
            <h2 className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: accentColor, fontFamily: 'Montserrat, system-ui, sans-serif' }}>{cat.label}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cat.topics.map(topic => (
              <button key={topic.id} onClick={() => loadGuide(topic)}
                className="text-left rounded-xl p-3.5 transition-all active:scale-[0.97] group relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
                <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: `${accentColor}08` }} />
                <div className="relative flex items-center gap-2.5">
                  <span className="text-lg">{topic.icon}</span>
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: 'rgba(232,240,236,0.75)' }}>{topic.name}</span>
                    <span className="text-[9px] block mt-0.5" style={{ color: 'rgba(232,240,236,0.25)' }}>{topic.desc.length > 40 ? topic.desc.slice(0, 40) + '…' : topic.desc}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
