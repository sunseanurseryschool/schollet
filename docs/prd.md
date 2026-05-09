📘 PRODUCT REQUIREMENTS DOCUMENT (PRD)
🧭 Product Name

Schollet
Motto: Track every rupee. Nothing else.

🎯 Objective

Build a centralized system to:

Track income & expenses
Manage student fee collection
Handle staff salary
Maintain inventory
Provide accurate financial reports

🚫 Explicitly out of scope:

Exams
Student performance
Academic tracking
👥 User Roles
1. Admin (Default)
Full access
Manage configs, roles, accounts
2. Staff (Custom Roles)
Fee collection
Expense entry
Inventory updates
Reports (based on role)
🔐 Role-Based Access (RBAC)

Each role has permissions like:

CAN_COLLECT_FEES
CAN_ADD_EXPENSE
CAN_VIEW_REPORTS
CAN_MANAGE_STAFF
CAN_MANAGE_INVENTORY