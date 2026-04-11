'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Props {
  groupId: string;
  profileId: string;
  isLeader: boolean;
  accentColor: string;
}

interface ReadingPlan {
  id: string;
  group_id: string;
  title: string;
  book_name: string;
  book_osis: string;
  start_chapter: number;
  end_chapter: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface PlanProgress {
  id: string;
  plan_id: string;
  profile_id: string;
  chapter: number;
  completed_at: string;
}

interface MemberProgress {
  profile_id: string;
  name: string;
  color: string;
  completed_chapters: number[];
}

const BIBLE_BOOKS: { name: string; osis: string; chapters: number }[] = [
  { name: 'Genesis', osis: 'Gen', chapters: 50 },
  { name: 'Exodus', osis: 'Exod', chapters: 40 },
  { name: 'Psalms', osis: 'Ps', chapters: 150 },
  { name: 'Proverbs', osis: 'Prov', chapters: 31 },
  { name: 'Matthew', osis: 'Matt', chapters: 28 },
  { name: 'Mark', osis: 'Mark', chapters: 16 },
  { name: 'Luke', osis: 'Luke', chapters: 24 },
  { name: 'John', osis: 'John', chapters: 21 },
  { name: 'Acts', osis: 'Acts', chapters: 28 },
  { name: 'Romans', osis: 'Rom', chapters: 16 },
  { name: '1 Corinthians', osis: '1Cor', chapters: 16 },
  { name: '2 Corinthians', osis: '2Cor', chapters: 13 },
  { name: 'Galatians', osis: 'Gal', chapters: 6 },
  { name: 'Ephesians', osis: 'Eph', chapters: 6 },
  { name: 'Philippians', osis: 'Phil', chapters: 4 },
  { name: 'Colossians', osis: 'Col', chapters: 4 },
  { name: 'James', osis: 'Jas', chapters: 5 },
  { name: '1 Peter', osis: '1Pet', chapters: 5 },
  { name: 'Revelation', osis: 'Rev', chapters: 22 },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function AvatarCircle({
  name,
  color,
  size = 32,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: 0.3,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function ProgressBar({
  value,
  accentColor,
}: {
  value: number;
  accentColor: string;
}) {
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          background: accentColor,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export default function GroupReadingPlan({
  groupId,
  profileId,
  isLeader,
  accentColor,
}: Props) {
  const supabase = createClient();

  /* ── State ── */
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [myProgress, setMyProgress] = useState<Set<number>>(new Set());
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingChapter, setMarkingChapter] = useState<number | null>(null);

  // Create plan form
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBookIdx, setFormBookIdx] = useState(9); // Romans default
  const [formStartChapter, setFormStartChapter] = useState(1);
  const [formEndChapter, setFormEndChapter] = useState(16);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  /* ── Data fetching ── */

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trace_reading_plans')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching plan:', error);
      setLoading(false);
      return;
    }

    setPlan(data ?? null);
    setLoading(false);
  }, [groupId]);

  const fetchProgress = useCallback(async (planId: string) => {
    // My progress
    const { data: mine } = await supabase
      .from('trace_plan_progress')
      .select('chapter')
      .eq('plan_id', planId)
      .eq('profile_id', profileId);

    if (mine) {
      setMyProgress(new Set(mine.map((r: { chapter: number }) => r.chapter)));
    }

    // Member progress joined with profiles
    const { data: allProgress } = await supabase
      .from('trace_plan_progress')
      .select('profile_id, chapter, trace_profiles(name, color)')
      .eq('plan_id', planId);

    if (allProgress) {
      const memberMap: Record<string, MemberProgress> = {};
      for (const row of allProgress as any[]) {
        const pid = row.profile_id;
        if (!memberMap[pid]) {
          memberMap[pid] = {
            profile_id: pid,
            name: row.trace_profiles?.name ?? 'Member',
            color: row.trace_profiles?.color ?? '#555',
            completed_chapters: [],
          };
        }
        memberMap[pid].completed_chapters.push(row.chapter);
      }
      setMemberProgress(Object.values(memberMap));
    }
  }, [profileId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (plan) fetchProgress(plan.id);
  }, [plan, fetchProgress]);

  /* ── Chapter toggle ── */

  const toggleChapter = useCallback(
    async (chapter: number) => {
      if (!plan) return;
      const already = myProgress.has(chapter);
      if (already) return; // only allow marking complete, not unchecking

      // Optimistic update
      setMyProgress((prev) => new Set([...prev, chapter]));
      setMarkingChapter(chapter);

      const { error } = await supabase.from('trace_plan_progress').insert({
        plan_id: plan.id,
        profile_id: profileId,
        chapter,
      });

      if (error) {
        console.error('Error marking chapter:', error);
        // Revert
        setMyProgress((prev) => {
          const next = new Set(prev);
          next.delete(chapter);
          return next;
        });
      } else {
        // Update member progress optimistically
        setMemberProgress((prev) => {
          const existing = prev.find((m) => m.profile_id === profileId);
          if (existing) {
            return prev.map((m) =>
              m.profile_id === profileId
                ? { ...m, completed_chapters: [...m.completed_chapters, chapter] }
                : m
            );
          }
          return prev;
        });
      }
      setMarkingChapter(null);
    },
    [plan, myProgress, profileId]
  );

  /* ── Create plan ── */

  const handleCreatePlan = useCallback(async () => {
    if (!formTitle.trim()) {
      setFormError('Please enter a plan title.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError('Please set start and end dates.');
      return;
    }
    if (formStartChapter > formEndChapter) {
      setFormError('Start chapter must be ≤ end chapter.');
      return;
    }

    setSaving(true);
    setFormError('');

    const book = BIBLE_BOOKS[formBookIdx];
    const { error } = await supabase.from('trace_reading_plans').insert({
      group_id: groupId,
      title: formTitle.trim(),
      book_name: book.name,
      book_osis: book.osis,
      start_chapter: formStartChapter,
      end_chapter: formEndChapter,
      start_date: formStartDate,
      end_date: formEndDate,
    });

    if (error) {
      setFormError('Failed to create plan. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowCreateSheet(false);
    setFormTitle('');
    setFormBookIdx(9);
    setFormStartChapter(1);
    setFormEndChapter(16);
    setFormStartDate('');
    setFormEndDate('');
    await fetchPlan();
  }, [
    formTitle,
    formBookIdx,
    formStartChapter,
    formEndChapter,
    formStartDate,
    formEndDate,
    groupId,
    fetchPlan,
  ]);

  /* ── Derived values ── */

  const totalChapters = plan
    ? plan.end_chapter - plan.start_chapter + 1
    : 0;

  const myCompletedCount = plan
    ? [...myProgress].filter(
        (c) => c >= plan.start_chapter && c <= plan.end_chapter
      ).length
    : 0;

  const myProgressRatio = totalChapters > 0 ? myCompletedCount / totalChapters : 0;

  const chapterRange = plan
    ? Array.from(
        { length: plan.end_chapter - plan.start_chapter + 1 },
        (_, i) => plan.start_chapter + i
      )
    : [];

  /* ── Styles ── */

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: '20px',
    marginBottom: 16,
  };

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    padding: '10px 14px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  /* ── Loading ── */

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: `2px solid rgba(255,255,255,0.1)`,
            borderTopColor: accentColor,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── No Plan State ── */

  if (!plan) {
    return (
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            ...card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 24px',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 48 }}>📖</span>
          <p
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 17,
              fontWeight: 600,
              margin: 0,
            }}
          >
            No reading plan yet
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: 14,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isLeader
              ? 'Start a group reading plan to track chapters together.'
              : "Your group leader hasn't started a reading plan yet."}
          </p>
          {isLeader && (
            <button
              onClick={() => setShowCreateSheet(true)}
              style={{
                marginTop: 8,
                background: accentColor,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Start Reading Plan
            </button>
          )}
        </div>

        {showCreateSheet && (
          <CreatePlanSheet
            books={BIBLE_BOOKS}
            formTitle={formTitle}
            setFormTitle={setFormTitle}
            formBookIdx={formBookIdx}
            setFormBookIdx={(idx) => {
              setFormBookIdx(idx);
              setFormStartChapter(1);
              setFormEndChapter(BIBLE_BOOKS[idx].chapters);
            }}
            formStartChapter={formStartChapter}
            setFormStartChapter={setFormStartChapter}
            formEndChapter={formEndChapter}
            setFormEndChapter={setFormEndChapter}
            formStartDate={formStartDate}
            setFormStartDate={setFormStartDate}
            formEndDate={formEndDate}
            setFormEndDate={setFormEndDate}
            formError={formError}
            saving={saving}
            onSave={handleCreatePlan}
            onClose={() => setShowCreateSheet(false)}
            accentColor={accentColor}
            inputStyle={inputStyle}
            label={label}
          />
        )}
      </div>
    );
  }

  /* ── Active Plan ── */

  const topFiveMembers = memberProgress.slice(0, 5);

  return (
    <div style={{ padding: '0 16px', paddingBottom: 40 }}>
      {/* ── Plan Header Card ── */}
      <div style={card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.3,
                marginBottom: 4,
              }}
            >
              {plan.title}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 2,
              }}
            >
              {plan.book_name} Ch. {plan.start_chapter}
              {plan.end_chapter !== plan.start_chapter
                ? `–${plan.end_chapter}`
                : ''}
            </p>
            <p
              style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
            >
              {formatDate(plan.start_date)} – {formatDate(plan.end_date)}
            </p>
          </div>
        </div>

        {/* My progress */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              My progress
            </span>
            <span style={{ fontSize: 13, color: accentColor, fontWeight: 600 }}>
              {myCompletedCount} / {totalChapters} chapters
            </span>
          </div>
          <ProgressBar value={myProgressRatio} accentColor={accentColor} />
        </div>

        {/* Top member avatars */}
        {topFiveMembers.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 18,
              flexWrap: 'wrap',
            }}
          >
            {topFiveMembers.map((m) => {
              const ratio =
                totalChapters > 0
                  ? m.completed_chapters.filter(
                      (c) =>
                        c >= plan.start_chapter && c <= plan.end_chapter
                    ).length / totalChapters
                  : 0;
              return (
                <div
                  key={m.profile_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <AvatarCircle name={m.name} color={m.color} size={32} />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.45)',
                      fontWeight: 600,
                    }}
                  >
                    {Math.round(ratio * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chapter Checklist ── */}
      <div style={card}>
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {plan.book_name} Chapters
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
            gap: 8,
          }}
        >
          {chapterRange.map((ch) => {
            const done = myProgress.has(ch);
            const isLoading = markingChapter === ch;
            return (
              <button
                key={ch}
                onClick={() => toggleChapter(ch)}
                disabled={done || isLoading}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: done
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.12)',
                  background: done
                    ? accentColor
                    : 'rgba(255,255,255,0.05)',
                  color: done ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: done ? 15 : 13,
                  fontWeight: 600,
                  cursor: done ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, color 0.2s',
                  opacity: isLoading ? 0.6 : 1,
                  padding: 0,
                }}
                aria-label={`Chapter ${ch}${done ? ' (completed)' : ''}`}
              >
                {done ? '✓' : ch}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Member Progress ── */}
      {memberProgress.length > 0 && (
        <div style={card}>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Group Progress
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {memberProgress.map((m) => {
              const completed = m.completed_chapters.filter(
                (c) => c >= plan.start_chapter && c <= plan.end_chapter
              ).length;
              const ratio = totalChapters > 0 ? completed / totalChapters : 0;
              return (
                <div
                  key={m.profile_id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <AvatarCircle name={m.name} color={m.color} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.4)',
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                      >
                        {completed}/{totalChapters}
                      </span>
                    </div>
                    <ProgressBar value={ratio} accentColor={accentColor} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leader: Start New Plan button ── */}
      {isLeader && (
        <button
          onClick={() => setShowCreateSheet(true)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            color: accentColor,
            fontSize: 15,
            fontWeight: 700,
            padding: '14px',
            cursor: 'pointer',
            letterSpacing: 0.2,
          }}
        >
          + Start New Reading Plan
        </button>
      )}

      {/* ── Create Plan Bottom Sheet ── */}
      {showCreateSheet && (
        <CreatePlanSheet
          books={BIBLE_BOOKS}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formBookIdx={formBookIdx}
          setFormBookIdx={(idx) => {
            setFormBookIdx(idx);
            setFormStartChapter(1);
            setFormEndChapter(BIBLE_BOOKS[idx].chapters);
          }}
          formStartChapter={formStartChapter}
          setFormStartChapter={setFormStartChapter}
          formEndChapter={formEndChapter}
          setFormEndChapter={setFormEndChapter}
          formStartDate={formStartDate}
          setFormStartDate={setFormStartDate}
          formEndDate={formEndDate}
          setFormEndDate={setFormEndDate}
          formError={formError}
          saving={saving}
          onSave={handleCreatePlan}
          onClose={() => setShowCreateSheet(false)}
          accentColor={accentColor}
          inputStyle={inputStyle}
          label={label}
        />
      )}
    </div>
  );
}

/* ─── Create Plan Sheet ──────────────────────────────────────────────── */

interface CreatePlanSheetProps {
  books: typeof BIBLE_BOOKS;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formBookIdx: number;
  setFormBookIdx: (v: number) => void;
  formStartChapter: number;
  setFormStartChapter: (v: number) => void;
  formEndChapter: number;
  setFormEndChapter: (v: number) => void;
  formStartDate: string;
  setFormStartDate: (v: string) => void;
  formEndDate: string;
  setFormEndDate: (v: string) => void;
  formError: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  accentColor: string;
  inputStyle: React.CSSProperties;
  label: React.CSSProperties;
}

function CreatePlanSheet({
  books,
  formTitle,
  setFormTitle,
  formBookIdx,
  setFormBookIdx,
  formStartChapter,
  setFormStartChapter,
  formEndChapter,
  setFormEndChapter,
  formStartDate,
  setFormStartDate,
  formEndDate,
  setFormEndDate,
  formError,
  saving,
  onSave,
  onClose,
  accentColor,
  inputStyle,
  label,
}: CreatePlanSheetProps) {
  const selectedBook = books[formBookIdx];
  const chapterOptions = Array.from(
    { length: selectedBook.chapters },
    (_, i) => i + 1
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 50,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#050908',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          zIndex: 51,
          padding: '24px 20px 40px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            margin: '0 auto 20px',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Start Reading Plan
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 18,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            x
          </button>
        </div>

        {/* Plan Title */}
        <div style={{ marginBottom: 18 }}>
          <p style={label}>Plan Title</p>
          <input
            style={inputStyle}
            placeholder='e.g. Reading Romans Together'
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Book */}
        <div style={{ marginBottom: 18 }}>
          <p style={label}>Book of the Bible</p>
          <select
            value={formBookIdx}
            onChange={(e) => setFormBookIdx(Number(e.target.value))}
            style={{
              ...inputStyle,
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: 36,
            }}
          >
            {books.map((b, i) => (
              <option key={b.osis} value={i} style={{ background: '#111' }}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Range */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <p style={label}>Start Chapter</p>
            <select
              value={formStartChapter}
              onChange={(e) => setFormStartChapter(Number(e.target.value))}
              style={{
                ...inputStyle,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}
            >
              {chapterOptions.map((c) => (
                <option key={c} value={c} style={{ background: '#111' }}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p style={label}>End Chapter</p>
            <select
              value={formEndChapter}
              onChange={(e) => setFormEndChapter(Number(e.target.value))}
              style={{
                ...inputStyle,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}
            >
              {chapterOptions
                .filter((c) => c >= formStartChapter)
                .map((c) => (
                  <option key={c} value={c} style={{ background: '#111' }}>
                    {c}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div>
            <p style={label}>Start Date</p>
            <input
              type='date'
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <p style={label}>End Date</p>
            <input
              type='date'
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
              }}
            />
          </div>
        </div>

        {/* Preview */}
        {formTitle && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 20,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 4,
              }}
            >
              Preview
            </p>
            <p
              style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}
            >
              {formTitle}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              {selectedBook.name} Ch. {formStartChapter}
              {formEndChapter !== formStartChapter
                ? `–${formEndChapter}`
                : ''}{' '}
              &middot; {formEndChapter - formStartChapter + 1} chapters
              {formStartDate && formEndDate
                ? ` · ${formatDate(formStartDate)} – ${formatDate(formEndDate)}`
                : ''}
            </p>
          </div>
        )}

        {/* Error */}
        {formError && (
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              color: '#ff6b6b',
              fontWeight: 500,
            }}
          >
            {formError}
          </p>
        )}

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            width: '100%',
            background: saving ? 'rgba(255,255,255,0.08)' : accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '15px',
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? 'Creating...' : 'Create Plan'}
        </button>
      </div>
    </>
  );
}
