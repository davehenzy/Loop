import { useEffect, useRef, useState } from 'react';

const PHOTOS = ['car', 'wine', 'bike', 'fabric'] as const;
const LOOPS = ['crane', 'hound', 'vinyl'] as const;
const TILTS = [-8, 5, 10, -4, 7, -6] as const;

export default function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const briefDialogRef = useRef<HTMLDialogElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const seqRef = useRef(0);
  const lastRef = useRef<[number, number] | null>(null);
  const atRef = useRef(-Infinity);
  const autoRef = useRef<number[]>([]);
  const restRef = useRef<number | undefined>(undefined);
  const preloadedRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const hero = heroRef.current;
    const layer = trailRef.current;
    if (!hero || !layer) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const warm = () => {
      if (preloadedRef.current.length || reduced.matches) return;
      preloadedRef.current = [
        ...PHOTOS.map((n) => `${n}.webp`),
        ...LOOPS.map((n) => `${n}.gif`),
      ].map((file) => {
        const img = new Image();
        img.src = `/assets/${file}`;
        return img;
      });
    };

    const stopAuto = () => {
      for (const timer of autoRef.current) {
        window.clearTimeout(timer);
      }
      autoRef.current = [];
    };

    const stamp = (x: number, y: number) => {
      const n = seqRef.current++;
      const isLoop = n % 2 === 1;
      const pool = isLoop ? LOOPS : PHOTOS;
      const name = pool[Math.floor(n / 2) % pool.length];

      const el = document.createElement('div');
      const img = new Image();
      const angle = TILTS[n % TILTS.length];

      el.className = 'stamp';
      el.setAttribute('aria-hidden', 'true');
      img.alt = '';
      img.src = `/assets/${name}${isLoop && !reduced.matches ? '.gif' : '.webp'}`;
      el.append(img);

      while (layer.childElementCount >= 7) {
        layer.firstElementChild?.remove();
      }
      layer.append(el);

      const base = `translate(${Math.round(x - el.offsetWidth / 2)}px,${Math.round(
        y - el.offsetHeight / 2
      )}px) rotate(${angle}deg)`;
      el.style.transform = base;

      hero.classList.add('active-trail');
      if (restRef.current !== undefined) {
        window.clearTimeout(restRef.current);
      }

      const life = reduced.matches ? 850 : 1330;
      if (!reduced.matches) {
        el.animate(
          [
            { transform: `${base} scale(.79)`, opacity: 0.2 },
            { transform: `${base} scale(1)`, opacity: 1, offset: 0.16 },
            { transform: `${base} scale(1)`, opacity: 1, offset: 0.73 },
            { transform: `${base} translateY(12px) scale(.95)`, opacity: 0 },
          ],
          { duration: life, easing: 'linear', fill: 'forwards' }
        );
      }

      window.setTimeout(() => el.remove(), life);
      restRef.current = window.setTimeout(() => {
        hero.classList.remove('active-trail');
      }, life + 120);
    };

    const point = (e: PointerEvent, force = false) => {
      const target = e.target as Element | null;
      if (target?.closest('a,button,nav') || (!force && reduced.matches)) return;
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const t = performance.now();

      if (
        !force &&
        (t - atRef.current < 62 ||
          (lastRef.current &&
            Math.hypot(x - lastRef.current[0], y - lastRef.current[1]) <
              Math.max(54, Math.min(96, r.width * 0.072))))
      ) {
        return;
      }

      stopAuto();
      warm();
      lastRef.current = [x, y];
      atRef.current = t;
      stamp(x, y);
    };

    const onPointerEnter = () => warm();
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') point(e);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') point(e, true);
    };
    const onPointerLeave = () => {
      lastRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAuto();
        layer.replaceChildren();
        hero.classList.remove('active-trail');
      }
    };

    hero.addEventListener('pointerenter', onPointerEnter, { once: true });
    hero.addEventListener('pointermove', onPointerMove);
    hero.addEventListener('pointerdown', onPointerDown);
    hero.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Store play function on element dataset/handler via ref-like closure
    (hero as HTMLDivElement & { __playTrail?: () => void }).__playTrail = () => {
      stopAuto();
      warm();
      const r = hero.getBoundingClientRect();
      const poses = reduced.matches
        ? [[0.53, 0.49]]
        : [
            [0.3, 0.5],
            [0.42, 0.43],
            [0.55, 0.4],
            [0.66, 0.45],
            [0.73, 0.53],
            [0.63, 0.58],
            [0.51, 0.55],
            [0.42, 0.49],
          ];
      poses.forEach(([px, py], i) => {
        autoRef.current.push(
          window.setTimeout(() => stamp(px * r.width, py * r.height), i * 165)
        );
      });
    };

    return () => {
      stopAuto();
      if (restRef.current !== undefined) {
        window.clearTimeout(restRef.current);
      }
      hero.removeEventListener('pointerenter', onPointerEnter);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerdown', onPointerDown);
      hero.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handlePlay = () => {
    const hero = heroRef.current as (HTMLDivElement & { __playTrail?: () => void }) | null;
    hero?.__playTrail?.();
  };

  const handleOpenBrief = () => {
    briefDialogRef.current?.showModal();
  };

  const handleSaveBrief = () => {
    const field = notesRef.current;
    if (!field || !field.value.trim()) {
      field?.focus();
      return;
    }
    const url = URL.createObjectURL(
      new Blob([`Loop Dept project brief\n\n${field.value}\n`], { type: 'text/plain' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-brief.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header>
        <div className="wrap nav">
          <a className="brand" href="#home" aria-label="Loop Dept home">
            Loop Dept
          </a>
          <button
            ref={menuRef}
            className="menu"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="links"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            Menu
          </button>
          <nav
            id="links"
            aria-label="Main navigation"
            className={menuOpen ? 'open' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            <a href="#services">Services</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="home" aria-labelledby="word">
          <div className="wrap hero-inner" ref={heroRef}>
            <div className="top">
              <h1 id="word">Loop Dept</h1>
              <div className="rails">
                <div>
                  Digital Media
                  <br />
                  Branding
                  <br />
                  Art Direction
                  <br />
                  Web Development
                </div>
                <div>
                  Locations
                  <br />
                  Los angeles
                  <br />
                  London
                  <br />
                  Milano
                </div>
                <div className="social">
                  <a href="https://www.instagram.com/">Instagram ↗</a>
                  <a href="https://x.com/prettysites">Twitter ↗</a>
                  <a href="https://www.linkedin.com/">LinkedIn ↗</a>
                </div>
              </div>
            </div>

            <div className="stage" aria-hidden="true">
              <div className="intro-card">
                <img src="/assets/crane.webp" alt="" />
                <span>01 / Paper Flight</span>
              </div>
            </div>

            <div className="trail" aria-hidden="true" ref={trailRef} />

            <div className="experiment">
              <button
                id="play"
                type="button"
                aria-label="Play a GIF trail"
                onClick={handlePlay}
              >
                <i aria-hidden="true" />
                <span>Play the trail</span>
              </button>
              <span className="hint">or move your cursor</span>
            </div>

            <div className="hero-foot">
              <h2>Creative studio crafting narrative-driven digital experiences for modern brands</h2>
              <div>
                <p>We shape stories through film, design and code. One frame at a time.</p>
                <div className="actions">
                  <a className="pill" href="#contact">
                    Book a Meeting <span>↗</span>
                  </a>
                  <a className="pill alt" href="#about">
                    Learn More <span>●</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="wrap section">
          <div className="kicker">01 / About the studio</div>
          <h2 className="display">
            Production studio shaping story-driven digital experiences for leading brands
          </h2>
          <div className="partners">
            <strong>Meet our partners</strong>
            <span>Image makers</span>
            <span>Directors</span>
            <span>Developers</span>
          </div>
        </section>

        <section id="projects" className="works">
          <div className="wrap section">
            <div className="kicker">02 / Projects</div>
            <h2 className="display">
              Digital experiences
              <br />
              Selected works
            </h2>
            <div className="workgrid">
              <article>
                <img
                  src="/assets/wine.webp"
                  alt="A crystal coupe and red grapes against a cherry backdrop"
                  loading="lazy"
                />
                <div>
                  <h3>Wine Dine</h3>
                  <span>( Trailer )</span>
                </div>
                <details>
                  <summary>Discover More</summary>
                  <p>
                    A still-life study in burgundy: glass, fruit and a hard shadow share the frame.
                  </p>
                </details>
              </article>

              <article>
                <img
                  src="/assets/car.webp"
                  alt="A lone sports car at a petrol station after dusk"
                  loading="lazy"
                />
                <div>
                  <h3>Lonely Car</h3>
                  <span>( Animation )</span>
                </div>
                <details>
                  <summary>Discover More</summary>
                  <p>
                    A roadside story told in the minute between the last daylight and the first
                    electric light.
                  </p>
                </details>
              </article>

              <article>
                <img
                  src="/assets/bike.webp"
                  alt="A cyclist in a chrome visor cuts through a blue field"
                  loading="lazy"
                />
                <div>
                  <h3>Futuristic</h3>
                  <span>( Movie )</span>
                </div>
                <details>
                  <summary>Discover More</summary>
                  <p>A rider stays sharp while a world of cobalt rushes past the lens.</p>
                </details>
              </article>

              <article>
                <img
                  src="/assets/fabric.webp"
                  alt="Sculptural saffron and red fabric on a dark stage"
                  loading="lazy"
                />
                <div>
                  <h3>Drama Fabric</h3>
                  <span>( Trailer )</span>
                </div>
                <details>
                  <summary>Discover More</summary>
                  <p>A piece of silk takes the lead. Light and folds do the rest.</p>
                </details>
              </article>
            </div>
          </div>
        </section>

        <section id="services" className="dark">
          <div className="wrap section">
            <div className="kicker">03 / Services we can help with</div>
            <h2 className="display">Why work with us</h2>
            <div className="service-list">
              <details open>
                <summary>Digital Media</summary>
                <p>Film stills, short loops and moving images for screens of every size.</p>
              </details>
              <details>
                <summary>Branding</summary>
                <p>Identities with a point of view, from a wordmark to a visual system.</p>
              </details>
              <details>
                <summary>Art Direction</summary>
                <p>Concept, casting and a visual language for the whole shoot.</p>
              </details>
              <details>
                <summary>Webflow</summary>
                <p>Responsive studio portfolios and campaign pages built around the work.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="wrap section">
          <div className="kicker">04 / Who’s talking about us</div>
          <blockquote>
            “Keep the running dog.”
            <cite>
              Head of Vibes · BananaWave Inc. <small>Fictional studio note</small>
            </cite>
          </blockquote>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap section">
          <div className="kicker">05 / Contact</div>
          <h2 className="display">What are we making?</h2>
          <p>Start with the project, the audience and the date you have in mind.</p>
          <button id="brief" className="pill" type="button" onClick={handleOpenBrief}>
            Start a project brief <span>↗</span>
          </button>
          <div className="end">
            <b className="brand">Loop Dept</b>
            <a href="/free-prompt.txt" download>
              Get the free build prompt ↓
            </a>
            <a href="#home">Back to top ↑</a>
          </div>
        </div>
      </footer>

      <dialog id="briefbox" ref={briefDialogRef}>
        <form method="dialog">
          <button className="close" aria-label="Close brief">
            ×
          </button>
        </form>
        <h2>Project brief</h2>
        <p>Save a copy to share with your studio.</p>
        <label htmlFor="notes">What are you making?</label>
        <textarea
          id="notes"
          ref={notesRef}
          rows={6}
          placeholder="Project, audience, timeline…"
        />
        <button className="pill" id="save" type="button" onClick={handleSaveBrief}>
          Download brief ↓
        </button>
      </dialog>
    </>
  );
}
