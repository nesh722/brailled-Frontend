import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EvidenceTable } from '../components/EvidenceTable';
import { MAIL_DEMO, MAIL_KIT } from "../lib/landing-mailto";
import { Play, Calendar, Users, MapPin, TrendingUp, Award, Menu, X } from 'lucide-react';
import { animate, useInView } from 'framer-motion';

const LOGO = "/Braille%20bot%20%20Bio.png";

const ELECTRIC_BLUE = "#1E90FF";     
const ELECTRIC_BLUE_DARK = "#007BFF"; 
const ELECTRIC_BLUE_LIGHT = "#4DA6FF"; 
const ELECTRIC_BLUE_GLOW = "rgba(30, 144, 255, 0.15)"; 

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

export function EvidencePage() {
  const year = new Date().getFullYear();
  const [recordCount, setRecordCount] = useState(0);
  const [countyCount, setCountyCount] = useState(0);
  const [totalAgeSum, setTotalAgeSum] = useState(0);
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('brailleEvidences');
    if (saved) {
      const records = JSON.parse(saved);
      setRecordCount(records.length);
      const uniqueCounties = new Set(records.map((r: any) => r.county));
      setCountyCount(uniqueCounties.size);
      const sumAges = records.reduce((sum: number, r: any) => sum + (r.age || 0), 0);
      setTotalAgeSum(sumAges);
      const uniqueSessions = new Set(records.map((r: any) => r.sessionType));
      setSessionTypes(Array.from(uniqueSessions));
    }
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const controlHeader = () => {
      setScrolled(window.scrollY > 80);
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);

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

  // SECRET ADMIN ACCESS: Triple tap on logo (for mobile)
  useEffect(() => {
    let tapCount = 0;
    let tapTimer: NodeJS.Timeout;
    
    const handleTripleTap = () => {
      tapCount++;
      if (tapTimer) clearTimeout(tapTimer);
      
      if (tapCount === 3) {
        window.location.href = '/admin';
        tapCount = 0;
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 500);
      }
    };
    
    const logoElement = document.querySelector('.admin-secret-tap');
    if (logoElement) {
      logoElement.addEventListener('click', handleTripleTap);
      return () => logoElement.removeEventListener('click', handleTripleTap);
    }
  }, []);

  const averageAge = recordCount > 0 ? Math.round(totalAgeSum / recordCount) : 0;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-[100] px-4 sm:px-6 lg:px-16 py-3 sm:py-4 transition-all duration-500
        ${showHeader ? 'translate-y-0' : '-translate-y-full'}
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md border-b'
          : 'bg-transparent border-b border-white/10'}
      `} style={scrolled ? { borderColor: 'var(--brand-mid)' } : {}}>
        
        <div className="flex justify-between items-center">
          <a className="flex items-center admin-secret-tap" href="/">
            <img
              src={LOGO}
              alt="BrailleEd Logo"
              className={`h-16 sm:h-20 md:h-28 w-auto object-contain transition-all cursor-pointer ${scrolled ? '' : 'brightness-0 invert'}`}
            />
          </a>
          
          {/* Desktop Navigation  */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-10" aria-label="Primary">
            <a href="/" className={`text-xs font-bold uppercase tracking-widest transition ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white hover:text-blue-300'}`}>
              Home
            </a>
            <a href="/#who-we-are" className={`text-xs font-bold uppercase tracking-widest transition ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white hover:text-blue-300'}`}>
              Who we are
            </a>
            <a href="/#purchase-kit" className={`text-xs font-bold uppercase tracking-widest transition ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white hover:text-blue-300'}`}>
              Purchase a kit
            </a>
            <a href="/evidence" className={`text-xs font-bold uppercase tracking-widest transition ${scrolled ? 'border-b-2' : 'border-b-2'}`} style={{ color: ELECTRIC_BLUE, borderBottomColor: ELECTRIC_BLUE }}>
              User Evidence
            </a>
            
            <div className="flex items-center gap-3 xl:gap-4 ml-2 xl:ml-4">
              <a href={MAIL_DEMO} className={`text-xs font-bold uppercase tracking-widest px-4 xl:px-6 py-2 xl:py-2.5 border-2 transition
                ${scrolled
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                  : 'border-white text-white hover:bg-white hover:text-slate-900'}`}>
                Book a demo
              </a>
              <a href="/playground/" className="text-xs font-bold uppercase tracking-widest text-white px-4 xl:px-6 py-2 xl:py-2.5 transition" style={{ backgroundColor: ELECTRIC_BLUE }}>
                Open playground
              </a>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-md transition ${scrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white hover:text-blue-300'}`}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50">
            <nav className="flex flex-col p-4 space-y-3" aria-label="Mobile navigation">
              <a href="/" onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-blue-600 transition py-2">Home</a>
              <a href="/#who-we-are" onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-blue-600 transition py-2">Who we are</a>
              <a href="/#purchase-kit" onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-blue-600 transition py-2">Purchase a kit</a>
              <a href="/evidence" onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest text-blue-600 transition py-2">User Evidence</a>
              <div className="border-t border-slate-200 my-2"></div>
              <a href={MAIL_DEMO} onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest border-2 border-blue-600 text-blue-600 px-4 py-2 text-center hover:bg-blue-600 hover:text-white transition">Book a demo</a>
              <a href="/playground/" onClick={closeMobileMenu} className="text-sm font-bold uppercase tracking-widest bg-slate-900 text-white px-4 py-2 text-center hover:bg-blue-700 transition">Open playground</a>
            </nav>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28 min-h-[60vh]" style={{ backgroundColor: '#0f172a' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" aria-hidden="true" />
        
        <button
          onClick={toggleVideo}
          aria-label={videoPaused ? "Play background video" : "Pause background video"}
          className="absolute bottom-8 left-8 z-20 flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-all duration-300 rounded-md"
        >
          {videoPaused ? (
            <>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <path d="M0 0L12 7L0 14V0Z"/>
              </svg>
              Play
            </>
          ) : (
            <>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                <rect x="0" y="0" width="4" height="14"/>
                <rect x="8" y="0" width="4" height="14"/>
              </svg>
              Pause
            </>
          )}
        </button>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-24">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="border-l-8 pl-8" style={{ borderColor: ELECTRIC_BLUE }}>
              <p className="font-bold uppercase tracking-[0.3em] text-sm mb-4" style={{ color: ELECTRIC_BLUE_LIGHT }}>
                Real Impact Data
              </p>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-4">
                User Evidence
              </h1>
              <p className="text-lg text-slate-200 max-w-xl mt-4 leading-relaxed">
                Real learner interactions from BrailleBot sessions across Kenya. 
                Anonymised records demonstrating our impact in inclusive STEM education.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 min-w-[300px]">
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={recordCount} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Total Records</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={countyCount} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Counties Reached</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={averageAge} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Average Age</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={sessionTypes.length} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Session Types</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="section bg-white border-t border-b" style={{ borderColor: 'var(--brand-mid)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-24 py-12">
          
          <div className="impact-grid mb-10">
            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <TrendingUp className="w-5 h-5" style={{ color: ELECTRIC_BLUE }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE }}>
                <CountingNumber value={recordCount} />
              </div>
              <div className="impact-label text-sm">learners engaged</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <MapPin className="w-5 h-5" style={{ color: ELECTRIC_BLUE }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE }}>
                <CountingNumber value={countyCount} />
              </div>
              <div className="impact-label text-sm">counties across Kenya</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <Users className="w-5 h-5" style={{ color: ELECTRIC_BLUE }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE }}>
                <CountingNumber value={averageAge} />
              </div>
              <div className="impact-label text-sm">average learner age</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <Award className="w-5 h-5" style={{ color: ELECTRIC_BLUE }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE }}>
                <CountingNumber value={sessionTypes.length} />
              </div>
              <div className="impact-label text-sm">different session types</div>
            </div>
          </div>

          <div className="access-list mb-8">
            <li style={{ backgroundColor: 'var(--brand-soft)', borderColor: 'var(--brand-border)', borderLeftColor: ELECTRIC_BLUE }}>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ELECTRIC_BLUE }}></div>
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-deep)' }}>Blind (congenital)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ELECTRIC_BLUE_LIGHT }}></div>
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-deep)' }}>Low Vision</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ELECTRIC_BLUE_DARK }}></div>
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-deep)' }}>Blind (acquired)</span>
                  </div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </li>
          </div>

          <EvidenceTable isAdminView={false} />

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Data represents anonymized learner interactions from BrailleBot programs across Kenya
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All personally identifiable information has been removed to protect learner privacy
            </p>
          </div>
        </div>
      </section>

      {/* BUNIFU STRIP */}
      <section className="py-16" style={{ backgroundColor: ELECTRIC_BLUE }}>
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-white">
            A product of Bunifu Youths Kenya
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Empowering young people through inclusive technology and education across the region.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white py-24 px-6 lg:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <img src={LOGO} alt="BrailleEd" className="h-20 w-auto invert brightness-0" />
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Robotics and coding for blind and visually impaired students in Kenya. Leading the way in inclusive STEM.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-8">Explore</h3>
            <ul className="space-y-4 text-sm font-medium uppercase tracking-widest text-gray-300">
              <li><a href="/playground/" className="hover:text-white transition">Playground</a></li>
              <li><a href="/evidence" className="hover:text-white transition">User Evidence</a></li>
              <li><a href="/#who-we-are" className="hover:text-white transition">Who we are</a></li>
              <li><a href="/#purchase-kit" className="hover:text-white transition">Purchase a kit</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-8">Contact</h3>
            <ul className="space-y-4 text-sm text-gray-300">
              <li><a href={MAIL_KIT} className="hover:text-white transition">bunifuyouthskenya@gmail.com</a></li>
              <li><a href="tel:+254712015793" className="hover:text-white transition">0712 015793</a></li>
              <li className="pt-4 font-bold text-white uppercase tracking-widest text-xs">Based in Kenya</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            © {year} BrailleEd · Bunifu Youths Kenya
          </p>
          <div className="flex gap-8 text-gray-500 text-xs uppercase tracking-widest">
            <span>Accessibility First</span>
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}