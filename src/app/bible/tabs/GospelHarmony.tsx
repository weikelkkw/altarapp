'use client';

import { useState } from 'react';
import { BookDef, BOOKS, T } from '../types';

interface Props {
  accentColor: string;
  onNavigateToRead: (book: BookDef, chapter: number) => void;
}

// Harmony of the Gospels — parallel accounts across Matthew, Mark, Luke, John
const HARMONY_SECTIONS = [
  {
    category: 'Birth & Early Life',
    events: [
      { title: 'Genealogy of Jesus', matt: '1:1-17', mark: '', luke: '3:23-38', john: '' },
      { title: 'Birth of Jesus', matt: '1:18-25', mark: '', luke: '2:1-20', john: '' },
      { title: 'Visit of the Magi', matt: '2:1-12', mark: '', luke: '', john: '' },
      { title: 'Flight to Egypt', matt: '2:13-23', mark: '', luke: '', john: '' },
      { title: 'Boy Jesus at the Temple', matt: '', mark: '', luke: '2:41-52', john: '' },
      { title: 'The Word Became Flesh', matt: '', mark: '', luke: '', john: '1:1-18' },
    ],
  },
  {
    category: 'Beginning of Ministry',
    events: [
      { title: 'John the Baptist\'s Ministry', matt: '3:1-12', mark: '1:1-8', luke: '3:1-18', john: '1:19-28' },
      { title: 'Baptism of Jesus', matt: '3:13-17', mark: '1:9-11', luke: '3:21-22', john: '1:29-34' },
      { title: 'Temptation in the Wilderness', matt: '4:1-11', mark: '1:12-13', luke: '4:1-13', john: '' },
      { title: 'First Disciples Called', matt: '4:18-22', mark: '1:16-20', luke: '5:1-11', john: '1:35-51' },
      { title: 'Wedding at Cana', matt: '', mark: '', luke: '', john: '2:1-12' },
    ],
  },
  {
    category: 'Major Teachings',
    events: [
      { title: 'Sermon on the Mount', matt: '5-7', mark: '', luke: '6:17-49', john: '' },
      { title: 'The Lord\'s Prayer', matt: '6:9-13', mark: '', luke: '11:1-4', john: '' },
      { title: 'Parable of the Sower', matt: '13:1-23', mark: '4:1-20', luke: '8:4-15', john: '' },
      { title: 'Parable of the Prodigal Son', matt: '', mark: '', luke: '15:11-32', john: '' },
      { title: 'The Good Samaritan', matt: '', mark: '', luke: '10:25-37', john: '' },
      { title: 'The Bread of Life Discourse', matt: '', mark: '', luke: '', john: '6:22-71' },
      { title: 'The Good Shepherd', matt: '', mark: '', luke: '', john: '10:1-21' },
      { title: 'The Vine and the Branches', matt: '', mark: '', luke: '', john: '15:1-17' },
    ],
  },
  {
    category: 'Major Miracles',
    events: [
      { title: 'Feeding the 5,000', matt: '14:13-21', mark: '6:30-44', luke: '9:10-17', john: '6:1-15' },
      { title: 'Walking on Water', matt: '14:22-33', mark: '6:45-52', luke: '', john: '6:16-21' },
      { title: 'Raising of Lazarus', matt: '', mark: '', luke: '', john: '11:1-44' },
      { title: 'Healing the Blind Man', matt: '20:29-34', mark: '10:46-52', luke: '18:35-43', john: '9:1-41' },
      { title: 'Calming the Storm', matt: '8:23-27', mark: '4:35-41', luke: '8:22-25', john: '' },
      { title: 'Healing the Paralytic', matt: '9:1-8', mark: '2:1-12', luke: '5:17-26', john: '' },
      { title: 'Turning Water to Wine', matt: '', mark: '', luke: '', john: '2:1-11' },
    ],
  },
  {
    category: 'Passion Week',
    events: [
      { title: 'Triumphal Entry', matt: '21:1-11', mark: '11:1-11', luke: '19:28-44', john: '12:12-19' },
      { title: 'Cleansing the Temple', matt: '21:12-17', mark: '11:15-19', luke: '19:45-48', john: '2:13-25' },
      { title: 'The Last Supper', matt: '26:17-30', mark: '14:12-26', luke: '22:7-23', john: '13:1-30' },
      { title: 'Jesus Washes Disciples\' Feet', matt: '', mark: '', luke: '', john: '13:1-17' },
      { title: 'Garden of Gethsemane', matt: '26:36-46', mark: '14:32-42', luke: '22:39-46', john: '18:1' },
      { title: 'Arrest of Jesus', matt: '26:47-56', mark: '14:43-52', luke: '22:47-53', john: '18:2-12' },
      { title: 'Trial Before Pilate', matt: '27:11-26', mark: '15:1-15', luke: '23:1-25', john: '18:28-19:16' },
      { title: 'Crucifixion', matt: '27:27-56', mark: '15:16-41', luke: '23:26-49', john: '19:17-37' },
      { title: 'Burial', matt: '27:57-66', mark: '15:42-47', luke: '23:50-56', john: '19:38-42' },
    ],
  },
  {
    category: 'Resurrection & Beyond',
    events: [
      { title: 'Empty Tomb', matt: '28:1-10', mark: '16:1-8', luke: '24:1-12', john: '20:1-10' },
      { title: 'Road to Emmaus', matt: '', mark: '16:12-13', luke: '24:13-35', john: '' },
      { title: 'Appearance to Disciples', matt: '28:16-17', mark: '16:14', luke: '24:36-49', john: '20:19-23' },
      { title: 'Thomas Believes', matt: '', mark: '', luke: '', john: '20:24-29' },
      { title: 'Great Commission', matt: '28:18-20', mark: '16:15-18', luke: '24:46-49', john: '21:15-23' },
      { title: 'Ascension', matt: '', mark: '16:19-20', luke: '24:50-53', john: '' },
    ],
  },
];

