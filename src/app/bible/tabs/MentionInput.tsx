'use client';

import { useState, useRef, useEffect } from 'react';

interface GroupMember {
  userId: string;
  name: string;
  color: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  members: GroupMember[];
  accentColor: string;
  placeholder?: string;
  disabled?: boolean;
}

const getMentionQuery = (text: string, cursorPos: number): string | null => {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
};

export function renderMessageWithMentions(
  text: string,
  currentUserName: string,
  accentColor: string
): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1);
      const isCurrentUser = name === currentUserName;
      return (
        <span
          key={i}
          style={{
            background: isCurrentUser ? accentColor + '33' : accentColor + '22',
            color: accentColor,
            borderRadius: 4,
            padding: '0 3px',
            fontWeight: 700,
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function MentionInput({
  value,
  onChange,
  onSend,
  members,
  accentColor,
  placeholder = 'Message...',
  disabled = false,
}: Props) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 96) + 'px';
    }
  }, [value]);

  const filteredMembers =
    mentionQuery !== null
      ? members
          .filter((m) =>
            m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    const cursor = e.target.selectionStart ?? newValue.length;
    const query = getMentionQuery(newValue, cursor);
    setMentionQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setMentionQuery(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
        setMentionQuery(null);
      }
    }
  };

  const handleSelectMember = (member: GroupMember) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${member.name} `);
    onChange(replaced + after);
    setMentionQuery(null);
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursor = replaced.length;
        textareaRef.current.selectionStart = newCursor;
        textareaRef.current.selectionEnd = newCursor;
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 48,
            marginBottom: 8,
            background: 'rgba(8,12,10,0.97)',
            border: `1px solid ${accentColor}22`,
            borderRadius: 16,
            zIndex: 70,
            overflow: 'hidden',
          }}
        >
          {filteredMembers.map((member) => (
            <button
              key={member.userId}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectMember(member);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: member.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: '#fff', fontSize: 14 }}>{member.name}</span>
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          borderRadius: 16,
          padding: '12px 16px',
          fontSize: 14,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${accentColor}18`,
          color: '#fff',
          outline: 'none',
          lineHeight: '1.4',
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
      />

      <button
        onClick={() => {
          if (value.trim() && !disabled) {
            onSend();
            setMentionQuery(null);
          }
        }}
        disabled={disabled || !value.trim()}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: '#fff',
          border: 'none',
          cursor: disabled || !value.trim() ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: disabled || !value.trim() ? 0.5 : 1,
        }}
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
