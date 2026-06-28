"use client"
import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json());

export function useStudents(queryParams = '') {
  const { data, error, isLoading, mutate } = useSWR(`/api/students${queryParams}`, fetcher);
  
  return {
    students: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    limit: data?.data?.limit || 20,
    isLoading,
    isError: error,
    mutate
  };
}

export function useLateStudents() {
  const { data, error, isLoading } = useSWR('/api/students/late', fetcher);
  return {
    students: data?.data || [],
    isLoading,
    isError: error
  };
}

export function useStudent(id) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/students/${id}` : null, fetcher);
  return {
    student: data?.data || null,
    isLoading,
    isError: error,
    mutate
  };
}
