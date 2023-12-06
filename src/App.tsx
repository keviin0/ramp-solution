/* 
    Bug 3 fix
      - call loadAllTransactions() if newValue's (if it exists) id, when the onChange callback is called, is empty
    Bug 5 fix
      - moved setIsLoading(false) after employees callback and before paginatedTransactions callback (fixes Part 1 and 2)
      Part 1: once the employees promise is resolved, the loading is finished rather than when both paginatedTransactions' promise and 
      employees' promise are resolved
      Part 2: moving the setIsLoading(false) before paginatedTransactions fixes part 2 because we no longer need to wait for the next page of paginated data
        to be fetched for the employees to show up
    Bug 6 fixes
      - added boolean conditional before rendering View More button to check whether 
        the transaction is by an employee (in which case it isn't paginated per the README and therefore no need to render View More button)
      - added boolean conditional before rendering View More button to check whether 
        the transaction (if paginated) has a next page. if it doesn't no need to render.
    
    Bug 7 fix
      - moved invalidate data after the fetch since nulling the state variable fetching causes any approval changes to be lost
*/
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  // called when All Employee transactions need to be fetched
  const loadAllTransactions = useCallback(async () => { 
    setIsLoading(true)
    await employeeUtils.fetchAll()
    /* 
      Bug 5 fix
      Part 1: once the employees promise is resolved, the loading is finished rather than when both paginatedTransactions' promise and 
      employees' promise are resolved
      Part 2: moving the setIsLoading(false) before paginatedTransactions fixes part 2 because we no longer need to wait for the next page of paginated data
        to be fetched for the employees to show up
    */
    setIsLoading(false) // moved setIsLoading(false) after employees callback and before paginatedTransactions callback (fixes Part 1 and 2)
    await paginatedTransactionsUtils.fetchAll()
    
    /*
      Bug 7 fix
      moved transactionsByEmployeeUtils.invalidateData() the fetch since nulling the state variable fetching causes any approval changes to be lost
    */
    transactionsByEmployeeUtils.invalidateData()

  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback( // called when a specific employee's transactions need to be fetched
    async (employeeId: string) => {
      await transactionsByEmployeeUtils.fetchById(employeeId)
      /*
        Bug 7 fix
        moved paginatedTransactionsUtils.invalidateData() after the fetch since nulling the state variable fetching causes any approval changes to be lost
      */
      paginatedTransactionsUtils.invalidateData()
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            /*
              Bug 3 fix
                - call loadAllTransactions() if newValue's (if it exists) id, when the onChange callback is called, is empty
            */
            // We want to check if newValue id is null since the All Employee object does exist so the initial newValue === null would never validate even if there's no id.
            if (!newValue?.id) { 
              // Bug 3 fix
              await loadAllTransactions() 
              return
            }

            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} /> 
          {
            /* Bug 6 fixes
              - added boolean conditional before rendering View More button to check whether 
                the transaction is by an employee (in which case it isn't paginated per the README and therefore no need to render View More button)
              - added boolean conditional before rendering View More button to check whether 
                the transaction (if paginated) has a next page. if it doesn't no need to render.
            */
            paginatedTransactions &&  
            paginatedTransactions?.nextPage !== null &&
            transactions !== null && 
            ( 
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
