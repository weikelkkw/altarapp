'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─────────────────────────────────────────────────── */

interface StudySchedule {
  id: string;
  group_id: string;
  day_of_week: number;
  start_time: string; // HH:MM:SS
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  notes: string | null;
  active: boolean;
  created_by: string;
  updated_at: string;
}

interface Props {
  groupId: string;
  profileId: string;
  isLeader: boolean;
  accentColor: string;
}

/* ─── Constants ─────────────────────────────────────────────── */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '2 hr', value: 120 },
];

/* ─── Helpers ───────────────────────────────────────────────── */

function formatTime12(timeStr: string): string {
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${min} ${suffix}`;
}

function getNextMeetingDate(dayOfWeek: number): Date {
  const now = new Date();
  const todayDow = now.getDay();
  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil < 0) daysUntil += 7;
  // If today is the day, check if meeting time has passed
  // We'll keep daysUntil = 0 for "today" regardless of time (show countdown separately)
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return next;
}

function getDaysUntilLabel(dayOfWeek: number, startTime: string): string {
  const now = new Date();
  const todayDow = now.getDay();

  if (todayDow === dayOfWeek) {
    return `Today at ${formatTime12(startTime)}`;
  }

  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil < 0) daysUntil += 7;

  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

function isToday(dayOfWeek: number): boolean {
  return new Date().getDay() === dayOfWeek;
}

function formatICSDate(date: Date, timeStr: string): string {
  const [hourStr, minStr] = timeStr.split(':');
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(parseInt(hourStr, 10)).padStart(2, '0');
  const mn = String(parseInt(minStr || '0', 10)).padStart(2, '0');
  return `${y}${m}${d}T${h}${mn}00`;
}

function downloadICS(schedule: StudySchedule, groupName: string) {
  const nextDate = getNextMeetingDate(schedule.day_of_week);
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TraceApp//Bible Study Scheduler//EN',
    'BEGIN:VEVENT',
    `SUMMARY:Bible Study - ${groupName}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[schedule.day_of_week]}`,
    `DTSTART:${formatICSDate(nextDate, schedule.start_time)}`,
    `DURATION:PT${schedule.duration_minutes}M`,
    schedule.location ? `LOCATION:${schedule.location}` : '',
    schedule.meeting_link ? `URL:${schedule.meeting_link}` : '',
    schedule.notes ? `DESCRIPTION:${schedule.notes.replace(/\n/g, '\\n')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bible-study-${groupName.toLowerCase().replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Shared styles ─────────────────────────────────────────── */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: 600,
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 14,
  color: '#fff',
  fontFamily: 'Georgia, serif',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ─── Main Component ────────────────────────────────────────── */

export default function StudyScheduler({ groupId, profileId, isLeader, accentColor }: Props) {
  const supabase = createClient();

  const [schedule, setSchedule] = useState<StudySchedule | null>(null);
  const [groupName, setGroupName] = useState('Bible Study');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formDay, setFormDay] = useState(4); // Thursday default
  const [formTime, setFormTime] = useState('19:00');
  const [formDuration, setFormDuration] = useState(60);
  const [formLocation, setFormLocation] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  /* ── Fetch schedule + group name ── */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: grp }, { data: sched }] = await Promise.all([
      supabase.from('trace_groups').select('name').eq('id', groupId).single(),
      supabase.from('trace_study_schedules').select('*').eq('group_id', groupId).maybeSingle(),
    ]);

    if (grp?.name) setGroupName(grp.name);
    setSchedule((sched as StudySchedule) ?? null);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Open form pre-filled ── */
  function openForm() {
    if (schedule) {
      setFormDay(schedule.day_of_week);
      setFormTime(schedule.start_time.slice(0, 5)); // HH:MM
      setFormDuration(schedule.duration_minutes);
      setFormLocation(schedule.location ?? '');
      setFormLink(schedule.meeting_link ?? '');
      setFormNotes(schedule.notes ?? '');
    } else {
      setFormDay(4);
      setFormTime('19:00');
      setFormDuration(60);
      setFormLocation('');
      setFormLink('');
      setFormNotes('');
    }
    setFormError('');
    setShowForm(true);
  }

  /* ── Save schedule ── */
  async function handleSave() {
    if (!formTime) { setFormError('Please set a meeting time.'); return; }
    setFormError('');
    setSaving(true);

    const payload = {
      group_id: groupId,
      day_of_week: formDay,
      start_time: formTime,
      duration_minutes: formDuration,
      location: formLocation.trim() || null,
      meeting_link: formLink.trim() || null,
      notes: formNotes.trim() || null,
      active: true,
      created_by: profileId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('trace_study_schedules')
      .upsert(payload, { onConflict: 'group_id' });

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setShowForm(false);
    fetchData();
  }

  /* ─── Render ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontFamily: 'Georgia, serif', fontSize: 14 }}>
        Loading schedule…
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── No schedule state ── */}
      {!schedule && (
        <div style={{ textAlign: 'center', padding: '56px 20px 24px' }}>
          {isLeader ? (
            <button
              onClick={openForm}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: `2px dashed ${accentColor}60`,
                borderRadius: 20,
                padding: '32px 24px',
                cursor: 'pointer',
                color: accentColor,
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: 0.3,
                transition: 'border-color 0.15s ease',
              }}
            >
              + Set Your Meeting Time
            </button>
          ) : (
            <>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📅</div>
              <div style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                color: 'rgba(255,255,255,0.35)',
              }}>
                No meeting time set yet
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Schedule card ── */}
      {schedule && (
        <>
          <div
            style={{
              background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
              border: `1px solid ${accentColor}30`,
              borderRadius: 22,
              padding: 24,
              marginBottom: 14,
              position: 'relative',
            }}
          >
            {/* Edit button */}
            {isLeader && (
              <button
                onClick={openForm}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '5px 12px',
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  letterSpacing: 0.4,
                }}
              >
                Edit
              </button>
            )}

            {/* Day name */}
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: 22,
              color: accentColor,
              marginBottom: 6,
              paddingRight: 60,
            }}>
              Every {DAY_NAMES[schedule.day_of_week]}
            </div>

            {/* Time + duration */}
            <div style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 500,
              fontSize: 16,
              color: '#fff',
              marginBottom: 14,
            }}>
              {formatTime12(schedule.start_time)} · {schedule.duration_minutes < 60
                ? `${schedule.duration_minutes} min`
                : schedule.duration_minutes === 60
                ? '1 hr'
                : schedule.duration_minutes === 90
                ? '1.5 hr'
                : `${schedule.duration_minutes / 60} hr`}
            </div>

            {/* Location */}
            {schedule.location && (
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                marginBottom: 6,
              }}>
                📍 {schedule.location}
              </div>
            )}

            {/* Meeting link */}
            {schedule.meeting_link && (
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                marginBottom: 6,
              }}>
                🔗{' '}
                <a
                  href={schedule.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: accentColor, textDecoration: 'none' }}
                >
                  {schedule.meeting_link.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              </div>
            )}

            {/* Notes */}
            {schedule.notes && (
              <div style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 10,
                marginBottom: 4,
                lineHeight: 1.5,
              }}>
                {schedule.notes}
              </div>
            )}

            {/* Next meeting badge */}
            <div style={{ marginTop: 16 }}>
              <span style={{
                display: 'inline-block',
                background: isToday(schedule.day_of_week)
                  ? accentColor
                  : `${accentColor}22`,
                color: isToday(schedule.day_of_week)
                  ? '#fff'
                  : accentColor,
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: 12,
                borderRadius: 99,
                padding: '5px 14px',
                letterSpacing: 0.3,
                border: isToday(schedule.day_of_week)
                  ? 'none'
                  : `1px solid ${accentColor}40`,
              }}>
                {isToday(schedule.day_of_week) ? '🎉 ' : ''}
                {getDaysUntilLabel(schedule.day_of_week, schedule.start_time)}
              </span>
            </div>

            {/* Weekly calendar strip */}
            <WeekStrip dayOfWeek={schedule.day_of_week} accentColor={accentColor} />
          </div>

          {/* Add to Calendar button */}
          <button
            onClick={() => downloadICS(schedule, groupName)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '13px',
              color: 'rgba(255,255,255,0.65)',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 0.3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>📆</span> Add to Calendar
          </button>
        </>
      )}

      {/* ── Edit / Set Schedule Bottom Sheet ── */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 1000,
            }}
          />

          {/* Sheet */}
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1001,
              background: '#060a08',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 44px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 40,
              height: 4,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 99,
              margin: '0 auto 22px',
            }} />

            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              margin: '0 0 24px',
              textAlign: 'center',
            }}>
              {schedule ? 'Edit Meeting Schedule' : 'Set Meeting Time'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Day of week */}
              <div>
                <label style={labelStyle}>Day of Week</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAY_SHORT.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setFormDay(i)}
                      style={{
                        borderRadius: 20,
                        padding: '8px 14px',
                        border: formDay === i ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        background: formDay === i ? accentColor : 'transparent',
                        color: formDay === i ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        letterSpacing: 0.2,
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label style={labelStyle}>Start Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* Duration */}
              <div>
                <label style={labelStyle}>Duration</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormDuration(opt.value)}
                      style={{
                        borderRadius: 20,
                        padding: '8px 14px',
                        border: formDuration === opt.value ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        background: formDuration === opt.value ? accentColor : 'transparent',
                        color: formDuration === opt.value ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        letterSpacing: 0.2,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location (optional)</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="📍 Where do you meet?"
                  style={inputStyle}
                />
              </div>

              {/* Meeting link */}
              <div>
                <label style={labelStyle}>Meeting Link (optional)</label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="🔗 Zoom, Google Meet link (optional)"
                  style={inputStyle}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anything members should know…"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 80,
                    fontFamily: 'Georgia, serif',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Error */}
              {formError && (
                <div style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
                  {formError}
                </div>
              )}

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 4,
                  background: accentColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  letterSpacing: 0.3,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {saving ? 'Saving…' : schedule ? 'Save Changes' : 'Set Schedule'}
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.35)',
                  border: 'none',
                  fontSize: 14,
                  fontFamily: 'Montserrat, sans-serif',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── WeekStrip sub-component ───────────────────────────────── */

function WeekStrip({ dayOfWeek, accentColor }: { dayOfWeek: number; accentColor: string }) {
  const todayDow = new Date().getDay();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 20,
      gap: 4,
    }}>
      {DAY_SHORT.map((d, i) => {
        const isMeetingDay = i === dayOfWeek;
        const isToday = i === todayDow;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: 9,
              color: isMeetingDay
                ? accentColor
                : 'rgba(255,255,255,0.25)',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              {d}
            </span>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: isMeetingDay
                ? accentColor
                : 'rgba(255,255,255,0.05)',
              border: isToday && !isMeetingDay
                ? '1px solid rgba(255,255,255,0.2)'
                : isMeetingDay
                ? 'none'
                : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isMeetingDay
                ? `0 0 10px ${accentColor}60`
                : 'none',
              transition: 'all 0.2s ease',
            }}>
              {isMeetingDay && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
