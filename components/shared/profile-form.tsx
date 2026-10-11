'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api-client';
import { updateProfileSchema, type Profile } from '@/lib/contracts';
import { SharerIdentity } from './sharer-identity';

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saved, setSaved] = useState(profile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const parsed = updateProfileSchema.safeParse({ display_name: fields.get('display_name'), organization_name: fields.get('organization_name') });
    setError(''); setMessage('');
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true);
    try {
      const result = await api.updateProfile(parsed.data);
      setSaved(result.profile);
      (form.elements.namedItem('display_name') as HTMLInputElement).value = result.profile.display_name;
      (form.elements.namedItem('organization_name') as HTMLInputElement).value = result.profile.organization_name || '';
      setMessage('Sharing identity saved. Your food listings use this name and organization.');
      router.refresh();
    } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'Unable to save your profile. Please try again.'); }
    finally { setPending(false); }
  }

  return <section className="profile-section" aria-labelledby="sharing-identity-title">
    <h2 id="sharing-identity-title">Your sharing identity</h2>
    <p className="muted" id="identity-help">Your display name and optional organization appear on your food listings. Your email stays private. Anyone with an account can share and pick up food.</p>
    <SharerIdentity identity={saved} label="Posting as"/>
    <form onSubmit={submit} aria-describedby="identity-help" aria-busy={pending}>
      <label htmlFor="profile-name">Display name</label>
      <input id="profile-name" name="display_name" autoComplete="nickname" defaultValue={profile.display_name} required maxLength={120} disabled={pending}/>
      <label htmlFor="profile-organization">Organization <span className="muted">(optional)</span></label>
      <input id="profile-organization" name="organization_name" autoComplete="organization" defaultValue={profile.organization_name || ''} maxLength={120} disabled={pending}/>
      <button disabled={pending}>{pending ? 'Saving identity…' : 'Save sharing identity'}</button>
      {error && <p className="notice" role="alert">{error}</p>}
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </section>;
}
