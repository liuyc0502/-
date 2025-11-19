import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getPatientByEmail } from '@/services/patientService';
import log from '@/lib/logger';
 
interface PatientInfo {
  patient_id: number;
  name: string;
  email: string;
  age: number;
  gender: string;
  medical_record_no: string;
}
 
export function usePatientInfo() {
  const { user, isLoading: authLoading } = useAuth();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
 
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (authLoading) {
        return; // Wait for auth to complete
      }
 
      if (!user?.email) {
        setIsLoading(false);
        return;
      }
 
      try {
        setIsLoading(true);
        setError(null);
 
        // Fetch patient info by email
        const patient = await getPatientByEmail(user.email);
        setPatientInfo(patient);
      } catch (err) {
        log.error('Failed to fetch patient info:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch patient info'));
        setPatientInfo(null);
      } finally {
        setIsLoading(false);
      }
    };
 
    fetchPatientInfo();
  }, [user?.email, authLoading]);
 
  return {
    patientInfo,
    patientId: patientInfo?.patient_id,
    isLoading,
    error,
  };
}