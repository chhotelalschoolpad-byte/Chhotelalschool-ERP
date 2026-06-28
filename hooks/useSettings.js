"use client"
import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json());

export function useSchoolSettings() {
  const { data, error, isLoading, mutate } = useSWR('/api/settings/school', fetcher);
  return {
    settings: data?.data || null,
    isLoading,
    isError: error,
    mutate
  };
}

export function useSystemSettings() {
  const { data, error, isLoading, mutate } = useSWR('/api/settings/system', fetcher);
  return {
    settings: data?.data || null,
    isLoading,
    isError: error,
    mutate
  };
}

export function useFeeStructures() {
  const { data, error, isLoading, mutate } = useSWR('/api/fees', fetcher);
  return {
    fees: data?.data || [],
    isLoading,
    isError: error,
    mutate
  };
}
