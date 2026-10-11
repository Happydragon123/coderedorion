'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { listingDetailsSchema, dietaryTagSchema, photoFileSchema, type ListingDraft, type Location } from '@/lib/contracts';
import { PhotoAttachment } from './photo-attachment';
import { message } from './common';
import styles from './organizer.module.css';
import { DateTimePicker } from '@/components/shared/date-time-picker';
import { chicagoToday, dateTimeToIso, EMPTY_DATE_TIME } from '@/lib/date-time';
const fieldLabels: Record<string, string> = { title: 'Title', description: 'Description', location_id: 'Campus location', portions_total: 'Number of portions', pickup_instructions: 'Pickup instructions', pickup_deadline: 'Pickup deadline', ingredients_notes: 'Ingredients notes', allergen_notes: 'Allergen notes', dietary_tags: 'Dietary information', photo_path: 'Food photo' };
const fieldIds: Record<string, string> = { location_id: 'location', pickup_deadline: 'pickup-deadline-date', photo_path: 'photo' };
const initial = { title: '', description: '', location_id: '', portions_total: '', pickup_instructions: '', pickup_deadline: '', ingredients_notes: '', allergen_notes: '' };
export function ListingForm() {
  const router = useRouter();
  const [pickupTime, setPickupTime] = useState({ ...EMPTY_DATE_TIME });
  const [fields, setFields] = useState(initial), [tags, setTags] = useState<string[]>([]), [locations, setLocations] = useState<Location[]>([]);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [stage, setStage] = useState(''), [notice, setNotice] = useState('');
  const busy = Boolean(stage);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function invalid(errors: Record<string, string>) {
    setFieldErrors(errors); setError('Please correct the highlighted fields.');
    const first = Object.keys(errors)[0];
    requestAnimationFrame(() => { document.getElementById(fieldIds[first] ?? first)?.focus(); });
  }
  const attachment = useRef(new PhotoAttachment());
  const publishing = useRef(false);
  const [photo, setPhoto] = useState<File>(), [preview, setPreview] = useState(''), [hint, setHint] = useState('');
  const [photoFeedback, setPhotoFeedback] = useState('');
  async function loadLocations() { setError(''); try { setLocations((await api.locations()).locations); setLoaded(true); } catch (e) { setError(message(e)); } }
  useEffect(() => { void api.locations().then(({ locations }) => { setLocations(locations); setLoaded(true); }).catch(e => setError(message(e))); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function applyDraft(draft: ListingDraft) {
    setPickupTime({ ...EMPTY_DATE_TIME });
    setFields(old => ({ ...old, ...Object.fromEntries(Object.keys(initial).map(key => { const value = draft[key as keyof ListingDraft]; return [key, value == null ? '' : String(value)]; })) }));
    setTags([]);
  }
  async function draft() {
    setStage('Generating editable draft…'); setError(''); setNotice(''); setFieldErrors({});
    try { const body = new FormData(); if (photo) body.set('photo', photo); if (hint.trim()) body.set('description', hint); const result = await api.listingDraft(body); applyDraft(result.draft); setNotice(`Draft applied. Review every field and confirm dietary information yourself. Missing: ${result.missing_fields.map(field => fieldLabels[field]).join(', ') || 'none'}.`); }
    catch (e) { setError(message(e)); } finally { setStage(''); }
  }
  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || publishing.current) return; setError(''); setNotice(''); setFieldErrors({});
    try {
      let pickupDeadline: string | undefined;
      let deadlineError = '';
      try { pickupDeadline = dateTimeToIso(pickupTime); }
      catch (cause) { deadlineError = cause instanceof Error ? cause.message : 'Choose a valid pickup date and time.'; }
      if (!pickupDeadline && !deadlineError) deadlineError = 'Choose a pickup date and time.';
      if (pickupDeadline && Date.parse(pickupDeadline) <= Date.now()) deadlineError = 'Pickup deadline must be in the future.';
      const parsed = listingDetailsSchema.safeParse({ ...fields, pickup_deadline: pickupDeadline, portions_total: Number(fields.portions_total), dietary_tags: tags, ingredients_notes: fields.ingredients_notes || null, allergen_notes: fields.allergen_notes || null });
      const errors: Record<string, string> = {};
      if (!parsed.success) for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        errors[field] = `${fieldLabels[field] ?? 'Field'}: ${issue.code === 'too_small' || issue.code === 'invalid_format' ? 'Enter a valid value.' : issue.message}`;
      }
      if (deadlineError) errors.pickup_deadline = deadlineError;
      const photoError = attachment.current.validationMessage();
      if (photoError) errors.photo_path = photoError;
      if (Object.keys(errors).length) {
        const order = ['title', 'description', 'portions_total', 'location_id', 'pickup_instructions', 'pickup_deadline', 'dietary_tags', 'ingredients_notes', 'allergen_notes', 'photo_path'];
        invalid(Object.fromEntries(order.filter(field => errors[field]).map(field => [field, errors[field]]))); return;
      }
      if (!parsed.success) return;
      publishing.current = true;
      const { listing } = await attachment.current.publish(parsed.data, {
        upload: api.uploadPhoto, create: api.createListing,
        stage: value => { setStage(value); setPhotoFeedback(value); },
      });
      router.push(`/manage/${listing.id}`);
    } catch (e) { setError(message(e)); setPhotoFeedback(attachment.current.path ? 'Photo uploaded. Publishing failed; check Manage for a possible completed listing before retrying. A retry reuses this photo.' : 'Photo upload failed. Your details are saved in this form. Publish again to retry, or choose another photo.'); } finally { publishing.current = false; setStage(''); }
  }
  return <div className={styles.shareLayout}>
    <form className={styles.form} onSubmit={publish} noValidate>
      <fieldset disabled={busy} className={styles.formBody}>
        <section className={styles.formSection} aria-labelledby="food-details-heading">
          <span className="section-kicker">01 · The food</span>
          <h2 id="food-details-heading">What are you sharing?</h2>
          <label htmlFor="title">Title</label>
          <input id="title" aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} required maxLength={160} placeholder="For example, leftover veggie sandwiches" value={fields.title} onChange={e => setFields({ ...fields, title: e.target.value })}/>
          {fieldErrors.title && <p id="title-error" className="notice">{fieldErrors.title}</p>}
          <label htmlFor="description">Description</label>
          <textarea id="description" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-error" : undefined} required maxLength={4000} placeholder="Tell students what’s available." value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })}/>
          {fieldErrors.description && <p id="description-error" className="notice">{fieldErrors.description}</p>}
          <label htmlFor="portions_total">Number of portions</label>
          <input className={styles.portions} id="portions_total" aria-invalid={Boolean(fieldErrors.portions_total)} aria-describedby={fieldErrors.portions_total ? "portions_total-error" : undefined} type="number" min={1} max={10000} required value={fields.portions_total} onChange={e => setFields({ ...fields, portions_total: e.target.value })}/>
          {fieldErrors.portions_total && <p id="portions_total-error" className="notice">{fieldErrors.portions_total}</p>}
        </section>
        <section className={styles.formSection} aria-labelledby="pickup-details-heading">
          <span className="section-kicker">02 · The pickup</span>
          <h2 id="pickup-details-heading">Where and when?</h2>
          <label htmlFor="location">Campus location</label>
          <select id="location" aria-invalid={Boolean(fieldErrors.location_id)} aria-describedby={fieldErrors.location_id ? "location-error" : undefined} required value={fields.location_id} onChange={e => setFields({ ...fields, location_id: e.target.value })}>
            <option value="">Choose a campus landmark</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          {fieldErrors.location_id && <p id="location-error" className="notice">{fieldErrors.location_id}</p>}
          {!loaded && <button type="button" className="button-secondary" onClick={() => void loadLocations()}>Reload locations</button>}
          {loaded && !locations.length && <p className="notice">No verified campus landmarks are configured. Ask the integration owner to set up locations before posting.</p>}
          <label htmlFor="pickup_instructions">Pickup instructions</label>
          <textarea id="pickup_instructions" aria-invalid={Boolean(fieldErrors.pickup_instructions)} aria-describedby={fieldErrors.pickup_instructions ? "pickup_instructions-error" : undefined} required maxLength={1000} placeholder="For example, meet at the front desk on the first floor." value={fields.pickup_instructions} onChange={e => setFields({ ...fields, pickup_instructions: e.target.value })}/>
          {fieldErrors.pickup_instructions && <p id="pickup_instructions-error" className="notice">{fieldErrors.pickup_instructions}</p>}
          <div role="group" aria-describedby={fieldErrors.pickup_deadline ? "pickup-deadline-error" : undefined}><DateTimePicker id="pickup-deadline" label="Pickup deadline" value={pickupTime} onChange={setPickupTime} minDate={chicagoToday()} required/></div>
          {fieldErrors.pickup_deadline && <p id="pickup-deadline-error" className="notice" role="alert">{fieldErrors.pickup_deadline}</p>}
          <p className={styles.help}>Choose a future deadline. Times use America/Chicago.</p>
        </section>
        <section className={styles.formSection} aria-labelledby="dietary-heading">
          <span className="section-kicker">03 · Helpful details</span>
          <h2 id="dietary-heading">Dietary information</h2>
          <p className={styles.help}>Only select tags you can confirm. Leave them unchecked if you’re unsure.</p>
          <div className={styles.tags}>{dietaryTagSchema.options.map(tag => <label className={styles.tag} key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={e => setTags(e.target.checked ? [...tags, tag] : tags.filter(t => t !== tag))}/>{tag.replace('_', ' ')}</label>)}</div>
          <details className={styles.notes}><summary>Add ingredient or allergen notes <span>Optional</span></summary>
            <label htmlFor="ingredients_notes">Ingredients notes</label><textarea id="ingredients_notes" aria-invalid={Boolean(fieldErrors.ingredients_notes)} aria-describedby={fieldErrors.ingredients_notes ? "ingredients_notes-error" : undefined} maxLength={2000} value={fields.ingredients_notes} onChange={e => setFields({ ...fields, ingredients_notes: e.target.value })}/>
          {fieldErrors.ingredients_notes && <p id="ingredients_notes-error" className="notice">{fieldErrors.ingredients_notes}</p>}
            <label htmlFor="allergen_notes">Allergen notes</label><textarea id="allergen_notes" aria-invalid={Boolean(fieldErrors.allergen_notes)} aria-describedby={fieldErrors.allergen_notes ? "allergen_notes-error" : undefined} maxLength={2000} value={fields.allergen_notes} onChange={e => setFields({ ...fields, allergen_notes: e.target.value })}/>
          {fieldErrors.allergen_notes && <p id="allergen_notes-error" className="notice">{fieldErrors.allergen_notes}</p>}
          </details>
        </section>
        <div className={styles.publish}><p>Review your details before sharing.</p><button disabled={!loaded || !locations.length}>Publish listing</button></div>
      </fieldset>
      {busy && <p className="loading-state" role="status">{stage}</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    </form>
    <aside className={styles.assistancePanel}>
      <span className="section-kicker">A little help</span><h2>Start with a photo</h2>
      <p>A food photo is required to publish. Gemini drafting is optional.</p>
      <label htmlFor="photo">Food photo <span className={styles.optional}>Required</span></label>
      <input id="photo" type="file" required aria-invalid={Boolean(fieldErrors.photo_path)} aria-describedby={`photo-help${fieldErrors.photo_path ? " photo-error" : ""}${photoFeedback ? " photo-feedback" : ""}`} accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; attachment.current.select(file); setPhotoFeedback(''); setFieldErrors(old => ({ ...old, photo_path: '' })); setPhoto(undefined); setPreview(''); if (file && !photoFileSchema.safeParse(file).success) { attachment.current.select(); setFieldErrors(old => ({ ...old, photo_path: 'Choose a nonempty JPEG, PNG or WebP image up to 5 MiB.' })); e.target.value = ''; } else { setPhoto(file); setPreview(file ? URL.createObjectURL(file) : ''); setError(''); } }}/>
      <p id="photo-help" className={styles.help}>JPEG, PNG or WebP · Up to 5 MiB. Uploaded and validated when you publish.</p>
      {fieldErrors.photo_path && <p id="photo-error" className="notice" role="alert">{fieldErrors.photo_path}</p>}
      <p id="photo-feedback" role="status">{photoFeedback}</p>
      {preview && <Image unoptimized width={600} height={300} className={styles.preview} src={preview} alt="Selected food photo preview"/>}
      <details className={styles.notes}><summary>Draft with Gemini</summary>
        <label htmlFor="ai-description">What’s in the photo?</label><textarea className={styles.assistance} id="ai-description" maxLength={10000} value={hint} disabled={busy} placeholder="Describe the food you’re sharing." onChange={e => setHint(e.target.value)}/>
        <p className={styles.help}>Your photo and description are sent to Gemini. A draft replaces form fields; review every detail. Dietary and safety information stays unconfirmed.</p>
        <button className="button-secondary" type="button" onClick={() => void draft()} disabled={busy || !(photo || hint.trim())}>Generate editable draft</button>
      </details>
      <div className={styles.tip}><h3>Share with care</h3><p>Give clear pickup instructions, confirm dietary details, and keep existing pickups available until the deadline.</p></div>
    </aside>
  </div>;
}
