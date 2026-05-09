🧑‍🎓 Students

students (
  id PK
  admission_no
  name
  grade
  section
  status
  created_at
)

----------------------------------------------------------------------

💰 Fee Config

fee_configs (
  id PK
  grade
  total_fee
  created_at
)

fee_heads (
  id PK
  fee_config_id FK
  name
  amount
)

----------------------------------------------------------------------

🧾 Fee Transactions

fee_transactions (
  id PK
  student_id FK
  total_fee
  paid_amount
  discount_amount
  discount_reason
  payment_mode
  received_by
  receipt_no
  payment_date
)

----------------------------------------------------------------------

🧮 Accounts

accounts (
  id PK
  name
  type (INCOME, EXPENSE, ASSET, LIABILITY)
)

journal_entries (
  id PK
  date
  reference_type (FEE, SALARY, EXPENSE)
  reference_id
)

journal_lines (
  id PK
  journal_id FK
  account_id FK
  debit
  credit
)

----------------------------------------------------------------------

👨‍🏫 Staff

staff (
  id PK
  name
  role_id FK
  salary
)

----------------------------------------------------------------------

🔐 Roles

roles (
  id PK
  name
)

permissions (
  id PK
  code
)

role_permissions (
  role_id FK
  permission_id FK
)

----------------------------------------------------------------------

📦 Inventory

inventory_items (
  id PK
  name
  quantity
  unit
)

inventory_transactions (
  id PK
  item_id FK
  type (IN, OUT)
  quantity
  date
)

----------------------------------------------------------------------

🧾 Expenses

expenses (
  id PK
  amount
  category
  description
  paid_by
  date
)

----------------------------------------------------------------------

📊 Audit Logs

audit_logs (
  id PK
  user_id
  action
  entity
  entity_id
  timestamp
)

----------------------------------------------------------------------

🏷️ Reason Tags

reason_tags (
  id PK
  name
  type (DISCOUNT, EXPENSE)
)