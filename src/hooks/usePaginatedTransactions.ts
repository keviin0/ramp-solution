/*
  Bug 4 fix
    - Concatenate previous responses with current response
*/
import { useCallback, useState } from "react"
import { PaginatedRequestParams, PaginatedResponse, Transaction } from "../utils/types"
import { PaginatedTransactionsResult } from "./types"
import { useCustomFetch } from "./useCustomFetch"

export function usePaginatedTransactions(): PaginatedTransactionsResult {
  const { fetchWithCache, loading } = useCustomFetch()
  const [paginatedTransactions, setPaginatedTransactions] = useState<PaginatedResponse<
    Transaction[]
  > | null>(null)

  const fetchAll = useCallback(async () => {
    const nextPage = paginatedTransactions === null ? 0 : paginatedTransactions.nextPage // moved nextPage logic out for clarity
    const response = await fetchWithCache<PaginatedResponse<Transaction[]>, PaginatedRequestParams>(
      "paginatedTransactions",
      {
        page: nextPage
      }
    )

    setPaginatedTransactions((previousResponse) => {
      if (response === null) {
        return previousResponse;
      } else if (previousResponse == null) {
        return response;
      }

      /*
        Bug 4 fix
          - Concatenate previous responses with current response
      */
      return {
        data: [...previousResponse.data, ...response.data], // Append new transactions to existing transactions
        nextPage: response.nextPage
      };
    })
  }, [fetchWithCache, paginatedTransactions])

  const invalidateData = useCallback(() => {
    setPaginatedTransactions(null)
  }, [])

  return { data: paginatedTransactions, loading, fetchAll, invalidateData }
}
