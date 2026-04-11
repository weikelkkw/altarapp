'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─────────────────────────────────────────────────── */

interface GroupEvent {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string; // ISO date string
  event_time: string | null; // HH:MM:SS
  created_by: string;
  created_at: string;
}

type RsvpStatus = 'going' | 'maybe' | 'not_going';

interface RsvpCounts {
  going: number;
  maybe: number;
  not_going: number;
}

interface Props {
  groupId: string;
  profileId: string;
  isLeader: boolean;
  accentColor: string;
}

/* ─── Helpers ───────────────────────────────────────────────── */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return MONTHS[d.getMonth()];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return String(d.getDate());
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${min} ${suffix}`;
}

function windowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

/* ─── Main Component ────────────────────────────────────────── */

export default function GroupEvents({ groupId, profileId, isLeader, accentColor }: Props) {
  const supabase = createClient();

  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // rsvpMap[eventId] = my status or null
  const [rsvpMap, setRsvpMap] = useState<Record<string, RsvpStatus | null>>({});
  // countsMap[eventId] = { going, maybe, not_going }
  const [countsMap, setCountsMap] = useState<Record<string, RsvpCounts>>({});

  // Create event form state
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  /* ── Fetch events ── */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = windowStart();
    const { data, error } = await supabase
      .from('trace_group_events')
      .select('*')
      .eq('group_id', groupId)
      .gte('event_date', start)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as GroupEvent[]);
      await fetchRsvps(data as GroupEvent[]);
    }
    setLoading(false);
  }, [groupId]);

  /* ── Fetch RSVPs ── */
  const fetchRsvps = useCallback(async (evs: GroupEvent[]) => {
    if (evs.length === 0) return;
    const ids = evs.map((e) => e.id);

    const { data: allRsvps } = await supabase
      .from('trace_event_rsvps')
      .select('event_id, profile_id, status')
      .in('event_id', ids);

    if (!allRsvps) return;

    // Build counts
    const counts: Record<string, RsvpCounts> = {};
    const mine: Record<string, RsvpStatus | null> = {};

    for (const ev of evs) {
      counts[ev.id] = { going: 0, maybe: 0, not_going: 0 };
      mine[ev.id] = null;
    }

    for (const row of allRsvps) {
      const c = counts[row.event_id];
      if (!c) continue;
      if (row.status === 'going') c.going++;
      else if (row.status === 'maybe') c.maybe++;
      else if (row.status === 'not_going') c.not_going++;

      if (row.profile_id === profileId) {
        mine[row.event_id] = row.status as RsvpStatus;
      }
    }

    setCountsMap(counts);
    setRsvpMap(mine);
  }, [profileId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* ── RSVP handler ── */
  const handleRsvp = async (eventId: string, status: RsvpStatus) => {
    const previous = rsvpMap[eventId];

    // Optimistic update
    setRsvpMap((prev) => ({ ...prev, [eventId]: status }));
    setCountsMap((prev) => {
      const c = { ...(prev[eventId] || { going: 0, maybe: 0, not_going: 0 }) };
      if (previous) c[previous] = Math.max(0, c[previous] - 1);
      c[status] = c[status] + 1;
      return { ...prev, [eventId]: c };
    });

    const { error } = await supabase.from('trace_event_rsvps').upsert(
      { event_id: eventId, profile_id: profileId, status },
      { onConflict: 'event_id,profile_id' }
    );

    if (error) {
      // Revert
      setRsvpMap((prev) => ({ ...prev, [eventId]: previous }));
      setCountsMap((prev) => {
        const c = { ...(prev[eventId] || { going: 0, maybe: 0, not_going: 0 }) };
        c[status] = Math.max(0, c[status] - 1);
        if (previous) c[previous] = c[previous] + 1;
        return { ...prev, [eventId]: c };
      });
    }
  };

  /* ── Create event ── */
  const handleCreate = async () => {
    if (!formTitle.trim()) { setFormError('Title is required.'); return; }
    if (!formDate) { setFormError('Date is required.'); return; }
    setFormError('');
    setSaving(true);

    const { error } = await supabase.from('trace_group_events').insert({
      group_id: groupId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      location: formLocation.trim() || null,
      event_date: formDate,
      event_time: formTime || null,
      created_by: profileId,
    });

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    // Reset form
    setFormTitle('');
    setFormDate('');
    setFormTime('');
    setFormLocation('');
    setFormDescription('');
    setShowForm(false);
    fetchEvents();
  };

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Header row */}
      {isLeader && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: accentColor,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '9px 18px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Montserrat, sans-serif',
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            + Add Event
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontFamily: 'Georgia, serif', fontSize: 14 }}>
          Loading events…
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            No upcoming events
          </div>
          {isLeader && (
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              Create the first event for your group.
            </div>
          )}
        </div>
      )}

      {/* Events list */}
      {!loading && events.map((event) => {
        const counts = countsMap[event.id] || { going: 0, maybe: 0, not_going: 0 };
        const myRsvp = rsvpMap[event.id] ?? null;

        return (
          <div
            key={event.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18,
              padding: '16px',
              marginBottom: 12,
            }}
          >
            {/* Top row: date block + event info */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* Date block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: 10,
                  color: accentColor,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}>
                  {formatMonth(event.event_date)}
                </span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 800,
                  fontSize: 28,
                  color: '#fff',
                  lineHeight: 1,
                  marginTop: 2,
                }}>
                  {formatDay(event.event_date)}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch', minHeight: 40 }} />

              {/* Event details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#fff',
                  marginBottom: 4,
                }}>
                  {event.title}
                </div>

                {event.description && (
                  <div style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.45)',
                    marginBottom: 6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {event.description}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 4 }}>
                  {event.location && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Georgia, serif' }}>
                      📍 {event.location}
                    </span>
                  )}
                  {event.event_time && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Georgia, serif' }}>
                      🕐 {formatTime(event.event_time)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RSVP row */}
            <div style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}>
              {/* Counts */}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Georgia, serif' }}>
                Going ({counts.going}) · Maybe ({counts.maybe}) · Can&apos;t ({counts.not_going})
              </span>

              {/* RSVP buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(
                  [
                    { status: 'going' as RsvpStatus, label: '✓ Going' },
                    { status: 'maybe' as RsvpStatus, label: '? Maybe' },
                    { status: 'not_going' as RsvpStatus, label: '✗ Can\'t' },
                  ] as { status: RsvpStatus; label: string }[]
                ).map(({ status, label }) => {
                  const selected = myRsvp === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleRsvp(event.id, status)}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'Montserrat, sans-serif',
                        padding: '5px 11px',
                        borderRadius: 20,
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.15)',
                        background: selected ? accentColor : 'transparent',
                        color: selected ? '#fff' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        letterSpacing: 0.2,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Create Event Bottom Sheet ── */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
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
              background: '#050908',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: '24px 20px 40px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            {/* Sheet handle */}
            <div style={{
              width: 40,
              height: 4,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 99,
              margin: '0 auto 20px',
            }} />

            <h3 style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              margin: '0 0 20px',
              textAlign: 'center',
            }}>
              New Event
            </h3>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Title */}
              <div>
                <label style={labelStyle}>Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Wednesday Bible Study"
                  style={inputStyle}
                />
              </div>

              {/* Date + Time row */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Time</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location (optional)</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Room 204, Church Annex"
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What should attendees know?"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 72,
                    fontFamily: 'Georgia, serif',
                  }}
                />
              </div>

              {/* Error */}
              {formError && (
                <div style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
                  {formError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
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
                {saving ? 'Creating…' : 'Create Event'}
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
