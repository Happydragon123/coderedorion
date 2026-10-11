'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { createListingSchema, dietaryTagSchema, photoFileSchema, type ListingDraft, type Location } from '@/lib/contracts';
import { message } from './common';
import styles from './organizer.module.css';
import { DateTimePicker } from '@/components/shared/date-time-picker';
import { chicagoToday, dateTimeToIso, EMPTY_DATE_TIME } from '@/lib/date-time';
const initial = { title: '', description: '', location_id: '', portions_total: '', pickup_instructions: '', pickup_deadline: '', ingredients_notes: '', allergen_notes: '' };
export function ListingForm() {
  const router = useRouter();
  const [pickupTime, setPickupTime] = useState({ ...EMPTY_DATE_TIME });
  const [fields, setFields] = useState(initial), [tags, setTags] = useState<string[]>([]), [locations, setLocations] = useState<Location[]>([]);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [photo, setPhoto] = useState<File>(), [preview, setPreview] = useState(''), [photoPath, setPhotoPath] = useState<string | null>(null), [hint, setHint] = useState('');
  async function loadLocations() { setError(''); try { setLocations((await api.locations()).locations); setLoaded(true); } catch (e) { setError(message(e)); } }
  useEffect(() => { void api.locations().then(({ locations }) => { setLocations(locations); setLoaded(true); }).catch(e => setError(message(e))); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function applyDraft(draft: ListingDraft) {
    setPickupTime({ ...EMPTY_DATE_TIME });
    setFields(old => ({ ...old, ...Object.fromEntries(Object.keys(initial).map(key => { const value = draft[key as keyof ListingDraft]; return [key, value == null ? '' : String(value)]; })) }));
    setTags([]);
  }
  async function draft() {
    setBusy(true); setError(''); setNotice('');
    try { const body = new FormData(); if (photo) body.set('photo', photo); if (hint.trim()) body.set('description', hint); const result = await api.listingDraft(body); applyDraft(result.draft); setNotice(`Draft applied. Review every field and confirm dietary information yourself. Missing: ${result.missing_fields.join(', ') || 'none'}.`); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      let pickupDeadline: string | undefined;
      try { pickupDeadline = dateTimeToIso(pickupTime); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Choose a valid pickup date and time.'); return; }
      if (!pickupDeadline) { setError('Choose a pickup date and time.'); return; }
      const parsed = createListingSchema.safeParse({ ...fields, pickup_deadline: pickupDeadline, portions_total: Number(fields.portions_total), photo_path: photoPath, dietary_tags: tags, ingredients_notes: fields.ingredients_notes || null, allergen_notes: fields.allergen_notes || null });
      if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' · ')); return; }
      if (Date.parse(parsed.data.pickup_deadline) <= Date.now()) { setError('Pickup deadline must be in the future.'); return; }
      let path = photoPath;
      if (photo && !path) { const body = new FormData(); body.set('photo', photo); path = (await api.uploadPhoto(body)).photo_path; setPhotoPath(path); }
      const { listing } = await api.createListing({ ...parsed.data, photo_path: path }); router.push(`/manage/${listing.id}`);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <div className={styles.shareLayout}>
    <form className={styles.form} onSubmit={publish}>
      <fieldset disabled={busy} className={styles.formBody}>
        <section className={styles.formSection} aria-labelledby="food-details-heading">
          <span className="section-kicker">01 · The food</span>
          <h2 id="food-details-heading">What are you sharing?</h2>
          <label htmlFor="title">Title</label>
          <input id="title" required maxLength={160} placeholder="For example, leftover veggie sandwiches" value={fields.title} onChange={e => setFields({ ...fields, title: e.target.value })}/>
          <label htmlFor="description">Description</label>
          <textarea id="description" required maxLength={4000} placeholder="Tell students what’s available." value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })}/>
          <label htmlFor="portions_total">Number of portions</label>
          <input className={styles.portions} id="portions_total" type="number" min={1} max={10000} required value={fields.portions_total} onChange={e => setFields({ ...fields, portions_total: e.target.value })}/>
        </section>
        <section className={styles.formSection} aria-labelledby="pickup-details-heading">
          <span className="section-kicker">02 · The pickup</span>
          <h2 id="pickup-details-heading">Where and when?</h2>
          <label htmlFor="location">Campus location</label>
          <select id="location" required value={fields.location_id} onChange={e => setFields({ ...fields, location_id: e.target.value })}>
            <option value="">Choose a campus landmark</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          {!loaded && <button type="button" className="button-secondary" onClick={() => void loadLocations()}>Reload locations</button>}
          {loaded && !locations.length && <p className="notice">No verified campus landmarks are configured. Ask the integration owner to set up locations before posting.</p>}
          <label htmlFor="pickup_instructions">Pickup instructions</label>
          <textarea id="pickup_instructions" required maxLength={1000} placeholder="For example, meet at the front desk on the first floor." value={fields.pickup_instructions} onChange={e => setFields({ ...fields, pickup_instructions: e.target.value })}/>
          <DateTimePicker id="pickup-deadline" label="Pickup deadline" value={pickupTime} onChange={setPickupTime} minDate={chicagoToday()} required/>
          <p className={styles.help}>Choose a future deadline. Times use America/Chicago.</p>
        </section>
        <section className={styles.formSection} aria-labelledby="dietary-heading">
          <span className="section-kicker">03 · Helpful details</span>
          <h2 id="dietary-heading">Dietary information</h2>
          <p className={styles.help}>Only select tags you can confirm. Leave them unchecked if you’re unsure.</p>
          <div className={styles.tags}>{dietaryTagSchema.options.map(tag => <label className={styles.tag} key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={e => setTags(e.target.checked ? [...tags, tag] : tags.filter(t => t !== tag))}/>{tag.replace('_', ' ')}</label>)}</div>
          <details className={styles.notes}><summary>Add ingredient or allergen notes <span>Optional</span></summary>
            <label htmlFor="ingredients_notes">Ingredients notes</label><textarea id="ingredients_notes" maxLength={2000} value={fields.ingredients_notes} onChange={e => setFields({ ...fields, ingredients_notes: e.target.value })}/>
            <label htmlFor="allergen_notes">Allergen notes</label><textarea id="allergen_notes" maxLength={2000} value={fields.allergen_notes} onChange={e => setFields({ ...fields, allergen_notes: e.target.value })}/>
          </details>
        </section>
        <div className={styles.publish}><p>Review your details before sharing.</p><button disabled={!loaded || !locations.length}>Publish listing</button></div>
      </fieldset>
      {busy && <p role="status">Working…</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    </form>
    <aside className={styles.assistancePanel}>
      <span className="section-kicker">A little help</span><h2>Start with a photo</h2>
      <p>Attach a photo, or let Gemini help write an editable draft.</p>
      <label htmlFor="photo">Food photo <span className={styles.optional}>Optional</span></label>
      <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; setPhotoPath(null); setPhoto(undefined); setPreview(''); if (file && !photoFileSchema.safeParse(file).success) { setError('Choose a JPEG, PNG or WebP image up to 5 MiB.'); e.target.value = ''; } else { setPhoto(file); setPreview(file ? URL.createObjectURL(file) : ''); setError(''); } }}/>
      <p className={styles.help}>JPEG, PNG or WebP · Up to 5 MiB</p>
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
