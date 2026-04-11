'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  member: {
    userId: string;
    name: string;
    color: string;
    role: 'leader' | 'member';
    joinedAt: string;
  };
  groupName: string;
  accentColor: string;
  onClose: () => void;
}

interface ProfileData {
  bio?: string;
  testimony?: string;
  favoriteVerse?: string;
  lifeVerse?: string;
  church?: string;
  savedDate?: string;
  baptismDate?: string;
  denomination?: string;
  spiritualGifts?: string[];
  ministryRole?: string;
  mentor?: string;
  discipling?: string;
  location?: string;
  profilePicture?: string;
  favoriteBook?: string;
  favoritePreacher?: string;
}

interface Highlight {
  book_name: string;
  chapter: number;
  verse: number;
  color: string;
  verse_text?: string;
}

interface ReadingActivity {
  book_osis: string;
  chapter: number;
  read_at: string;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatOsis(osis: string): string {
  const map: Record<string, string> = {
    Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers',
    Deut: 'Deuteronomy', Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth',
    '1Sam': '1 Samuel', '2Sam': '2 Samuel', '1Kgs': '1 Kings', '2Kgs': '2 Kings',
    '1Chr': '1 Chronicles', '2Chr': '2 Chronicles', Ezra: 'Ezra', Neh: 'Nehemiah',
    Esth: 'Esther', Job: 'Job', Ps: 'Psalms', Prov: 'Proverbs',
    Eccl: 'Ecclesiastes', Song: 'Song of Songs', Isa: 'Isaiah', Jer: 'Jeremiah',
    Lam: 'Lamentations', Ezek: 'Ezekiel', Dan: 'Daniel', Hos: 'Hosea',
    Joel: 'Joel', Amos: 'Amos', Obad: 'Obadiah', Jonah: 'Jonah',
    Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk', Zeph: 'Zephaniah',
    Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi', Matt: 'Matthew',
    Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
    Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
    Gal: 'Galatians', Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
    '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians',
    '1Tim': '1 Timothy', '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon',
    Heb: 'Hebrews', Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
    '1John': '1 John', '2John': '2 John', '3John': '3 John', Jude: 'Jude',
    Rev: 'Revelation',
  };
  return map[osis] ?? osis;
}

export default function MemberProfilePanel({ member, groupName, onClose }: Props) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState<string>(member.name);
  const [highlightCount, setHighlightCount] = useState<number>(0);
  const [recentHighlights, setRecentHighlights] = useState<Highlight[]>([]);
  const [readingCount, setReadingCount] = useState<number>(0);
  const [recentReading, setRecentReading] = useState<ReadingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const joinedDaysAgo = Math.floor(
    (Date.now() - new Date(member.joinedAt).getTime()) / 86400000
  );

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch profile
      try {
        const { data } = await supabase
          .from('trace_profiles')
          .select('display_name, avatar_color, profile_data')
          .eq('id', member.userId)
          .single();
        if (data) {
          if (data.display_name) setDisplayName(data.display_name);
          if (data.profile_data) setProfileData(data.profile_data as ProfileData);
        }
      } catch {
        // ignore
      }

