import React, { useState, useRef, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { EvidenceTable } from './EvidenceTable';
import { DisabilityType, SessionType, LearnerEvidence } from '../types/evidence';
import { Upload, Download, FileText, LogOut, Users, MapPin, Calendar, TrendingUp, AlertCircle, Shield, Edit, Trash2, X, Save } from 'lucide-react';
import { animate, useInView } from 'framer-motion';
import { MAIL_KIT } from "../lib/landing-mailto";

const LOGO = "/Braille%20bot%20%20Bio.png";


const ELECTRIC_BLUE = "#1E90FF";         
const ELECTRIC_BLUE_DARK = "#0066CC";     
const ELECTRIC_BLUE_DEEPER = "#004999";    
const ELECTRIC_BLUE_LIGHT = "#4DA6FF";    
const ELECTRIC_BLUE_GLOW = "rgba(0, 102, 204, 0.12)";

const DISABILITY_TYPES: DisabilityType[] = ["Blind (congenital)", "Blind (acquired)", "Low vision / progressive", "Low vision (stable)", "Other"];
const SESSION_TYPES: SessionType[] = ["Prototype assembly session", "Voice coding workshop", "Bootcamp session", "Teacher training session", "Classroom integration", "Demo session"];
const COUNTIES = ["Nairobi", "Siaya", "Mombasa", "Kiambu", "Uasin Gishu", "Kisumu", "Nyeri"];

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

// function to auto-assign sequential User ID
const generateNextUserId = (existingRecords: LearnerEvidence[]): string => {
  const brlNumbers = existingRecords
    .map(record => {
      const match = record.userId.match(/BRL-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  const nextNumber = brlNumbers.length > 0 ? Math.max(...brlNumbers) + 1 : 1;
  return `BRL-${nextNumber.toString().padStart(3, '0')}`;
};

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="inline-flex items-center gap-2">
      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Processing...</span>
    </div>
  );
}

export function AdminPanel() {
  const { isAdmin, loginAsAdmin, logout, addEvidence, editEvidence, deleteEvidence, evidence } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ total: 0, counties: 0, sessions: 0, avgAge: 0 });
  const [videoPaused, setVideoPaused] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LearnerEvidence | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate stats
  useEffect(() => {
    const uniqueCounties = new Set(evidence.map(e => e.county));
    const uniqueSessions = new Set(evidence.map(e => e.sessionType));
    const totalAge = evidence.reduce((sum, e) => sum + e.age, 0);
    setStats({
      total: evidence.length,
      counties: uniqueCounties.size,
      sessions: uniqueSessions.size,
      avgAge: evidence.length > 0 ? Math.round(totalAge / evidence.length) : 0
    });
  }, [evidence]);

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

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setVideoPaused(false);
    } else {
      videoRef.current.pause();
      setVideoPaused(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAsAdmin(password)) {
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      return record;
    });
  };

  const validateAndConvertRecord = (record: any, index: number): { valid: boolean; record?: Omit<LearnerEvidence, 'id' | 'createdAt' | 'updatedAt'>; error?: string } => {
    const requiredFields = ['school', 'county', 'age', 'disabilityType', 'sessionType', 'outcomeRecorded'];
    for (const field of requiredFields) {
      if (!record[field] || record[field].trim() === '') {
        return { valid: false, error: `Row ${index + 2}: Missing required field "${field}"` };
      }
    }
    
    const age = parseInt(record.age);
    if (isNaN(age) || age < 5 || age > 100) {
      return { valid: false, error: `Row ${index + 2}: Age must be a number between 5 and 100` };
    }
    
    if (!COUNTIES.includes(record.county)) {
      return { valid: false, error: `Row ${index + 2}: Invalid county "${record.county}"` };
    }
    
    if (!DISABILITY_TYPES.includes(record.disabilityType)) {
      return { valid: false, error: `Row ${index + 2}: Invalid disability type "${record.disabilityType}"` };
    }
    
    if (!SESSION_TYPES.includes(record.sessionType)) {
      return { valid: false, error: `Row ${index + 2}: Invalid session type "${record.sessionType}"` };
    }
    
    return {
      valid: true,
      record: {
        userId: '',
        school: record.school,
        county: record.county,
        age: age,
        disabilityType: record.disabilityType as DisabilityType,
        sessionType: record.sessionType as SessionType,
        outcomeRecorded: record.outcomeRecorded,
      }
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus(null);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const parsedData = parseCSV(csvText);
        
        if (parsedData.length === 0) {
          setUploadStatus({ message: 'CSV file is empty', isError: true });
          setIsUploading(false);
          return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        
        const currentEvidence = [...evidence];
        
        for (let i = 0; i < parsedData.length; i++) {
          const result = validateAndConvertRecord(parsedData[i], i);
          if (result.valid && result.record) {
            const nextId = generateNextUserId([...currentEvidence, ...Array(successCount).fill(null).map((_, idx) => ({
              ...result.record!,
              id: `temp-${idx}`,
              userId: `BRL-${(currentEvidence.length + idx + 1).toString().padStart(3, '0')}`,
              createdAt: new Date(),
              updatedAt: new Date()
            } as LearnerEvidence))]);
            
            result.record.userId = nextId;
            addEvidence(result.record);
            successCount++;
          } else if (result.error) {
            errorCount++;
            errors.push(result.error);
          }
        }
        
        if (successCount > 0) {
          setUploadStatus({ 
            message: `✅ Successfully added ${successCount} records. User IDs auto-assigned (BRL-XXX format). ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`, 
            isError: false 
          });
        } else {
          setUploadStatus({ message: ` Failed to add any records. ${errors[0] || 'Check file format'}`, isError: true });
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        
      } catch (err) {
        setUploadStatus({ message: `Error parsing CSV: ${err}`, isError: true });
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setUploadStatus({ message: 'Error reading file', isError: true });
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = ['school', 'county', 'age', 'disabilityType', 'sessionType', 'outcomeRecorded'];
    const exampleRow = [
      'Example School Name',
      'Nairobi',
      '14',
      'Blind (congenital)',
      'Voice coding workshop',
      'Student successfully completed the workshop and built a working program'
    ];
    
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'braille_evidence_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['userId', 'school', 'county', 'age', 'disabilityType', 'sessionType', 'outcomeRecorded', 'createdAt'];
    const csvRows = [headers.join(',')];
    
    evidence.forEach(record => {
      const row = [
        record.userId,
        `"${record.school.replace(/"/g, '""')}"`,
        record.county,
        record.age,
        record.disabilityType,
        record.sessionType,
        `"${record.outcomeRecorded.replace(/"/g, '""')}"`,
        record.createdAt.toISOString()
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `braille_evidence_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Edit Modal Component
  const EditModal = ({ record, onClose, onSave }: { record: LearnerEvidence; onClose: () => void; onSave: (id: string, updates: Partial<LearnerEvidence>) => void }) => {
    const [formData, setFormData] = useState({
      userId: record.userId,
      school: record.school,
      county: record.county,
      age: record.age.toString(),
      disabilityType: record.disabilityType,
      sessionType: record.sessionType,
      outcomeRecorded: record.outcomeRecorded,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(record.id, {
        userId: formData.userId,
        school: formData.school,
        county: formData.county,
        age: parseInt(formData.age),
        disabilityType: formData.disabilityType as DisabilityType,
        sessionType: formData.sessionType as SessionType,
        outcomeRecorded: formData.outcomeRecorded,
      });
      onClose();
    };

    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
          <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: ELECTRIC_BLUE_GLOW }}>
            <h2 className="text-xl font-bold uppercase tracking-tighter" style={{ color: ELECTRIC_BLUE_DARK }}>Edit Record</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5" style={{ color: ELECTRIC_BLUE_DARK }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>User ID</label>
              <input
                value={formData.userId}
                onChange={e => setFormData({...formData, userId: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>School</label>
              <input
                value={formData.school}
                onChange={e => setFormData({...formData, school: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>County</label>
              <select
                value={formData.county}
                onChange={e => setFormData({...formData, county: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              >
                {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>Disability Type</label>
              <select
                value={formData.disabilityType}
                onChange={e => setFormData({...formData, disabilityType: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              >
                {DISABILITY_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>Session Type</label>
              <select
                value={formData.sessionType}
                onChange={e => setFormData({...formData, sessionType: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                required
              >
                {SESSION_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: ELECTRIC_BLUE_DARK }}>Outcome Recorded</label>
              <textarea
                value={formData.outcomeRecorded}
                onChange={e => setFormData({...formData, outcomeRecorded: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: ELECTRIC_BLUE_GLOW }}
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 text-white py-2 text-sm font-bold uppercase tracking-widest rounded-lg transition" style={{ backgroundColor: ELECTRIC_BLUE_DARK }}>
                <Save className="w-4 h-4 inline mr-2" />
                Save Changes
              </button>
              <button type="button" onClick={onClose} className="flex-1 border py-2 text-sm font-bold uppercase tracking-widest rounded-lg transition" style={{ borderColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE_DARK }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Delete Confirmation Modal
  const DeleteConfirmModal = ({ recordId, onConfirm, onCancel }: { recordId: string; onConfirm: () => void; onCancel: () => void }) => {
    const record = evidence.find(r => r.id === recordId);
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full" style={{ border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
          <div className="p-6 border-b" style={{ borderColor: ELECTRIC_BLUE_GLOW }}>
            <h2 className="text-xl font-bold uppercase tracking-tighter" style={{ color: ELECTRIC_BLUE_DARK }}>Confirm Delete</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600">Are you sure you want to delete record <strong className="font-mono">{record?.userId}</strong>? This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 p-6 pt-0">
            <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-2 text-sm font-bold uppercase tracking-widest rounded-lg transition hover:bg-red-700">
              <Trash2 className="w-4 h-4 inline mr-2" />
              Delete
            </button>
            <button onClick={onCancel} className="flex-1 border py-2 text-sm font-bold uppercase tracking-widest rounded-lg transition" style={{ borderColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE_DARK }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Login Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden" style={{ border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
          <div className="p-8 text-center" style={{ borderBottom: `4px solid ${ELECTRIC_BLUE}` }}>
            <img src={LOGO} alt="BrailleEd Logo" className="h-40 w-auto mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--brand-deep)' }}>Admin Sign In</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Enter your credentials to access the dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="p-8">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 transition"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
              onFocus={(e) => (e.currentTarget.style.borderColor = ELECTRIC_BLUE)}
              onBlur={(e) => (e.currentTarget.style.borderColor = ELECTRIC_BLUE_GLOW)}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button 
              type="submit" 
              className="w-full text-white py-3 text-sm font-bold uppercase tracking-widest transition rounded-lg"
              style={{ backgroundColor: ELECTRIC_BLUE_DARK }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = ELECTRIC_BLUE_DEEPER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ELECTRIC_BLUE_DARK)}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard 
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      
      {/* Edit Modal */}
      {editingRecord && (
        <EditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={editEvidence}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          recordId={showDeleteConfirm}
          onConfirm={() => {
            deleteEvidence(showDeleteConfirm);
            setShowDeleteConfirm(null);
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Header  */}
      <header className={`fixed top-0 w-full z-[100] px-6 lg:px-16 py-4 flex justify-between items-center transition-all duration-500
        ${showHeader ? 'translate-y-0' : '-translate-y-full'}
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md border-b'
          : 'bg-transparent border-b border-white/10'}
      `} style={scrolled ? { borderColor: 'var(--brand-mid)' } : {}}>
        
        <a className="flex items-center gap-3 group" href="/">
          <img src={LOGO} alt="BrailleEd Logo" className={`h-26 md:h-30 w-auto object-contain transition-all ${scrolled ? '' : 'brightness-0 invert'}`} />
        </a>
        
        <button 
          onClick={logout} 
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-widest transition rounded-lg ${scrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28 min-h-[60vh]">
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
      
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" aria-hidden="true" />
        
        {/* Play/Pause Button */}
        <button
          onClick={toggleVideo}
          aria-label={videoPaused ? "Play background video" : "Pause background video"}
          className="absolute bottom-8 left-8 z-20 flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-all duration-300 rounded-md"
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
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-24">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="border-l-8 pl-8" style={{ borderColor: '#ffffff' }}>
              <p className="font-bold uppercase tracking-[0.3em] text-sm mb-4 text-white/80">
                Secure Management Portal
              </p>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-4">
                Admin Dashboard
              </h1>
              <p className="text-lg text-white/80 max-w-xl mt-4 leading-relaxed">
                Manage learner evidence records, import data via CSV, and track program impact across Kenya.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <Shield className="w-4 h-4" />
                <span>User IDs are automatically assigned sequentially (BRL-001, BRL-002, etc.)</span>
              </div>
            </div>

            {/* Stats Cards  */}
            <div className="grid grid-cols-2 gap-4 min-w-[300px]">
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={stats.total} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Total Records</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={stats.counties} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Counties Reached</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={stats.sessions} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Session Types</p>
              </div>
              <div className="backdrop-blur-md rounded-xl p-6 text-center border border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <div className="text-4xl font-black text-white">
                  <CountingNumber value={stats.avgAge} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-1 text-white/80">Average Age</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="section bg-white border-t border-b" style={{ borderColor: 'var(--brand-mid)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-24 py-12">
          
          {/* Impact Stats Row */}
          <div className="impact-grid mb-10">
            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <Users className="w-5 h-5" style={{ color: ELECTRIC_BLUE_DARK }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE_DARK }}>
                <CountingNumber value={stats.total} />
              </div>
              <div className="impact-label text-sm">Total Learners</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <MapPin className="w-5 h-5" style={{ color: ELECTRIC_BLUE_DARK }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE_DARK }}>
                <CountingNumber value={stats.counties} />
              </div>
              <div className="impact-label text-sm">Counties Reached</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <Calendar className="w-5 h-5" style={{ color: ELECTRIC_BLUE_DARK }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE_DARK }}>
                <CountingNumber value={stats.sessions} />
              </div>
              <div className="impact-label text-sm">Session Types</div>
            </div>

            <div className="impact-card" style={{ backgroundColor: 'var(--white)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
                  <TrendingUp className="w-5 h-5" style={{ color: ELECTRIC_BLUE_DARK }} />
                </div>
              </div>
              <div className="impact-number text-3xl font-black" style={{ color: ELECTRIC_BLUE_DARK }}>
                <CountingNumber value={stats.avgAge} />
              </div>
              <div className="impact-label text-sm">Average Age</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="access-list mb-8">
            <li style={{ backgroundColor: 'var(--brand-soft)', borderColor: 'var(--brand-border)', borderLeftColor: ELECTRIC_BLUE_DARK }}>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="csv-upload"
                      className={`inline-flex items-center gap-2 text-white px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition rounded-lg cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: isUploading ? ELECTRIC_BLUE_LIGHT : ELECTRIC_BLUE_DARK }}
                    >
                      {isUploading ? <LoadingSpinner /> : <Upload className="w-4 h-4" />}
                      Upload CSV
                    </label>
                  </div>
                  
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 border px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition rounded-lg"
                    style={{ borderColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE_DARK, backgroundColor: 'var(--white)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = ELECTRIC_BLUE_GLOW)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--white)')}
                  >
                    <FileText className="w-4 h-4" />
                    Download Template
                  </button>
                  
                  <button
                    onClick={exportToCSV}
                    className="inline-flex items-center gap-2 border px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition rounded-lg"
                    style={{ borderColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE_DARK, backgroundColor: 'var(--white)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = ELECTRIC_BLUE_GLOW)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--white)')}
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Total: {stats.total} records
                </div>
              </div>
            </li>
          </div>

          {/* Upload Status */}
          {uploadStatus && (
            <div className={`mb-6 p-4 rounded-lg ${uploadStatus.isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              {uploadStatus.message}
            </div>
          )}

          {/* CSV Instructions */}
          <details className="mb-6 rounded-lg" style={{ backgroundColor: 'var(--brand-soft)', border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
            <summary className="cursor-pointer p-4 text-sm font-bold uppercase tracking-widest" style={{ color: ELECTRIC_BLUE_DARK }}>
               CSV Format Instructions
            </summary>
            <div className="p-4 pt-0 border-t" style={{ borderColor: ELECTRIC_BLUE_GLOW }}>
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Your CSV file must have these columns in this order:</p>
              <code className="text-xs bg-white p-3 block rounded-lg border font-mono" style={{ borderColor: ELECTRIC_BLUE_GLOW }}>
                school, county, age, disabilityType, sessionType, outcomeRecorded
              </code>
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                <strong className="font-bold" style={{ color: ELECTRIC_BLUE_DARK }}>Auto-Assignment:</strong> User IDs are automatically generated as BRL-001, BRL-002, etc.<br />
                <strong className="font-bold" style={{ color: ELECTRIC_BLUE_DARK }}>Valid counties:</strong> {COUNTIES.join(', ')}<br />
                <strong className="font-bold" style={{ color: ELECTRIC_BLUE_DARK }}>Valid disability types:</strong> {DISABILITY_TYPES.join(', ')}<br />
                <strong className="font-bold" style={{ color: ELECTRIC_BLUE_DARK }}>Valid session types:</strong> {SESSION_TYPES.join(', ')}
              </p>
            </div>
          </details>

          {/* Evidence Table w */}
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--white)', border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
            <div className="px-6 py-4 border-b" style={{ backgroundColor: ELECTRIC_BLUE_GLOW, borderColor: ELECTRIC_BLUE_GLOW }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}> Learner Evidence Records</h3>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: ELECTRIC_BLUE_DARK }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.total} total records</span>
                </div>
              </div>
            </div>
            
            {/* Custom Table  */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: ELECTRIC_BLUE_GLOW }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>School</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>County</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>Age</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>Disability</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>Session</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>Outcome</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE_DARK }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((record, idx) => (
                    <tr key={record.id} className="border-t transition-colors hover:bg-gray-50" style={{ borderColor: ELECTRIC_BLUE_GLOW, backgroundColor: idx % 2 === 0 ? 'var(--white)' : 'var(--brand-soft)' }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: ELECTRIC_BLUE_DARK }}>{record.userId}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={record.school}>{record.school}</td>
                      <td className="px-4 py-3 text-slate-700">{record.county}</td>
                      <td className="px-4 py-3 text-slate-700">{record.age}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate" title={record.disabilityType}>{record.disabilityType}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate" title={record.sessionType}>{record.sessionType}</td>
                      <td className="px-4 py-3 text-slate-500 italic max-w-[300px] truncate" title={record.outcomeRecorded}>{record.outcomeRecorded}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-blue-100"
                            style={{ color: ELECTRIC_BLUE_DARK }}
                            title="Edit record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(record.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-100 text-red-500"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

            {/* Footer - Black */}
      <footer className="bg-black text-white py-16 px-6 lg:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <img src={LOGO} alt="BrailleEd" className="h-16 w-auto invert brightness-0" />
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Robotics and coding for blind and visually impaired students in Kenya. Leading the way in inclusive STEM.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-6">Explore</h3>
            <ul className="space-y-3 text-sm font-medium uppercase tracking-widest text-gray-300">
              <li><a href="/playground/" className="hover:text-white transition">Playground</a></li>
              <li><a href="/evidence" className="hover:text-white transition">User Evidence</a></li>
              <li><a href="/#who-we-are" className="hover:text-white transition">Who we are</a></li>
              <li><a href="/#purchase-kit" className="hover:text-white transition">Purchase a kit</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500 mb-6">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li><a href={MAIL_KIT} className="hover:text-white transition">bunifuyouthskenya@gmail.com</a></li>
              <li><a href="tel:+254712015793" className="hover:text-white transition">0712 015793</a></li>
              <li className="pt-2 font-bold text-white uppercase tracking-widest text-xs">Based in Kenya</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest">© {new Date().getFullYear()} BrailleEd · Bunifu Youths Kenya</p>
          <div className="flex gap-6 text-gray-500 text-xs uppercase tracking-widest">
            <span>Accessibility First</span>
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
