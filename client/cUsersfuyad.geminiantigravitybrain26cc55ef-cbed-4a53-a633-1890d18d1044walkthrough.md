
## Unified Staff Profile Architecture & Payment Security

### Changes Made
- **Global Navigation**: Renamed the "Attendance" sidebar item to "Profile" and restricted its visibility to only `STAFF` and `TEAM_LEADER` roles. Higher-up admins will use the `Staff` directory route instead.
- **Account Layout Refactor**: Converted the basic profile overview in `client/src/components/account/account.tsx` into a fully tabbed interface matching the V2 premium design style. This includes:
  - **Overview**: Personal and official staff details.
  - **Attendance Record**: Rendered via `StaffAttendanceTab`.
  - **Leave Applications**: Rendered via `StaffLeaveTab`.
  - **Overtime Records**: Rendered via `StaffOvertimeTab`.
  - **Payment History**: Rendered via `PaymentHistoryTab`.
- **Payment Security & Obfuscation**: Modified `client/src/app/(root)/staffs/[id]/_components/payment-history-tab.tsx` to automatically blur the salary/overtime payment amounts for users without Admin privileges viewing the history. A "See" hover button now triggers the existing `SalaryPinDialog`, requiring the user to authenticate their PIN before unblurring the amounts for the session.

### Validation
- Validated role-based logic to conditionally restrict the global navigation sidebar item to Staff levels.
- Validated role-based logic inside the PaymentHistory tab that strictly evaluates obfuscation against the current user's role.
- Compiled the client repository using TypeScript and successfully passed ESLint configurations.
