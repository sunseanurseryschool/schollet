# Financial Rules

- Every money movement must:
  - Create journal entry
  - Be immutable (no delete, only reverse)

- Discount must:
  - Have description

- Fee payment must:
  - Be transactional

- No direct DB manipulation without logging

- Reports must derive from ledger only