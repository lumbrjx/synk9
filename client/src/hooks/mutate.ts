import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'

type AxiosMutationProps<TData, TVariables, TError> = {
  mutationFn: (variables: TVariables) => Promise<TData>
  options?: Omit<UseMutationOptions<TData, TError, TVariables, unknown>, 'mutationFn'>
}

export function useAxiosMutation<TData = unknown, TVariables = void, TError = unknown>({
  mutationFn,
  options,
}: AxiosMutationProps<TData, TVariables, TError>): UseMutationResult<TData, TError, TVariables> {
  return useMutation({
    mutationFn,
    ...options,
  })
}

