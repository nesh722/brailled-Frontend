import React, { useState, useMemo } from 'react';
import { LearnerEvidence, EvidenceFilters, DisabilityType, SessionType } from '../types/evidence';
import { useAdmin } from '../contexts/AdminContext';
import { ChevronLeft, ChevronRight, Search, X, Filter } from 'lucide-react';

const ELECTRIC_BLUE = "#1E90FF";
const ELECTRIC_BLUE_GLOW = "rgba(30, 144, 255, 0.1)";

const COUNTIES = ["Nairobi", "Siaya", "Mombasa", "Kiambu", "Uasin Gishu", "Kisumu", "Nyeri"];
const DISABILITY_TYPES: DisabilityType[] = ["Blind (congenital)", "Blind (acquired)", "Low vision / progressive", "Low vision (stable)", "Other"];
const SESSION_TYPES: SessionType[] = ["Prototype assembly session", "Voice coding workshop", "Bootcamp session", "Teacher training session", "Classroom integration", "Demo session"];

const ITEMS_PER_PAGE = 10;

export function EvidenceTable({ isAdminView = false }: EvidenceTableProps) {
  const { evidence, deleteEvidence } = useAdmin();
  const [filters, setFilters] = useState<EvidenceFilters>({
    school: '',
    county: '',
    disabilityType: '',
    sessionType: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filteredEvidence = useMemo(() => {
    return evidence.filter(record => {
      const matchesSchool = filters.school === '' || record.school.toLowerCase().includes(filters.school.toLowerCase());
      const matchesCounty = filters.county === '' || record.county === filters.county;
      const matchesDisability = filters.disabilityType === '' || record.disabilityType === filters.disabilityType;
      const matchesSession = filters.sessionType === '' || record.sessionType === filters.sessionType;
      const matchesSearch = searchTerm === '' || 
        record.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.outcomeRecorded.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSchool && matchesCounty && matchesDisability && matchesSession && matchesSearch;
    });
  }, [evidence, filters, searchTerm]);

  const totalPages = Math.ceil(filteredEvidence.length / ITEMS_PER_PAGE);
  const paginatedEvidence = filteredEvidence.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const clearFilters = () => {
    setFilters({ school: '', county: '', disabilityType: '', sessionType: '' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || filters.school !== '' || filters.county !== '' || filters.disabilityType !== '' || filters.sessionType !== '';

  return (
    <div className="w-full">
      {/* Search and Filter Bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: ELECTRIC_BLUE }} />
          <input
            type="text"
            placeholder="Search by User ID or outcome..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: ELECTRIC_BLUE_GLOW, backgroundColor: 'var(--white)' }}
            onFocus={(e) => e.currentTarget.style.borderColor = ELECTRIC_BLUE}
            onBlur={(e) => e.currentTarget.style.borderColor = ELECTRIC_BLUE_GLOW}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-lg border flex items-center gap-2 transition-all hover:shadow-sm"
          style={{ borderColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE }}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ELECTRIC_BLUE }} />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-lg border flex items-center gap-2 transition-all hover:shadow-sm"
            style={{ borderColor: ELECTRIC_BLUE_GLOW, color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expandable Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--brand-soft)', border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="School name..."
              value={filters.school}
              onChange={(e) => setFilters({ ...filters, school: e.target.value })}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
              onFocus={(e) => e.currentTarget.style.borderColor = ELECTRIC_BLUE}
            />
            <select
              value={filters.county}
              onChange={(e) => setFilters({ ...filters, county: e.target.value })}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 bg-white"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
            >
              <option value="">All Counties</option>
              {COUNTIES.map(county => <option key={county} value={county}>{county}</option>)}
            </select>
            <select
              value={filters.disabilityType}
              onChange={(e) => setFilters({ ...filters, disabilityType: e.target.value })}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 bg-white"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
            >
              <option value="">All Disability Types</option>
              {DISABILITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select
              value={filters.sessionType}
              onChange={(e) => setFilters({ ...filters, sessionType: e.target.value })}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 bg-white"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
            >
              <option value="">All Session Types</option>
              {SESSION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${ELECTRIC_BLUE_GLOW}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: ELECTRIC_BLUE_GLOW }}>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>User ID</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>School</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>County</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>Age</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>Disability</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>Session</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ELECTRIC_BLUE }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvidence.map((record, idx) => (
              <tr key={record.id} className="border-t transition-colors hover:bg-opacity-50" style={{ borderColor: ELECTRIC_BLUE_GLOW, backgroundColor: idx % 2 === 0 ? 'var(--white)' : 'var(--brand-soft)' }}>
                <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: ELECTRIC_BLUE }}>{record.userId}</td>
                <td className="px-4 py-3 text-slate-700">{record.school}</td>
                <td className="px-4 py-3 text-slate-700">{record.county}</td>
                <td className="px-4 py-3 text-slate-700">{record.age}</td>
                <td className="px-4 py-3 text-slate-700">{record.disabilityType}</td>
                <td className="px-4 py-3 text-slate-700">{record.sessionType}</td>
                <td className="px-4 py-3 text-slate-500 italic max-w-md">{record.outcomeRecorded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredEvidence.length)} of {filteredEvidence.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: ELECTRIC_BLUE }} />
            </button>
            <span className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: ELECTRIC_BLUE_GLOW, color: ELECTRIC_BLUE }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
              style={{ borderColor: ELECTRIC_BLUE_GLOW }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: ELECTRIC_BLUE }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EvidenceTableProps {
  isAdminView?: boolean;
}