import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'

type AxiosQueryProps<TData, TError> = {
  queryKey: (string | number)[]
  queryFn: () => Promise<TData>
  options?: Omit<UseQueryOptions<TData, TError, TData, (string | number)[]>, 'queryKey' | 'queryFn'>
}

export function useAxiosQuery<TData = unknown, TError = unknown>({
  queryKey,
  queryFn,
  options,
}: AxiosQueryProps<TData, TError>): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  })
}