const GOSPEL_COLORS: Record<string, string> = {
  matt: '#60a5fa',
  mark: '#f472b6',
  luke: '#4ade80',
  john: '#fb923c',
};

export default function GospelHarmony({ accentColor, onNavigateToRead }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(HARMONY_SECTIONS[0].category);

  const navigateToRef = (gospel: string, ref: string) => {
    if (!ref) return;
    const bookMap: Record<string, string> = { matt: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' };
    const bookName = bookMap[gospel];
    const book = BOOKS.find(b => b.name === bookName);
    if (!book) return;
    const chMatch = ref.match(/^(\d+)/);
    if (chMatch) onNavigateToRead(book, parseInt(chMatch[1]));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}18` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${accentColor}55` }}>Harmony of the Gospels</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,240,236,0.4)' }}>
          See the same events told across Matthew, Mark, Luke, and John. Tap any reference to read it.
        </p>
        {/* Gospel legend */}
        <div className="flex items-center gap-3 mt-3">
          {[
            { key: 'matt', label: 'Matthew' },
            { key: 'mark', label: 'Mark' },
            { key: 'luke', label: 'Luke' },
            { key: 'john', label: 'John' },
          ].map(g => (
            <div key={g.key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: GOSPEL_COLORS[g.key] }} />
              <span className="text-[10px] font-semibold" style={{ color: GOSPEL_COLORS[g.key] }}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      {HARMONY_SECTIONS.map(section => (
        <div key={section.category} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accentColor}12` }}>
          <button onClick={() => setExpandedCategory(expandedCategory === section.category ? null : section.category)}
            className="w-full text-left px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: expandedCategory === section.category ? `1px solid ${accentColor}10` : 'none' }}>
            <span className="text-xs font-bold" style={{ color: 'rgba(232,240,236,0.7)' }}>{section.category}</span>
            <span className="text-xs" style={{ color: `${accentColor}55` }}>
              {expandedCategory === section.category ? '▲' : '▼'} {section.events.length}
            </span>
          </button>

          {expandedCategory === section.category && (
            <div className="px-3 py-2">
              {section.events.map((event, i) => (
                <div key={i} className="py-2.5" style={{ borderTop: i > 0 ? `1px solid ${accentColor}08` : 'none' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#f0f8f4' }}>{event.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['matt', 'mark', 'luke', 'john'] as const).map(gospel => {
                      const ref = event[gospel];
                      if (!ref) return (
                        <span key={gospel} className="px-2 py-0.5 rounded text-[10px]"
                          style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(232,240,236,0.15)' }}>—</span>
                      );
                      return (
                        <button key={gospel} onClick={() => navigateToRef(gospel, ref)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold transition-all"
                          style={{ background: `${GOSPEL_COLORS[gospel]}18`, color: GOSPEL_COLORS[gospel], border: `1px solid ${GOSPEL_COLORS[gospel]}30` }}>
                          {ref}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
