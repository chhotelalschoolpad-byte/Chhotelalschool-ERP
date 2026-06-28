"use client"
import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json());

export function useStudentPayments(studentId) {
  const { data, error, isLoading, mutate } = useSWR(studentId ? `/api/students/${studentId}/payments` : null, fetcher);
  return {
    payments: data?.data || [],
    isLoading,
    isError: error,
    mutate
  };
}
