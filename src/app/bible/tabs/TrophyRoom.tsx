'use client';

import { useState, useEffect } from 'react';

interface Props {
  accentColor: string;
  highlighted: Set<string>;
  notes: Record<string, string>;
}

interface Trophy {
  id: string;
  badge: string;
  label: string;
  desc: string;
  check: boolean;
}

interface Level {
  level: number;
  trophies: Trophy[];
}

interface Category {
  name: string;
  icon: string;
  levels: Level[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#94a3b8',
  2: '#60a5fa',
  3: '#a855f7',
  4: '#fb923c',
  5: '#fbbf24',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
};

export default function TrophyRoom({ accentColor, highlighted, notes }: Props) {
  const [selectedTrophy, setSelectedTrophy] = useState<(Trophy & { cat: string; level: number }) | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  // Compute all stats
  const [stats, setStats] = useState({ streak: 0, fireSessions: 0, gospelDone: false, devotionals: 0 });

  useEffect(() => {
    try {
      const streakData = localStorage.getItem('trace-streak');
      const streak = streakData ? JSON.parse(streakData).count || 0 : 0;
      const fireSessions = JSON.parse(localStorage.getItem('trace-fire-sessions') || '[]').length;
      const gospelDone = localStorage.getItem('trace-gospel-completed') === 'true';
      const devotionals = parseInt(localStorage.getItem('trace-devotional-count') || '0');
      setStats({ streak, fireSessions, gospelDone, devotionals });
    } catch {}
  }, []);

  const highlightCount = highlighted.size;
  const noteCount = Object.values(notes).filter(n => n?.trim()).length;
  const chaptersWithNotes = Object.keys(notes).filter(k => notes[k]?.trim()).length;
  const chaptersHighlighted = new Set([...highlighted].map(k => { const p = k.split('-'); return `${p[0]}-${p[1]}`; })).size;
  const chaptersStudied = Math.max(chaptersWithNotes, chaptersHighlighted);
  const totalPrayers = (() => { try { return JSON.parse(localStorage.getItem('trace-prayers') || '[]').length; } catch { return 0; } })();
  const answeredCount = (() => { try { return JSON.parse(localStorage.getItem('trace-prayers') || '[]').filter((p: any) => p.status === 'answered' || p.answered).length; } catch { return 0; } })();

  const categories: Category[] = [
    {
      name: 'Foundation',
      icon: '⛪',
      levels: [
        { level: 1, trophies: [
          { id: 'gospel', badge: '✝', label: 'The Foundation', desc: 'You heard the Gospel and responded. Everything starts here.', check: stats.gospelDone },
          { id: 'devotional-1', badge: '📖', label: 'First Devotional', desc: 'You completed your first daily devotional. A seed has been planted.', check: stats.devotionals >= 1 },
        ]},
        { level: 2, trophies: [
          { id: 'devotional-7', badge: '📚', label: 'Week of the Word', desc: '7 devotionals completed. You are building a daily rhythm with God.', check: stats.devotionals >= 7 },
          { id: 'encounter-1', badge: '☀️', label: 'First Encounter', desc: 'Your first Daily Encounter. A moment alone with God.', check: stats.fireSessions >= 1 },
        ]},
        { level: 3, trophies: [
          { id: 'devotional-30', badge: '🏆', label: 'Devoted Reader', desc: '30 devotionals. The Word is becoming part of who you are.', check: stats.devotionals >= 30 },
          { id: 'encounter-7', badge: '🌅', label: 'Devoted', desc: '7 Daily Encounters. You are seeking Him consistently.', check: stats.fireSessions >= 7 },
        ]},
        { level: 4, trophies: [
          { id: 'devotional-100', badge: '👑', label: 'Word Made Flesh', desc: '100 devotionals. You live and breathe Scripture.', check: stats.devotionals >= 100 },
          { id: 'encounter-21', badge: '⚡', label: 'Habit Formed', desc: '21 encounters. This is part of who you are now.', check: stats.fireSessions >= 21 },
        ]},
        { level: 5, trophies: [
          { id: 'devotional-365', badge: '🌟', label: 'Year in the Word', desc: '365 devotionals. An entire year devoted to Scripture.', check: stats.devotionals >= 365 },
          { id: 'encounter-50', badge: '💎', label: 'Transformed', desc: '50 encounters with God. You are being changed from the inside out.', check: stats.fireSessions >= 50 },
        ]},
      ],
    },
    {
      name: 'Consistency',
      icon: '🔥',
      levels: [
        { level: 1, trophies: [
          { id: 'streak-3', badge: '🔥', label: 'Kindling', desc: '3-day reading streak. Roots are forming beneath the surface.', check: stats.streak >= 3 },
        ]},
        { level: 2, trophies: [
          { id: 'streak-7', badge: '🔥', label: 'On Fire', desc: '7 straight days. You are building an unbreakable habit.', check: stats.streak >= 7 },
        ]},
        { level: 3, trophies: [
          { id: 'streak-14', badge: '⚡', label: 'Relentless', desc: '14 days without missing. This is discipline.', check: stats.streak >= 14 },
        ]},
        { level: 4, trophies: [
          { id: 'streak-30', badge: '⚡', label: 'Unshakeable', desc: '30 days of showing up. This is who you are now.', check: stats.streak >= 30 },
        ]},
        { level: 5, trophies: [
          { id: 'streak-90', badge: '💎', label: 'Refined', desc: '90 days. You have been tested and proven faithful.', check: stats.streak >= 90 },
          { id: 'streak-365', badge: '🌟', label: 'Year of the Lord', desc: '365 straight days in the Word. Extraordinary.', check: stats.streak >= 365 },
        ]},
      ],
    },
    {
      name: 'Scripture',
      icon: '📜',
      levels: [
        { level: 1, trophies: [
          { id: 'highlights-1', badge: '✨', label: 'First Highlight', desc: 'You saved your first verse. The collection begins.', check: highlightCount >= 1 },
          { id: 'chapters-1', badge: '📗', label: 'First Chapter', desc: 'You read your first chapter. The journey begins.', check: chaptersStudied >= 1 },
        ]},
        { level: 2, trophies: [
          { id: 'highlights-10', badge: '💎', label: 'Collector', desc: '10 highlighted verses. You are saving what matters.', check: highlightCount >= 10 },
          { id: 'chapters-10', badge: '🗺', label: 'Explorer', desc: '10 chapters engaged. You are finding your way.', check: chaptersStudied >= 10 },
        ]},
        { level: 3, trophies: [
          { id: 'highlights-25', badge: '💫', label: 'Gem Finder', desc: '25 verses saved. You have an eye for truth.', check: highlightCount >= 25 },
          { id: 'chapters-30', badge: '📘', label: 'Deep Reader', desc: '30 chapters read. You are going deep.', check: chaptersStudied >= 30 },
        ]},
        { level: 4, trophies: [
          { id: 'highlights-50', badge: '👑', label: 'Treasure Hunter', desc: '50 highlights. A treasury of truth.', check: highlightCount >= 50 },
          { id: 'chapters-66', badge: '📜', label: 'Every Book', desc: '66 chapters — one from every book of the Bible.', check: chaptersStudied >= 66 },
          { id: 'chapters-200', badge: '🏛', label: 'Temple Builder', desc: '200 chapters. You are laying deep foundations.', check: chaptersStudied >= 200 },
        ]},
        { level: 5, trophies: [
          { id: 'highlights-100', badge: '🏅', label: 'Scripture Vault', desc: '100 verses saved. You are rich in the Word.', check: highlightCount >= 100 },
          { id: 'chapters-500', badge: '⭐', label: 'Half the Bible', desc: '500 chapters — almost halfway through all of Scripture.', check: chaptersStudied >= 500 },
          { id: 'chapters-1189', badge: '🌟', label: 'The Whole Word', desc: 'Every chapter in the entire Bible. Extraordinary.', check: chaptersStudied >= 1189 },
        ]},
      ],
    },
    {
      name: 'Study',
      icon: '📝',
      levels: [
        { level: 1, trophies: [
          { id: 'notes-5', badge: '✍', label: 'First Reflections', desc: 'Notes on 5 chapters. You are engaging with the Word.', check: chaptersWithNotes >= 5 },
        ]},
        { level: 2, trophies: [
          { id: 'notes-15', badge: '📝', label: 'Growing Deeper', desc: '15 chapters with notes. Your reflections are deepening.', check: chaptersWithNotes >= 15 },
        ]},
        { level: 3, trophies: [
          { id: 'notes-25', badge: '📝', label: 'Student of the Word', desc: '25 chapters with notes. Deep roots are growing.', check: chaptersWithNotes >= 25 },
        ]},
        { level: 4, trophies: [
          { id: 'notes-100', badge: '🎓', label: 'Scholar', desc: '100 chapters with notes. Your understanding runs deep.', check: chaptersWithNotes >= 100 },
        ]},
        { level: 5, trophies: [
          { id: 'notes-500', badge: '🦉', label: 'Wise Owl', desc: '500 chapters with notes. You have become a teacher.', check: chaptersWithNotes >= 500 },
        ]},
      ],
    },
    {
      name: 'Prayer',
      icon: '🙏',
      levels: [
        { level: 1, trophies: [
          { id: 'prayer-1', badge: '🙏', label: 'First Prayer', desc: 'Your first prayer. God heard every word.', check: totalPrayers >= 1 },
          { id: 'prayer-5', badge: '📿', label: 'Prayer Life', desc: '5 prayers written. A habit of talking to God.', check: totalPrayers >= 5 },
        ]},
        { level: 2, trophies: [
          { id: 'prayer-10', badge: '🕊', label: 'Faithful Asker', desc: '10 prayers. You keep bringing it to Him.', check: totalPrayers >= 10 },
          { id: 'answered-1', badge: '🌸', label: 'First Testimony', desc: 'Your first answered prayer. He is faithful.', check: answeredCount >= 1 },
        ]},
        { level: 3, trophies: [
          { id: 'prayer-25', badge: '🔥', label: 'Prayer Warrior', desc: '25 prayers. You are building a life of prayer.', check: totalPrayers >= 25 },
          { id: 'answered-5', badge: '🌻', label: 'Testimony Builder', desc: '5 answered prayers. A record of God at work.', check: answeredCount >= 5 },
        ]},
        { level: 4, trophies: [
          { id: 'prayer-50', badge: '⚔️', label: 'Intercessor', desc: '50 prayers. You stand in the gap for others.', check: totalPrayers >= 50 },
          { id: 'answered-10', badge: '🌳', label: 'Faithful Witness', desc: '10 answered prayers. Your testimony is growing.', check: answeredCount >= 10 },
        ]},
        { level: 5, trophies: [
          { id: 'prayer-100', badge: '👼', label: 'Prayer Legend', desc: '100 prayers lifted to the throne of God.', check: totalPrayers >= 100 },
          { id: 'answered-25', badge: '🏆', label: 'God Is Faithful', desc: '25 answered prayers. Undeniable proof of His hand.', check: answeredCount >= 25 },
        ]},
      ],
    },
  ];

  // Flatten all trophies for stats
  const allTrophies = categories.flatMap(cat =>
    cat.levels.flatMap(lvl => lvl.trophies)
  );
  const earned = allTrophies.filter(t => t.check);
  const locked = allTrophies.filter(t => !t.check);

  // Determine level status for a category
  const getLevelStatus = (cat: Category, levelIndex: number): 'completed' | 'current' | 'locked' => {
    const level = cat.levels[levelIndex];
    const allEarned = level.trophies.every(t => t.check);
    if (allEarned) return 'completed';
    // Check if all previous levels are completed
    const prevCompleted = cat.levels.slice(0, levelIndex).every(l => l.trophies.every(t => t.check));
    if (prevCompleted) return 'current';
    return 'locked';
  };

  // Get progress for current level
  const getLevelProgress = (level: Level): number => {
    const earnedInLevel = level.trophies.filter(t => t.check).length;
    return earnedInLevel / level.trophies.length;
  };

  // Filter categories based on earned/locked filter
  const shouldShowLevel = (level: Level): boolean => {
    if (filter === 'all') return true;
    if (filter === 'earned') return level.trophies.every(t => t.check);
    if (filter === 'locked') return !level.trophies.every(t => t.check);
    return true;
  };

  // Count completed levels total
  const totalLevels = categories.reduce((sum, cat) => sum + cat.levels.length, 0);
  const completedLevels = categories.reduce((sum, cat) =>
    sum + cat.levels.filter(l => l.trophies.every(t => t.check)).length, 0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <p className="text-3xl mb-2">🏆</p>
        <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>Trophy Room</h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(232,240,236,0.4)' }}>
          {earned.length} of {allTrophies.length} trophies earned · {completedLevels}/{totalLevels} levels complete
        </p>
        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-3 px-8">
          <div className="flex-1 rounded-full overflow-hidden h-2" style={{ background: `${accentColor}15` }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(earned.length / allTrophies.length) * 100}%`, background: `linear-gradient(90deg, ${accentColor}, #fbbf24)` }} />
          </div>
          <span className="text-xs font-bold" style={{ color: accentColor }}>{Math.round((earned.length / allTrophies.length) * 100)}%</span>
        </div>
      </div>

      {/* Level legend */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map(lvl => (
          <div key={lvl} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: LEVEL_COLORS[lvl] }} />
            <span className="text-[9px] font-semibold" style={{ color: LEVEL_COLORS[lvl] }}>Lv.{lvl}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {(['all', 'earned', 'locked'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center capitalize"
            style={filter === f
              ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
              : { color: 'rgba(232,240,236,0.35)', border: '1px solid transparent' }}>
            {f} {f === 'earned' ? `(${earned.length})` : f === 'locked' ? `(${locked.length})` : ''}
          </button>
        ))}
      </div>

      {/* Trophy detail modal */}
      {selectedTrophy && (() => {
        const levelColor = LEVEL_COLORS[selectedTrophy.level] || accentColor;
        return (
          <div className="rounded-2xl overflow-hidden" style={{
            background: `linear-gradient(135deg, ${levelColor}11, ${levelColor}05)`,
            border: `2px solid ${levelColor}44`,
            boxShadow: selectedTrophy.check ? `0 0 30px ${levelColor}22` : 'none',
          }}>
            <div className="px-6 py-6 text-center">
              <div className="text-5xl mb-3" style={{ filter: selectedTrophy.check ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                {selectedTrophy.badge}
              </div>
              <h3 className="text-base font-black uppercase tracking-wider mb-1"
                style={{ color: selectedTrophy.check ? levelColor : 'rgba(232,240,236,0.3)', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                {selectedTrophy.label}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: levelColor }}>
                Level {selectedTrophy.level} · {selectedTrophy.cat}
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: selectedTrophy.check ? 'rgba(232,240,236,0.7)' : 'rgba(232,240,236,0.3)', fontFamily: 'Georgia, serif' }}>
                {selectedTrophy.desc}
              </p>
              {selectedTrophy.check ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: `${levelColor}22` }}>
                  <span className="text-sm">✓</span>
                  <span className="text-xs font-bold" style={{ color: levelColor }}>EARNED</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-sm">🔒</span>
                  <span className="text-xs font-bold" style={{ color: 'rgba(232,240,236,0.3)' }}>LOCKED</span>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedTrophy(null)}
              className="w-full py-2.5 text-xs font-semibold"
              style={{ color: `${accentColor}66`, borderTop: `1px solid ${levelColor}15` }}>
              Close
            </button>
          </div>
        );
      })()}

      {/* Category sections */}
      {categories.map(cat => {
        const visibleLevels = cat.levels.filter(shouldShowLevel);
        if (visibleLevels.length === 0 && filter !== 'all') return null;

        return (
          <div key={cat.name} className="space-y-2">
            {/* Category header — bold accent bar style */}
            <div className="flex items-center gap-2 py-2">
              <div className="w-1 h-6 rounded-full" style={{ background: accentColor }} />
              <span className="text-sm">{cat.icon}</span>
              <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#f0f8f4', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                {cat.name}
              </h3>
              <span className="text-[10px] font-semibold ml-auto" style={{ color: 'rgba(232,240,236,0.3)' }}>
                {cat.levels.filter(l => l.trophies.every(t => t.check)).length}/5
              </span>
            </div>

            {/* Level bars — horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {cat.levels.map((level, idx) => {
                const status = getLevelStatus(cat, idx);
                const progress = getLevelProgress(level);
                const levelColor = LEVEL_COLORS[level.level];
                const isVisible = shouldShowLevel(level);

                if (!isVisible && filter !== 'all') return null;

                return (
                  <div key={level.level} className="flex-shrink-0 rounded-xl overflow-hidden transition-all"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      flex: '1 1 0',
                      background: status === 'completed'
                        ? `linear-gradient(135deg, ${levelColor}15, ${levelColor}08)`
                        : status === 'current'
                        ? `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`
                        : 'rgba(255,255,255,0.015)',
                      border: status === 'completed'
                        ? `1px solid ${levelColor}44`
                        : status === 'current'
                        ? `1px solid ${accentColor}33`
                        : '1px solid rgba(255,255,255,0.04)',
                      boxShadow: status === 'completed' ? `0 0 16px ${levelColor}15` : 'none',
                      opacity: status === 'locked' ? 0.45 : 1,
                    }}>
                    {/* Level label */}
                    <div className="px-2 pt-2 pb-1 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest"
                        style={{ color: status === 'completed' ? levelColor : status === 'current' ? 'rgba(232,240,236,0.5)' : 'rgba(232,240,236,0.2)' }}>
                        Lv.{level.level}
                      </span>
                    </div>

                    {/* Trophy icons */}
                    <div className="flex items-center justify-center gap-1 px-1 py-1.5">
                      {level.trophies.map(trophy => (
                        <button key={trophy.id}
                          onClick={() => status !== 'locked' ? setSelectedTrophy({ ...trophy, cat: cat.name, level: level.level }) : null}
                          className="transition-transform active:scale-90"
                          style={{ cursor: status === 'locked' ? 'default' : 'pointer' }}>
                          <span className="text-lg"
                            style={{
                              filter: trophy.check
                                ? 'none'
                                : status === 'locked'
                                ? 'grayscale(1) opacity(0.15)'
                                : 'grayscale(1) opacity(0.35)',
                            }}>
                            {trophy.badge}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Status indicator */}
                    <div className="px-2 pb-2">
                      {status === 'completed' ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[8px]" style={{ color: levelColor }}>✓</span>
                          <span className="text-[7px] font-bold uppercase" style={{ color: levelColor }}>Done</span>
                        </div>
                      ) : status === 'current' ? (
                        <div className="space-y-0.5">
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${progress * 100}%`,
                              background: `linear-gradient(90deg, ${accentColor}, ${levelColor})`,
                            }} />
                          </div>
                          <p className="text-[7px] font-semibold text-center" style={{ color: 'rgba(232,240,236,0.3)' }}>
                            {level.trophies.filter(t => t.check).length}/{level.trophies.length}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="text-[8px]" style={{ color: 'rgba(232,240,236,0.15)' }}>🔒</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded current level detail */}
            {(() => {
              const currentIdx = cat.levels.findIndex((_, i) => getLevelStatus(cat, i) === 'current');
              if (currentIdx === -1) return null;
              const currentLevel = cat.levels[currentIdx];
              const levelColor = LEVEL_COLORS[currentLevel.level];

              return (
                <div className="rounded-xl px-3 py-2.5 space-y-1.5" style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${accentColor}15`,
                }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(232,240,236,0.3)' }}>
                    In Progress — Level {currentLevel.level}
                  </p>
                  {currentLevel.trophies.map(trophy => (
                    <button key={trophy.id}
                      onClick={() => setSelectedTrophy({ ...trophy, cat: cat.name, level: currentLevel.level })}
                      className="flex items-center gap-2 w-full text-left py-1 transition-all active:scale-[0.98]">
                      <span className="text-base" style={{ filter: trophy.check ? 'none' : 'grayscale(0.8) opacity(0.5)' }}>
                        {trophy.badge}
                      </span>
                      <span className="text-[10px] font-semibold flex-1"
                        style={{ color: trophy.check ? levelColor : 'rgba(232,240,236,0.35)' }}>
                        {trophy.label}
                      </span>
                      {trophy.check ? (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${levelColor}22`, color: levelColor }}>✓</span>
                      ) : (
                        <span className="text-[8px]" style={{ color: 'rgba(232,240,236,0.2)' }}>○</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Empty state */}
      {filter !== 'all' && categories.every(cat => cat.levels.filter(shouldShowLevel).length === 0) && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'rgba(232,240,236,0.3)' }}>No trophies match this filter</p>
        </div>
      )}
    </div>
  );
}
