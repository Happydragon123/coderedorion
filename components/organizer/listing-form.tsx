'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { createListingSchema, dietaryTagSchema, photoFileSchema, type ListingDraft, type Location } from '@/lib/contracts';
import { message } from './common';
import styles from './organizer.module.css';
const initial = { title: '', description: '', location_id: '', portions_total: '', pickup_instructions: '', pickup_deadline: '', ingredients_notes: '', allergen_notes: '' };
export function ListingForm() {
  const router = useRouter();
  const [fields, setFields] = useState(initial), [tags, setTags] = useState<string[]>([]), [locations, setLocations] = useState<Location[]>([]);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [photo, setPhoto] = useState<File>(), [preview, setPreview] = useState(''), [photoPath, setPhotoPath] = useState<string | null>(null), [hint, setHint] = useState('');
  async function loadLocations() { setError(''); try { setLocations((await api.locations()).locations); setLoaded(true); } catch (e) { setError(message(e)); } }
  useEffect(() => { void api.locations().then(({ locations }) => { setLocations(locations); setLoaded(true); }).catch(e => setError(message(e))); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function applyDraft(draft: ListingDraft) {
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
      const parsed = createListingSchema.safeParse({ ...fields, portions_total: Number(fields.portions_total), photo_path: photoPath, dietary_tags: tags, ingredients_notes: fields.ingredients_notes || null, allergen_notes: fields.allergen_notes || null });
      if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' · ')); return; }
      if (Date.parse(parsed.data.pickup_deadline) <= Date.now()) { setError('Pickup deadline must be in the future.'); return; }
      let path = photoPath;
      if (photo && !path) { const body = new FormData(); body.set('photo', photo); path = (await api.uploadPhoto(body)).photo_path; setPhotoPath(path); }
      const { listing } = await api.createListing({ ...parsed.data, photo_path: path }); router.push(`/manage/${listing.id}`);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <><section className="panel"><h2>Optional photo assistance</h2><label htmlFor="photo">Photo (JPEG, PNG or WebP, up to 5 MiB)</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; setPhotoPath(null); setPhoto(undefined); setPreview(''); if (file && !photoFileSchema.safeParse(file).success) { setError('Choose a JPEG, PNG or WebP image up to 5 MiB.'); e.target.value = ''; } else { setPhoto(file); setPreview(file ? URL.createObjectURL(file) : ''); setError(''); } }}/>{preview && <Image unoptimized width={600} height={300} className={styles.preview} src={preview} alt="Selected food photo preview"/>}<label htmlFor="ai-description">Description for Gemini</label><textarea className={styles.assistance} id="ai-description" maxLength={10000} value={hint} disabled={busy} onChange={e => setHint(e.target.value)}/><p>Generating a draft sends this photo and description to Gemini and replaces form fields. It does not publish. Unknown safety and dietary details stay unconfirmed.</p><button type="button" onClick={() => void draft()} disabled={busy || !(photo || hint.trim())}>Generate editable draft</button></section><form className={styles.form} onSubmit={publish}><fieldset disabled={busy}><legend>Listing details</legend><label htmlFor="location">Campus location</label><select id="location" required value={fields.location_id} onChange={e => setFields({ ...fields, location_id: e.target.value })}><option value="">Choose a verified landmark</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select>{!loaded && <button type="button" onClick={() => void loadLocations()}>Reload locations</button>}{loaded && !locations.length && <p className="notice">No verified campus landmarks are configured. Ask the integration owner to set up locations before posting.</p>}{(['title','description','portions_total','pickup_instructions','pickup_deadline','ingredients_notes','allergen_notes'] as const).map(key => <div key={key}><label htmlFor={key}>{({ title:'Title',description:'Description',portions_total:'Number of portions',pickup_instructions:'Pickup instructions',pickup_deadline:'Pickup deadline (include UTC offset)',ingredients_notes:'Ingredients notes (optional)',allergen_notes:'Allergen notes (optional)' })[key]}</label>{['description','pickup_instructions','ingredients_notes','allergen_notes'].includes(key) ? <textarea id={key} required={key === 'description' || key === 'pickup_instructions'} maxLength={key === 'description' ? 4000 : key === 'pickup_instructions' ? 1000 : 2000} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })}/> : <input id={key} type={key === 'portions_total' ? 'number' : 'text'} min={key === 'portions_total' ? 1 : undefined} max={key === 'portions_total' ? 10000 : undefined} maxLength={key === 'title' ? 160 : undefined} placeholder={key === 'pickup_deadline' ? '2026-10-10T18:00:00-05:00' : undefined} required value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })}/>}</div>)}<p>Use an ISO timestamp with an explicit offset; dashboard times display in America/Chicago.</p><fieldset><legend>Dietary tags you confirm (leave unchecked if unknown)</legend>{dietaryTagSchema.options.map(tag => <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={e => setTags(e.target.checked ? [...tags, tag] : tags.filter(t => t !== tag))}/>{tag.replace('_',' ')}</label>)}</fieldset><button disabled={!loaded || !locations.length}>Publish listing</button></fieldset></form>{busy && <p role="status">Working…</p>}{error && <p className="notice" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</>;
}
