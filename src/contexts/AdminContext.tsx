import React, { createContext, useContext, useState, useEffect } from 'react';
import { LearnerEvidence } from '../types/evidence';
import { SAMPLE_EVIDENCE } from '../data/sample-evidence';

interface AdminContextType {
  isAdmin: boolean;
  loginAsAdmin: (password: string) => boolean;
  logout: () => void;
  evidence: LearnerEvidence[];
  addEvidence: (record: Omit<LearnerEvidence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editEvidence: (id: string, updates: Partial<LearnerEvidence>) => void;
  deleteEvidence: (id: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = 'BrailleEd2025';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [evidence, setEvidence] = useState<LearnerEvidence[]>(() => {
    const saved = localStorage.getItem('brailleEvidences');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((e: any) => ({ 
        ...e, 
        createdAt: new Date(e.createdAt), 
        updatedAt: new Date(e.updatedAt) 
      }));
    }
    return SAMPLE_EVIDENCE;
  });

  useEffect(() => {
    localStorage.setItem('brailleEvidences', JSON.stringify(evidence));
  }, [evidence]);

  const loginAsAdmin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAdmin(false);

  const addEvidence = (record: Omit<LearnerEvidence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecord: LearnerEvidence = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEvidence(prev => [newRecord, ...prev]);
  };

  const editEvidence = (id: string, updates: Partial<LearnerEvidence>) => {
    setEvidence(prev => prev.map(record => 
      record.id === id 
        ? { ...record, ...updates, updatedAt: new Date() }
        : record
    ));
  };

  const deleteEvidence = (id: string) => {
    setEvidence(prev => prev.filter(record => record.id !== id));
  };

  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      loginAsAdmin, 
      logout, 
      evidence, 
      addEvidence, 
      editEvidence, 
      deleteEvidence 
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}