import useSWR from 'swr';

const fetcher = url => fetch(url).then(r => r.json());

export function usePassoutStudents(queryParams = '') {
  const { data, error, isLoading, mutate } = useSWR(`/api/passout-students${queryParams}`, fetcher);
  return {
    students: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate
  };
}

export function usePassoutStats(queryParams = '') {
  const { data, error, isLoading, mutate } = useSWR(`/api/passout-students/stats${queryParams}`, fetcher);
  return {
    stats: data || null,
    isLoading,
    isError: error,
    mutate
  };
}
