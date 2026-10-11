'use client';
import { EMPTY_DATE_TIME, type DateTimeSelection } from '@/lib/date-time';
export type DateTimePickerProps = {
  id: string; label: string; value: DateTimeSelection;
  onChange: (selection: DateTimeSelection) => void;
  minDate?: string; clearable?: boolean; disabled?: boolean; required?: boolean;
};
export function DateTimePicker({ id, label, value, onChange, minDate, clearable = false, disabled = false, required = false }: DateTimePickerProps) {
  const update = (key: keyof DateTimeSelection, next: string) => onChange({ ...value, [key]: next });
  return <fieldset disabled={disabled} style={{ minWidth: 0, margin: '1rem 0', padding: '.75rem', border: '1px solid var(--line)', borderRadius: 8 }}>
    <legend>{label} (America/Chicago)</legend>
    <label htmlFor={`${id}-date`}>Date</label>
    <input id={`${id}-date`} type="date" required={required} min={minDate} value={value.date} onChange={event => update('date', event.target.value)} style={{ minWidth: 0, maxWidth: '100%' }}/>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
      <div><label htmlFor={`${id}-hour`}>Hour</label><select id={`${id}-hour`} required={required} value={value.hour} onChange={event => update('hour', event.target.value)}><option value="">Hour</option>{Array.from({ length: 12 }, (_, i) => String(i + 1)).map(hour => <option key={hour} value={hour}>{hour}</option>)}</select></div>
      <div><label htmlFor={`${id}-minute`}>Minute</label><select id={`${id}-minute`} required={required} value={value.minute} onChange={event => update('minute', event.target.value)}><option value="">Minute</option>{Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(minute => <option key={minute} value={minute}>{minute}</option>)}</select></div>
      <div><label htmlFor={`${id}-period`}>AM / PM</label><select id={`${id}-period`} required={required} value={value.period} onChange={event => update('period', event.target.value)}><option value="">AM / PM</option><option value="AM">AM</option><option value="PM">PM</option></select></div>
    </div>
    {clearable && <button type="button" onClick={() => onChange({ ...EMPTY_DATE_TIME })}>Clear {label.toLowerCase()}</button>}
  </fieldset>;
}