      // Fetch highlight count
      try {
        const { count } = await supabase
          .from('trace_highlights')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.userId);
        setHighlightCount(count ?? 0);
      } catch {
        setHighlightCount(0);
      }

      // Fetch recent highlights
      try {
        const { data } = await supabase
          .from('trace_highlights')
          .select('book_name, chapter, verse, color, verse_text')
          .eq('user_id', member.userId)
          .order('created_at', { ascending: false })
          .limit(6);
        if (data) {
          setRecentHighlights(
            data.map((row: any) => ({
              book_name: row.book_name as string,
              chapter: row.chapter as number,
              verse: row.verse as number,
              color: row.color as string,
              verse_text: row.verse_text as string | undefined,
            }))
          );
        }
      } catch {
        setRecentHighlights([]);
      }

      // Fetch reading activity count
      try {
        const { count } = await supabase
          .from('trace_reading_activity')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.userId);
        setReadingCount(count ?? 0);
      } catch {
        setReadingCount(0);
      }

      // Fetch recent reading activity
      try {
        const { data } = await supabase
          .from('trace_reading_activity')
          .select('book_osis, chapter, read_at')
          .eq('user_id', member.userId)
          .order('read_at', { ascending: false })
          .limit(5);
        if (data) {
          setRecentReading(
            data.map((row: any) => ({
              book_osis: row.book_osis as string,
              chapter: row.chapter as number,
              read_at: row.read_at as string,
            }))
          );
        }
      } catch {
        setRecentReading([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [member.userId]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  const badges = [
    {
      icon: '✝️',
      label: 'Joined the Family',
      earned: true,
    },
    {
      icon: '📖',
      label: 'First Week',
      earned: joinedDaysAgo >= 7,
    },
    {
      icon: '🔥',
      label: 'Faithful Reader',
      earned: readingCount >= 10,
    },
    {
      icon: '✨',
      label: 'Highlighter',
      earned: highlightCount >= 5,
    },
    {
      icon: '🏆',
      label: 'Quiz Champion',
      earned: false,
      locked: true,
    },
    {
      icon: '🌿',
      label: 'One Month Strong',
      earned: joinedDaysAgo >= 30,
    },
    {
      icon: '🙏',
      label: 'Prayer Warrior',
      earned: false,
      locked: true,
    },
    {
      icon: '📚',
      label: 'Bible Scholar',
      earned: readingCount >= 50,
    },
  ];

  const hasSpiritualLife =
    profileData?.favoriteVerse ||
    profileData?.lifeVerse ||
    (profileData?.spiritualGifts && profileData.spiritualGifts.length > 0) ||
    profileData?.denomination ||
    profileData?.ministryRole ||
    profileData?.mentor ||
    profileData?.discipling;

  const sectionLabel = (text: string) => ({
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: member.color + 'aa',
    fontFamily: 'Montserrat, sans-serif',
    marginBottom: 14,
  });

  const card = {
    background: 'rgba(255,255,255,0.03)' as const,
    border: '1px solid rgba(255,255,255,0.07)' as const,
    borderRadius: 16,
    padding: '18px 16px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'opacity 0.35s ease',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#060a08',
          borderRadius: '24px 24px 0 0',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 -8px 60px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Drag indicator */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            margin: '12px auto 0',
            flexShrink: 0,
          }}
        />

        {/* Header Banner */}
        <div
          style={{
            background: `linear-gradient(160deg, ${member.color}dd 0%, ${member.color}88 40%, ${member.color}22 75%, transparent 100%)`,
            padding: '28px 20px 32px',
            position: 'relative',
            marginTop: 8,
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 15,
              lineHeight: 1,
              backdropFilter: 'blur(4px)',
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Avatar */}
          <div style={{ marginBottom: 16 }}>
            {profileData?.profilePicture ? (
              <img
                src={profileData.profilePicture}
                alt={displayName}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `3px solid rgba(255,255,255,0.3)`,
                  boxShadow: `0 0 0 4px ${member.color}44, 0 8px 24px rgba(0,0,0,0.4)`,
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${member.color}, ${member.color}99)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#fff',
                  boxShadow: `0 0 0 3px rgba(255,255,255,0.2), 0 0 0 6px ${member.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                  letterSpacing: '-0.02em',
                }}
              >
                {getInitials(displayName)}
              </div>
            )}
          </div>

          {/* Name */}
          <div
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: 26,
              color: '#fff',
              marginBottom: 8,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {displayName}
          </div>

          {/* Role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: member.role === 'leader'
                  ? `linear-gradient(135deg, #f5c842, #d4a017)`
                  : 'rgba(255,255,255,0.15)',
                color: member.role === 'leader' ? '#1a1000' : '#fff',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: 20,
                border: member.role === 'leader'
                  ? '1px solid rgba(255,220,80,0.5)'
                  : '1px solid rgba(255,255,255,0.25)',
                boxShadow: member.role === 'leader' ? '0 2px 8px rgba(212,160,23,0.4)' : 'none',
              }}
            >
              {member.role === 'leader' ? '👑 Leader' : 'Member'}
            </span>

            {/* Location chip */}
            {profileData?.location && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 500,
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                📍 {profileData.location}
              </span>
            )}

            {/* Church chip */}
            {profileData?.church && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 500,
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                ⛪ {profileData.church}
              </span>
            )}
          </div>

          {/* Bio */}
          {profileData?.bio && (
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 14,
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.82)',
                lineHeight: 1.6,
                marginBottom: 10,
                maxWidth: 340,
              }}
            >
              "{profileData.bio}"
            </div>
          )}

          {/* Joined */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              marginTop: 4,
            }}
          >
            Joined {groupName} · {joinedDaysAgo === 0 ? 'today' : `${joinedDaysAgo} day${joinedDaysAgo === 1 ? '' : 's'} ago`}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stats Bar */}
          <div
            style={{
              ...card,
              padding: '20px 16px',
              display: 'flex',
              alignItems: 'stretch',
            }}
          >
            {[
              { value: loading ? '—' : String(readingCount), label: 'Chapters Read' },
              { value: loading ? '—' : String(highlightCount), label: 'Verses Highlighted' },
              { value: String(joinedDaysAgo), label: 'Days in Group' },
            ].map((stat, i, arr) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  padding: '0 8px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 800,
                    fontSize: 28,
                    color: member.color,
                    lineHeight: 1,
                    marginBottom: 6,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Spiritual Life Section */}
          {!loading && hasSpiritualLife && (
            <div style={card}>
              <div style={sectionLabel('Spiritual Life')}>Spiritual Life</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Favorite Verse */}
                {profileData?.favoriteVerse && (
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${member.color}18, ${member.color}08)`,
                      border: `1px solid ${member.color}33`,
                      borderLeft: `3px solid ${member.color}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: member.color + 'bb',
                        fontFamily: 'Montserrat, sans-serif',
                        marginBottom: 8,
                      }}
                    >
                      Favorite Verse
                    </div>
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 15,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.85)',
                        lineHeight: 1.6,
                      }}
                    >
                      {profileData.favoriteVerse}
                    </div>
                  </div>
                )}

                {/* Life Verse (only if different from favorite) */}
                {profileData?.lifeVerse && profileData.lifeVerse !== profileData.favoriteVerse && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderLeft: `3px solid rgba(255,255,255,0.2)`,
                      borderRadius: 12,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: 'Montserrat, sans-serif',
                        marginBottom: 8,
                      }}
                    >
                      Life Verse
                    </div>
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 15,
                        fontStyle: 'italic',
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.6,
                      }}
                    >
                      {profileData.lifeVerse}
                    </div>
                  </div>
                )}

                {/* Spiritual Gifts */}
                {profileData?.spiritualGifts && profileData.spiritualGifts.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.35)',
                        fontFamily: 'Montserrat, sans-serif',
                        marginBottom: 8,
                      }}
                    >
                      Spiritual Gifts
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profileData.spiritualGifts.map((gift, i) => (
                        <span
                          key={i}
                          style={{
                            background: `${member.color}22`,
                            border: `1px solid ${member.color}44`,
                            color: member.color,
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 600,
                            fontSize: 11,
                            padding: '4px 12px',
                            borderRadius: 20,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {gift}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Denomination / Ministry / Mentor / Discipling */}
                {[
                  { label: 'Denomination', value: profileData?.denomination },
                  { label: 'Ministry Role', value: profileData?.ministryRole },
                  { label: 'Mentor', value: profileData?.mentor },
                  { label: 'Discipling', value: profileData?.discipling },
                ]
                  .filter((item) => item.value)
                  .map((item) => (
                    <StatRow
                      key={item.label}
                      label={item.label}
                      value={item.value!}
                      color={member.color}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Trophy Room */}
          <div style={card}>
            <div style={sectionLabel('Trophy Room')}>Trophy Room</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}
            >
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 6px',
                    borderRadius: 14,
                    background: badge.earned
                      ? `linear-gradient(135deg, ${member.color}28, ${member.color}10)`
                      : 'rgba(255,255,255,0.02)',
                    border: badge.earned
                      ? `1px solid ${member.color}44`
                      : '1px solid rgba(255,255,255,0.06)',
                    opacity: badge.earned ? 1 : 0.45,
                    position: 'relative',
                    gap: 6,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Lock overlay */}
                  {badge.locked && !badge.earned && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 6,
                        fontSize: 10,
                        opacity: 0.6,
                      }}
                    >
                      🔒
                    </div>
                  )}
                  <span style={{ fontSize: 22, lineHeight: 1, filter: badge.earned ? 'none' : 'grayscale(1)' }}>
                    {badge.icon}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 600,
                      fontSize: 9,
                      textAlign: 'center',
                      lineHeight: 1.3,
                      color: badge.earned ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Highlights */}
          <div style={card}>
            <div style={sectionLabel('Recent Highlights')}>Recent Highlights</div>
            {loading ? (
              <SkeletonRows count={4} color={member.color} />
            ) : recentHighlights.length === 0 ? (
              <div
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                  textAlign: 'center',
                  padding: '10px 0',
                }}
              >
                No highlights yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentHighlights.map((h, i) => {
                  const preview = h.verse_text
                    ? h.verse_text.length > 42
                      ? h.verse_text.slice(0, 42).trimEnd() + '…'
                      : h.verse_text
                    : null;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.025)',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: h.color || member.color,
                          flexShrink: 0,
                          marginTop: 3,
                          boxShadow: `0 0 6px ${h.color || member.color}88`,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 600,
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.8)',
                          }}
                        >
                          {h.book_name} {h.chapter}:{h.verse}
                        </span>
                        {preview && (
                          <span
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontSize: 12,
                              color: 'rgba(255,255,255,0.45)',
                              fontStyle: 'italic',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {preview}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reading Activity */}
          <div style={card}>
            <div style={sectionLabel('Reading Activity')}>Reading Activity</div>
            {loading ? (
              <SkeletonRows count={4} color={member.color} />
            ) : recentReading.length === 0 ? (
              <div
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontFamily: 'Georgia, serif',
                  textAlign: 'center',
                  padding: '10px 0',
                }}
              >
                No reading activity yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentReading.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < recentReading.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: member.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: 14,
                          color: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        {formatOsis(r.book_osis)} {r.chapter}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {timeAgo(r.read_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Testimony */}
          {!loading && profileData?.testimony && (
            <div
              style={{
                ...card,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative quote mark */}
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: 10,
                  fontSize: 80,
                  lineHeight: 1,
                  fontFamily: 'Georgia, serif',
                  color: member.color + '18',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                "
              </div>

              <div style={sectionLabel('Testimony')}>Testimony</div>
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.75,
                  fontStyle: 'italic',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {profileData.testimony}
              </div>
            </div>
          )}

          {/* Bottom safe area spacer */}
          <div style={{ height: 32 }} />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
      }}
    >
      <span
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 13,
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          color: color,
          textAlign: 'right',
          maxWidth: '55%',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SkeletonRows({ count, color }: { count: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            borderRadius: 7,
            background: `${color}14`,
            width: i % 3 === 0 ? '80%' : i % 3 === 1 ? '55%' : '65%',
          }}
        />
      ))}
    </div>
  );
}
