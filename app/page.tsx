import Image from 'next/image';
import Link from 'next/link';
import foodPhoto from '@/catered_food.webp';
import { supabaseConfig, missingSupabaseMessage } from '@/lib/supabase/config';

export default function Home() {
  return <>
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy"><p className="eyebrow">Good food. Shared locally.</p><h1 id="home-title">Another portion.<br/><em>Another possibility.</em></h1><p className="hero-description">Connect surplus food with someone nearby. Share what you have, find a campus pickup, and make good food go further.</p><div className="hero-actions"><Link className="button" href="/listings">Find food nearby <span aria-hidden="true">↗</span></Link><Link className="hero-link" href="/share">Share surplus food <span aria-hidden="true">→</span></Link></div><p className="hero-note">Shared on campus. Reserved one portion at a time.</p></div>
      <figure className="hero-photo"><Image src={foodPhoto} alt="Trays of catered food set out for sharing" priority sizes="(max-width: 760px) 100vw, 45vw"/><figcaption><span className="photo-caption-label">A place at the table</span>Good food deserves to be shared.</figcaption></figure>
    </section>
    {!supabaseConfig() && <p className="notice">{missingSupabaseMessage}</p>}
    <section className="home-how" aria-labelledby="how-title"><div className="home-how-heading"><p className="eyebrow">From extra to enjoyed</p><h2 id="how-title">A small act.<br/>A good next step.</h2><p>Make sharing part of campus life.</p></div><div className="home-steps">
      <article className="home-step"><span className="step-number">01</span><div><h3><Link href="/share">Give good food a next stop. <span aria-hidden="true">↗</span></Link></h3><p>Post available portions and pickup details. Optional photo assistance helps you get started.</p></div></article>
      <article className="home-step"><span className="step-number">02</span><div><h3><Link href="/listings">Find a little something nearby. <span aria-hidden="true">↗</span></Link></h3><p>Browse campus food, reserve one portion, and keep your pickup details in one place.</p></div></article>
      <article className="home-step"><span className="step-number">03</span><div><h3><Link href="/impact">Small pickups add up. <span aria-hidden="true">↗</span></Link></h3><p>See confirmed collections across campus. Every portion counted has been handed over.</p></div></article>
    </div></section>
  </>;
}
