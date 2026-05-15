import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityPanel } from "../components/AccessibilityPanel";
import { RevealSection } from "../components/RevealSection";
import { GalleryCarousel } from "../components/GalleryCarousel";
import { MAIL_DEMO, MAIL_KIT, MAIL_PLAIN } from "../lib/landing-mailto";
import { School, SchoolIcon, Play, Calendar, Users, Building2, GraduationCap, MapPin } from "lucide-react";
import { motion, animate, useInView } from "framer-motion";

// Counting Animation Logic
function CountingNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        onUpdate: (val) => setCount(Math.round(val)),
      });
      return () => controls.stop();
    }
  }, [isInView, value]);

  return <span ref={ref}>{count}</span>;
}

const LOGO = "/Braille%20bot%20%20Bio.png";

const KIT_PHOTOS: readonly { src: string; alt: string }[] = [
  { src: "/IMG_0424.JPG.jpeg", alt: "STEM robotics kit parts and build materials on a table" },
  { src: "/IMG_0438.JPG.jpeg", alt: "Students working with programmable robotics kit components" },
  { src: "/IMG_9973.JPG.jpeg", alt: "Robotics learning kit hardware for classroom use" },
  {
    src: "/IMG_0438.JPG.jpeg",
    alt: "Close-up of robotics kit pieces used for coding and engineering activities",
  },
];

const TEAM_MEMBERS = [
  { src: "maxwell.jpeg",   name: "Maxwell Kamau",    role: "Founder & CEO"                     },
  { src: "patricia.jpeg",  name: "Patricia Wanjiru", role: "Co-founder"                         },
  { src: "ann.jpeg",       name: "Ann Nyokabi",      role: "Software Engineer & Web Developer"  },
  { src: "johndoe1.jpeg",  name: "John Doe1",        role: "Lead Engineer"                      },
  { src: "johndoe2.jpeg",  name: "John Doe2",        role: "Lead Engineer"                      },
  { src: "mokaya.jpeg",    name: "Brian Mokaya",     role: "Software Developer"                 },
  { src: "/team-7.jpg",    name: "Ruth Mungai",      role: "Software Developer"                 },
  { src: "/team-8.jpg",    name: "Erick Mutua",      role: "Backend Developer"                  },
  { src: "victor.jpeg",    name: "Victor Munene",    role: "Web & Software Developer"           },
  { src: "",               name: "Isaiah",           role: "Frontend Developer"                 },
];

export function LandingPage() {
  const year = new Date().getFullYear();
  const [kitLightbox, setKitLightbox] = useState<number | null>(null);
  const kitLightboxCloseRef = useRef<HTMLButtonElement>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Team carousel with auto-scroll
  const [teamScrollPaused, setTeamScrollPaused] = useState(false);
  const teamCarouselRef = useRef<HTMLDivElement>(null);
  const teamScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTeamScroll = useCallback(() => {
    if (teamScrollInterval.current) clearInterval(teamScrollInterval.current);
    teamScrollInterval.current = setInterval(() => {
      const el = teamCarouselRef.current;
      if (!el) return;
      // When we reach the end jump back to start
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 263, behavior: "smooth" });
      }
    }, 2500);
  }, []);

  const stopTeamScroll = useCallback(() => {
    if (teamScrollInterval.current) {
      clearInterval(teamScrollInterval.current);
      teamScrollInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (!teamScrollPaused) {
      startTeamScroll();
    } else {
      stopTeamScroll();
    }
    return () => stopTeamScroll();
  }, [teamScrollPaused, startTeamScroll, stopTeamScroll]);

  const toggleVideo = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setVideoPaused(false);
    } else {
      videoRef.current.pause();
      setVideoPaused(true);
    }
  }, []);

  const closeKitLightbox = useCallback(() => setKitLightbox(null), []);

  useEffect(() => {
    const controlHeader = () => {
      // Transparent at top, solid once scrolled past 80px
      setScrolled(window.scrollY > 80);

      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setShowHeader(false); // Scrolling Down
      } else {
        setShowHeader(true);  // Scrolling Up
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);

  useEffect(() => {
    if (kitLightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeKitLightbox();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => kitLightboxCloseRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [kitLightbox, closeKitLightbox]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <a className="skip-link-landing" href="#main-content">
        Skip to main content
      </a>

      {/*HEADER...Transparent at top solid white on scroll */}
      <header className={`fixed top-0 w-full z-[100] px-6 lg:px-16 py-4 flex justify-between items-center transition-all duration-500
        ${showHeader ? 'translate-y-0' : '-translate-y-full'}
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-100'
          : 'bg-transparent border-b border-white/10'}
      `}>
        <a className="flex items-center" href="/" aria-label="BrailleEd home">
          <img
            src={LOGO}
            alt="BrailleEd Logo"
            className={`h-20 md:h-28 w-auto object-contain transition-all origin-left hover:scale-105 ${scrolled ? '' : 'brightness-0 invert'}`}
          />
        </a>
        
        <nav className="hidden lg:flex items-center gap-10" aria-label="Primary">
          <a href="#who-we-are" className={`text-xs font-bold uppercase tracking-widest transition hover:text-blue-400 ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white'}`}>Who we are</a>
          <a href="#purchase-kit" className={`text-xs font-bold uppercase tracking-widest transition hover:text-blue-400 ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white'}`}>Purchase a kit</a>
         {/* <a href="https://bunifuyouths.org" className={`text-xs font-bold uppercase tracking-widest transition hover:text-blue-400 ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white'}`} target="_blank" rel="noopener noreferrer">Bunifu Youths</a> */}
          
          <div className="flex items-center gap-4 ml-4">
            <a href={MAIL_DEMO} className={`text-xs font-bold uppercase tracking-widest px-6 py-2.5 border-2 transition
              ${scrolled
                ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                : 'border-white text-white hover:bg-white hover:text-slate-900'}`}>
              Book a demo
            </a>
            <a href="/playground/" className="text-xs font-bold uppercase tracking-widest bg-blue-600 text-white px-6 py-2.5 hover:bg-blue-700 transition">
              Open playground
            </a>
          </div>
        </nav>
      </header>

      <main id="main-content">
        
        {/*HERO SECTION*/}
        <section className="relative min-h-screen flex items-start justify-center bg-slate-900 pt-36 pb-16">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            autoPlay loop muted playsInline aria-hidden="true"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" aria-hidden="true" />

          {/* Pause / Play button */}
          <button
            onClick={toggleVideo}
            aria-label={videoPaused ? "Play background video" : "Pause background video"}
            className="absolute bottom-8 left-8 z-20 flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-all duration-300"
          >
            {videoPaused ? (
              <>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                  <path d="M0 0L12 7L0 14V0Z"/>
                </svg>
                Play
              </>
            ) : (
              <>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                  <rect x="0" y="0" width="4" height="14"/>
                  <rect x="8" y="0" width="4" height="14"/>
                </svg>
                Pause
              </>
            )}
          </button>
          
          <div className="relative z-10 text-center px-6 max-w-5xl mt-16 md:mt-20">
            <p className="text-blue-400 font-bold uppercase tracking-[0.3em] mb-4 text-sm animate-pulse">
              Program · Simulate · Learn
            </p>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 leading-[0.95]">
              Visually impaired <br/> students <span className="text-blue-500">can now code.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 mb-6 max-w-3xl mx-auto font-light leading-relaxed">
              43.3 million blind people globally are under-represented in STEM. We are changing that with inclusive robotics kits designed specifically for visually impaired learners.
            </p>
            <p className="mb-10 text-slate-400 text-sm font-medium">
              <strong>Free to use.</strong> No account or sign-in required.
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
              <a href="/playground/" className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition shadow-2xl flex items-center justify-center gap-2">
                Try the playground <Play size={16} />
              </a>
              <a href={MAIL_DEMO} className="w-full md:w-auto bg-white text-slate-900 px-10 py-5 text-sm font-bold uppercase tracking-widest hover:bg-slate-100 transition flex items-center justify-center gap-2">
                Book a demo <Calendar size={16} />
              </a>
            </div>
          </div>
        </section>

        {/*  WHO WE ARE */}
        <RevealSection className="py-24 bg-slate-50 px-6 lg:px-24" id="who-we-are">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">

            {/* LEFT: Text */}
            <div className="lg:w-[55%] border-l-8 border-blue-600 pl-8">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 mb-6">Who we are</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6 font-light">
                BrailleEd builds robotics and coding learning tools for blind and visually impaired students in Kenya.
              </p>
              <p className="text-base text-slate-600 leading-relaxed font-light">
                We design accessible kits and lesson materials that work for learners who cannot use standard screens or printed resources, ensuring no student is left behind in the digital revolution.
              </p>
            </div>

            {/* RIGHT: image */}
            <div className="lg:w-[45%] overflow-hidden rounded-sm shadow-2xl">
              <img
                src="who we are.jpeg"
                alt="BrailleEd student working with robotics kit"
                className="w-full h-[420px] object-cover"
              />
            </div>

          </div>
        </RevealSection>

        {/* OUR TEAM SECTION  */}
        <RevealSection className="py-24 bg-white px-6 lg:px-24" id="our-team">
          <div className="max-w-7xl mx-auto">

            {/* Heading with auto-scroll pause/play button on the right */}
            <div className="flex items-start justify-between mb-16">
              <div className="border-l-8 border-blue-600 pl-8">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4">Our Team</h2>
                <p className="text-xl text-slate-500 max-w-2xl font-light">
                  The people behind BrailleEd — passionate about inclusive education and technology.
                </p>
              </div>

              {/*  Auto-scroll Pause / Play button  */}
              <button
                onClick={() => setTeamScrollPaused((p) => !p)}
                aria-label={teamScrollPaused ? "Resume team carousel" : "Pause team carousel"}
                className="flex-shrink-0 flex items-center gap-2 border-2 border-slate-300 hover:border-blue-600 hover:text-blue-600 text-slate-700 text-xs font-bold uppercase tracking-widest px-5 py-2.5 transition-all bg-white"
              >
                {teamScrollPaused ? (
                  <>
                    <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                      <path d="M0 0L12 7L0 14V0Z"/>
                    </svg>
                    Resume
                  </>
                ) : (
                  <>
                    <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
                      <rect x="0" y="0" width="4" height="14"/>
                      <rect x="8" y="0" width="4" height="14"/>
                    </svg>
                    Pause
                  </>
                )}
              </button>
            </div>

            {/* Scroll track */}
            <div
              ref={teamCarouselRef}
              id="team-carousel"
              className="flex gap-3 overflow-x-auto scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              /* Pause auto-scroll when user hovers */
              onMouseEnter={() => stopTeamScroll()}
              onMouseLeave={() => { if (!teamScrollPaused) startTeamScroll(); }}
            >
              
              {TEAM_MEMBERS.map((member, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 overflow-hidden group cursor-default"
                  style={{ width: "260px", height: "360px" }}
                >
                  {/* Photo  */}
                  {member.src ? (
                    <img
                      src={member.src}
                      alt={`${member.name}, ${member.role}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-6xl font-black uppercase">{member.name[0]}</span>
                    </div>
                  )}

                  {/* Always visible name */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-16
                    bg-gradient-to-t from-slate-900/75 via-slate-900/30 to-transparent">
                    <p className="text-white font-black text-base uppercase tracking-tight leading-snug">
                      {member.name}
                    </p>
                  </div>

                  {/* Hover overlay...blue tint + role */}
                  <div className="absolute inset-0 flex flex-col justify-end px-5 pb-5
                    bg-gradient-to-t from-blue-700/90 via-blue-600/40 to-transparent
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white font-black text-lg uppercase tracking-tight leading-tight mb-1">
                      {member.name}
                    </p>
                    <p className="text-blue-200 text-xs font-bold uppercase tracking-[0.15em]">
                      {member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom controls: prev,dots,next */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => {
                  stopTeamScroll();
                  const el = teamCarouselRef.current;
                  if (el) el.scrollBy({ left: -263, behavior: "smooth" });
                  if (!teamScrollPaused) setTimeout(startTeamScroll, 3000);
                }}
                aria-label="Scroll team left"
                className="w-12 h-12 flex items-center justify-center border-2 border-slate-300
                  hover:border-blue-600 hover:text-blue-600 text-slate-700 text-2xl font-bold
                  transition-all bg-white"
              >‹</button>

              <div className="flex items-center gap-2">
                {TEAM_MEMBERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      stopTeamScroll();
                      const el = teamCarouselRef.current;
                      if (el) el.scrollTo({ left: i * 263, behavior: "smooth" });
                      if (!teamScrollPaused) setTimeout(startTeamScroll, 3000);
                    }}
                    className="w-2 h-2 rounded-full bg-slate-300 hover:bg-blue-600 transition-colors"
                    aria-label={`Go to team member ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  stopTeamScroll();
                  const el = teamCarouselRef.current;
                  if (el) el.scrollBy({ left: 263, behavior: "smooth" });
                  if (!teamScrollPaused) setTimeout(startTeamScroll, 3000);
                }}
                aria-label="Scroll team right"
                className="w-12 h-12 flex items-center justify-center border-2 border-slate-300
                  hover:border-blue-600 hover:text-blue-600 text-slate-700 text-2xl font-bold
                  transition-all bg-white"
              >›</button>
            </div>

          </div>
        </RevealSection>

        {/* IMPACT SECTION */}
        <RevealSection className="py-24 relative" id="impact">

          {/* BACKGROUND IMAGE */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="impact.jpeg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          
            <div className="absolute inset-0 bg-white/75" />
          </div>

          {/*  HEADING */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-24 mb-10">
            <div className="border-l-8 border-blue-600 pl-8">
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-slate-900 mb-3">Our Impact</h2>
              <p className="text-lg text-slate-700 max-w-2xl font-light">Working across Kenya to empower blind and visually impaired learners through inclusive robotics.</p>
            </div>
          </div>

          {/*TILES GRID*/}
          <div className="relative z-10 px-4 md:px-6 lg:px-24">
            <div className="grid grid-cols-2 md:grid-cols4 gap-2 md:gap-3">

              {/* Row 1 Col 1 */}
              <div className="bg-slate-100 flex flex-col justify-center px-8 py-6 h-48">
                <div className="text-5xl font-black text-slate-900 mb-1">
                  <CountingNumber value={25} />
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-widest leading-snug">Educators Trained</div>
              </div>

              {/* Row 1 Col 2 — Image */}
              <div className="overflow-hidden group relative h-48">
                <img src="Seva Canada - Blog.jpg" alt="Educators trained"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
               {/* Row 1 Col 4 — Image */}
              <div className="overflow-hidden group relative h-48">
                <img src="download (2).jpg" alt="Strategic partners"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>

              {/* Row 1 Col 3 — 2 Strategic Partners */}
              <div className="bg-slate-900 flex flex-col justify-center px-8 py-6 h-48">
                <div className="text-5xl font-black text-white mb-1">
                  <CountingNumber value={2} />
                </div>
                <div className="text-xs font-bold text-blue-100 uppercase tracking-widest leading-snug">Strategic Partners</div>
              </div>

{/* Row 2 Col 2 — 3 Partner Institutions */}
              <div className="bg-slate-100 flex flex-col justify-center px-8 py-6 h-48">
                <div className="text-5xl font-black text-slate-900 mb-1">
                  <CountingNumber value={3} />
                </div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-widest leading-snug">Partner Institutions</div>
              </div>

              {/* Row 2 Col 1 — Image */}
              <div className="overflow-hidden group relative h-48">
                <img src="2026 notre dame stadium university_.jpg" alt="Partner institutions"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>


              {/* Row 2 Col 3 — Image */}
              <div className="overflow-hidden group relative h-48">
                <img src="Nairobi.jpg" alt="Counties impacted - Nairobi"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>

              {/* Row 2 Col 4 — 2 Counties Impacted */}
              <div className="bg-slate-900 flex flex-col justify-center px-8 py-6 h-48">
                <div className="text-5xl font-black text-white mb-1">
                  <CountingNumber value={2} />
                </div>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-widest leading-snug">Counties Impacted</div>
              </div>

            </div>
          </div>
        </RevealSection>

        {/* ACCESSIBILITY FEATURES  */}
        <RevealSection className="py-24 bg-white px-6 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="border-l-8 border-blue-600 pl-8 mb-16">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4">Designed for Accessibility</h2>
              <p className="text-xl text-slate-500 max-w-2xl font-light">Built for screen readers, magnification, and speech-to-text learning.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Screen reader support", desc: "Live regions announce messages so assistive technology can read them aloud." },
                { title: "Voice and keyboard", desc: "Program by speaking commands or typing; navigate with clear focus indicators." },
                { title: "Guided learning", desc: "Optional step-by-step mentor in the playground helps you know what to try next." },
                { title: "Simple layout", desc: "Skip links and structured headings make it easier to move through the page." }
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white border border-slate-100 shadow-sm hover:border-blue-600 transition-all">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/*  WHAT YOU CAN DO  */}
        <RevealSection className="py-24 bg-slate-900 text-white px-6 lg:px-24">
          <div className="max-w-7xl mx-auto">
             <div className="text-center mb-20">
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">What you can do</h2>
                <p className="text-blue-400 font-bold uppercase tracking-widest text-sm">A tactile workspace for clarity and feedback</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
               {[
                 { id: "01", title: "Voice commands", desc: "Say things like 'move forward' or chain several steps. The app listens and adds the right blocks." },
                 { id: "02", title: "Scratch-style blocks", desc: "Motion, sound, lights, and control blocks — add from the palette or build by voice." },
                 { id: "03", title: "Robot simulator", desc: "Run your stack and watch the robot on stage with a text log — no hardware required." }
               ].map((feature) => (
                 <div key={feature.id} className="relative p-10 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                    <span className="absolute top-4 right-6 text-5xl font-black text-white/5 group-hover:text-blue-600/20 transition-colors">{feature.id}</span>
                    <h3 className="text-2xl font-bold mb-4 uppercase tracking-tight">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed font-light">{feature.desc}</p>
                 </div>
               ))}
             </div>
          </div>
        </RevealSection>

        {/* VIDEO SECTION */}
        <RevealSection className="py-24 bg-white px-6 lg:px-24 text-center">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-8">See BrailleEd in Action</h2>
            <div className="aspect-video bg-slate-100 rounded-sm overflow-hidden shadow-2xl relative border-8 border-white">
              <iframe
                width="100%"
                height="100%"
                src="https://drive.google.com/file/d/15UkVkNz3zVyeVXb-kCx4SmVqNAxw-XpC/preview"
                title="BrailleEd in Action"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="absolute inset-0"
                allowFullScreen
                aria-label="Video showing BrailleEd inclusive robotics classroom"
              />
            </div>
            <p className="mt-8 text-slate-500 italic max-w-2xl mx-auto">
              Captions are enabled by default. Use keyboard arrows to navigate and spacebar to play/pause.
            </p>
          </div>
        </RevealSection>

        {/*  PURCHASE KIT SECTION  */}
        <RevealSection className="py-24 bg-slate-50 px-6 lg:px-24" id="purchase-kit">
          <div className="max-w-7xl mx-auto">
            <div className="border-l-8 border-blue-600 pl-8 mb-16">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4">Purchase a Kit</h2>
              <p className="text-xl text-slate-600 max-w-3xl font-light">
                Hands-on robotics kits for STEM education. Programmable builds used to teach coding, sensors, and engineering through tactile play.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
              {KIT_PHOTOS.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setKitLightbox(index)}
                  className="aspect-square overflow-hidden group relative bg-slate-200"
                >
                  <img 
                    src={photo.src} 
                    alt={photo.alt} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors" />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200 bg-white">
              <div className="p-10 border-b md:border-b-0 md:border-r border-slate-200">
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-slate-900">STEM Robotics kits</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light">Motors, sensors, and buildable models that connect coding ideas to real movement.</p>
              </div>
              <div className="p-10 border-b md:border-b-0 md:border-r border-slate-200">
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-slate-900">Aligned Learning</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light">Kits paired with BrailleEd lessons for structured tactile and audio support.</p>
              </div>
              <div className="p-10">
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 text-slate-900">How to Order</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light mb-4">Contact us for school pricing and bundles.</p>
                <a href={MAIL_KIT} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold uppercase text-xs tracking-widest hover:underline">Email Now →</a>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* BUNIFU section  */}
        <section className="py-24 bg-blue-600 text-white text-center px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 leading-tight">
              A product of Bunifu Youths Kenya
            </h2>
            <p className="text-xl mb-12 text-blue-100 font-light max-w-2xl mx-auto">
              Empowering young people through inclusive technology and education across the region.
            </p>
           {/* <a 
              href="https://bunifuyouths.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-white text-blue-600 px-12 py-5 text-sm font-bold uppercase tracking-widest hover:bg-slate-100 hover:scale-105 transition-all shadow-xl"
            >
              Visit bunifuyouths.org
            </a>
           */}
          </div>
        </section>
      </main>

      {/*FOOTER */}
      <footer className="bg-slate-950 text-white py-24 px-6 lg:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <img src={LOGO} alt="BrailleEd" className="h-20 w-auto invert brightness-0" />
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Robotics and coding for blind and visually impaired students in Kenya. Leading the way in inclusive STEM.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-8">Explore</h3>
            <ul className="space-y-4 text-sm font-medium uppercase tracking-widest text-slate-300">
              <li><a href="/playground/" className="hover:text-white transition">Playground</a></li>
              <li><a href="#who-we-are" className="hover:text-white transition">Who we are</a></li>
              <li><a href="#purchase-kit" className="hover:text-white transition">Purchase a kit</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-8">Contact</h3>
            <ul className="space-y-4 text-sm text-slate-300">
              <li><a href={MAIL_KIT} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">bunifuyouthskenya@gmail.com</a></li>
              <li><a href="tel:+254712015793" className="hover:text-white transition">0712 015793</a></li>
              <li className="pt-4 font-bold text-white uppercase tracking-widest text-xs">Based in Kenya</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs uppercase tracking-widest">
            © {year} BrailleEd · Bunifu Youths Kenya
          </p>
          <div className="flex gap-8 text-slate-500 text-xs uppercase tracking-widest">
             <span>Accessibility First</span>
             <span>Terms</span>
             <span>Privacy</span>
          </div>
        </div>
      </footer>

      <AccessibilityPanel />

      {/* LIGHTBOX LOGIC */}
      {kitLightbox !== null ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 p-6" role="dialog" aria-modal="true">
          <button 
            className="absolute top-8 right-8 text-white text-4xl hover:text-blue-500 transition"
            onClick={closeKitLightbox}
            aria-label="Close"
          >×</button>
          <div className="max-w-5xl w-full">
            <img
              src={KIT_PHOTOS[kitLightbox].src}
              alt={KIT_PHOTOS[kitLightbox].alt}
              className="w-full h-auto max-h-[80vh] object-contain shadow-2xl"
            />
            <p className="text-white mt-6 text-center text-lg font-light">{KIT_PHOTOS[kitLightbox].alt}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}