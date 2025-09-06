# FinSight UX/UI User Stories

## Phase 1 — Onboarding & Portfolio Setup

### 1. User Registration & Secure Login
- **FS-1.1**: Modal Structure **[Completed]**
  - Create a modal with two tabs: Login and Sign Up.
- **FS-1.2**: Branding **[Completed]**
  - Display the FinSight logo and tagline at the top of the modal.
- **FS-1.3**: Login Form **[Completed]**
  - Minimalist input fields for email and password with floating labels (Tailwind peer styling).
  - Add a gradient accent button (`bg-gradient-to-r from-green-400 to-blue-500`) for Login.
- **FS-1.4**: Sign Up Form **[Completed]**
  - Minimalist input fields for name, email, password with floating labels.
  - Add a gradient accent button for Sign Up.
- **FS-1.5**: Responsive Design **[Completed]**
  - Ensure the modal and forms are mobile-friendly and responsive.

**FS-1.6**: AWS Cognito Integration **[Completed]**
  - Integrate AWS Cognito for authentication (signup and login working).

**FS-1.6a**: Email Confirmation After Signup **[Completed]**
  - FS-1.6a.1: Show input for confirmation code after successful signup.
  - FS-1.6a.2: Call `Auth.confirmSignUp(email, code)` to confirm user.
  - FS-1.6a.3: Show success/failure messages for confirmation.
  - FS-1.6a.4: Allow user to resend confirmation code.

  - FS-1.6a.5: Handle errors (expired/invalid code, already confirmed, etc).


**FS-1.7**: Forgot Password / Password Reset **[Enhancement – Future]**
  - FS-1.7.1: Add a "Forgot Password?" link to the login form.
  - FS-1.7.2: Show a form to enter the user's email for password reset.
  - FS-1.7.3: Send a password reset code to the user's email using AWS Cognito.
  - FS-1.7.4: Show input for the reset code and new password.
  - FS-1.7.5: Call `Auth.forgotPasswordSubmit(email, code, new_password)` to complete reset.
  - FS-1.7.6: Show success/failure messages for password reset.

**FS-1.8**: Store User Profile in DynamoDB **[Enhancement – Future]**
  - FS-1.8.1: After successful registration and email confirmation, trigger a backend process to store user profile data (name, email, Cognito user ID) in DynamoDB.
  - FS-1.8.2: Ensure idempotency (avoid duplicate records if retried).
  - FS-1.8.3: Store additional attributes as needed (e.g., registration date, onboarding status).
  - FS-1.8.4: Handle errors and show user-friendly messages if storage fails.
  - FS-1.8.5: Secure DynamoDB access (IAM roles, least privilege).

**FS-1.9**: User Profile Update/Edit **[Enhancement – Future]**
  - FS-1.9.1: Allow users to update their name, email, and password after registration.
  - FS-1.9.2: Provide a profile page/modal for editing user details.
  - FS-1.9.3: Integrate with AWS Cognito for updating user attributes.
  - FS-1.9.4: Show success/failure messages for profile updates.

**FS-1.10**: Multi-Factor Authentication (MFA) **[Enhancement – Future]**
  - FS-1.10.1: Allow users to enable/disable MFA (e.g., SMS or TOTP) for their account.
  - FS-1.10.2: Integrate MFA setup and verification with AWS Cognito.
  - FS-1.10.3: Show prompts for MFA during login if enabled.
  - FS-1.10.4: Handle errors and fallback scenarios for MFA.

**FS-1.11**: Session Management **[Enhancement – Future]**
  - FS-1.11.1: Implement auto-logout on token expiry or inactivity.
  - FS-1.11.2: Support session refresh/renewal for seamless user experience.
  - FS-1.11.3: Show user feedback on session timeout or renewal.

**FS-1.12**: Terms of Service & Privacy Policy Acceptance **[Enhancement – Future]**
  - FS-1.12.1: Require users to accept ToS and Privacy Policy during registration.
  - FS-1.12.2: Store acceptance status in user profile (DynamoDB or Cognito attribute).
  - FS-1.12.3: Provide links to ToS and Privacy Policy in the registration form.


### 2. Risk Appetite & Allocation Setup

- **FS-2.1**: Stepper Wizard **[Completed]**
  - Scaffold a new page `/risk-allocation` with a multi-step wizard UI for onboarding.
  - Each step should be modular and allow navigation (next/back).
  - Steps: Welcome, Risk Questions, Asset Allocation, Review & Confirm.


  - **FS-2.1a**: Move Chart Legend to Right Side of Pie Chart **[Enhancement – Future]** 
  — Move the asset allocation pie chart legend from below the chart to the right side for improved visual balance and better use of horizontal space. The legend should be a single, clean vertical column with color bars and clear labels, matching the chart’s color scheme. The total allocation percentage should remain visible and visually distinct, positioned above or beside the legend as appropriate.

- **FS-2.2**: Sliders for Allocation **[Completed]**
  - Implement interactive sliders for asset allocation (e.g., equity, debt, gold, etc.).
  - Use Tailwind range input and show real-time value.
  - Integrate with the stepper wizard as a step.

- **FS-2.3**: Pie Chart Visualization **[Completed]**
  - Show a live-updating pie chart (Chart.js or Recharts) reflecting slider values.
  - Place alongside or below sliders for instant feedback.

- **FS-2.4**: Allocation Validation **[Completed]**
  - Validate that total allocation equals 100%.
  - Show warnings or prevent navigation if invalid.

- **FS-2.5**: Client-side Calculation **[Not Started]**
  - Suggest optimal allocation based on user risk profile and answers.
  - Show suggestions and allow user to accept or adjust.

- **FS-2.6**: Save Preferences **[Not Started]**
  - Save allocation preferences to DynamoDB via API.
  - Show confirmation and allow user to revisit/edit later.

### 3. Instrument Type Auto-Classification
- **FS-3.1**: Search Bar **[Not Started]**
  - Minimal search bar with live results dropdown for stock lookup.
- **FS-3.2**: Classification Badge **[Not Started]**
  - Show a badge with classification (`bg-green-100 text-green-800 rounded`) after selection.
- **FS-3.3**: Market Cap API **[Not Started]**
  - Integrate with NSE/BSE API for market cap classification.
- **FS-3.4**: Lambda Caching **[Not Started]**
  - Use Lambda to fetch and cache results in DynamoDB.

## Phase 2 — Investment Data Entry & Tracking

### 4. Add Investment Screen
- **FS-4.1**: Tab Navigation **[Not Started]**
  - Tab navigation for asset types (stocks, MFs, bonds, gold, crypto).
- **FS-4.2**: Minimal Forms **[Not Started]**
  - Minimal fields for each asset type, autofill from APIs when possible.
- **FS-4.3**: Date Picker **[Not Started]**
  - Date picker with Tailwind `ring-2 focus:ring-blue-400` style.
- **FS-4.4**: Sticky Save Button **[Not Started]**
  - Sticky “Save Investment” button at the bottom of the form.
- **FS-4.5**: DynamoDB Storage **[Not Started]**
  - Store investment records in DynamoDB (PK=user_id, SK=investment_id).
- **FS-4.6**: S3 Upload (Optional) **[Not Started]**
  - Allow S3 upload for investment proof.

### 5. Bulk Upload via Excel
- **FS-5.1**: Drag-and-Drop Zone **[Not Started]**
  - Drag-and-drop zone with dashed border and file icon (heroicons-outline).
- **FS-5.2**: Progress Bar **[Not Started]**
  - Progress bar with Tailwind animation (`animate-pulse`).
- **FS-5.3**: S3 File Upload **[Not Started]**
  - Upload Excel file to S3.
- **FS-5.4**: Lambda Parsing **[Not Started]**
  - Lambda function to parse Excel and store in DynamoDB.

## Phase 3 — Insights & Dashboard

### 6. Portfolio Dashboard
- **FS-6.1**: KPI Cards **[Not Started]**
  - KPI cards at top (Portfolio Value, Daily Change, CAGR, YTD Returns).
- **FS-6.2**: Allocation Pie Chart **[Not Started]**
  - Pie chart for asset allocation.
- **FS-6.3**: Growth Line Chart **[Not Started]**
  - Line chart for portfolio growth over time.
- **FS-6.4**: News Ticker **[Not Started]**
  - News ticker at bottom with relevant stock/fund news.
- **FS-6.5**: Data API **[Not Started]**
  - Use Lambda API to pull dashboard data.
- **FS-6.6**: Static Assets **[Not Started]**
  - Store static assets in S3 as needed.

### 7. Performance Over Time
- **FS-7.1**: Line Chart **[Not Started]**
  - Line chart with zoom and hover tooltips for historical performance.
- **FS-7.2**: Time Range Toggle **[Not Started]**
  - Toggle between 1M, 3M, 6M, 1Y, All.
- **FS-7.3**: Dark Mode **[Not Started]**
  - Support dark mode-friendly color palette.
- **FS-7.4**: Historical Data Storage **[Not Started]**
  - Store daily snapshots in DynamoDB.
- **FS-7.5**: AppSync GraphQL **[Not Started]**
  - Use AWS AppSync GraphQL for fetching historical data.

### 8. Benchmark Comparison
- **FS-8.1**: Dual-Line Chart **[Not Started]**
  - Dual-line comparison chart for user vs. benchmark.
- **FS-8.2**: Highlight Segments **[Not Started]**
  - Highlight outperforming/underperforming segments in color.
- **FS-8.3**: Benchmark API **[Not Started]**
  - Integrate with external market API for benchmark data.
- **FS-8.4**: Cache Results **[Not Started]**
  - Cache benchmark results in DynamoDB.

## Phase 4 — Advanced Features

### 9. Alerts & Notifications
- **FS-9.1**: Bell Icon **[Not Started]**
  - Bell icon with badge in top navbar for notifications.
- **FS-9.2**: Slide-Out Panel **[Not Started]**
  - Slide-out panel with notifications grouped by category.
- **FS-9.3**: Animations **[Not Started]**
  - Soft animations when new alerts arrive.
- **FS-9.4**: SNS Integration **[Not Started]**
  - Use AWS SNS for push/email alerts.
- **FS-9.5**: TTL Expiry **[Not Started]**
  - Use DynamoDB TTL for expiring alerts.

### 10. Tax & Dividend Reports
- **FS-10.1**: Data Table **[Not Started]**
  - Data table with sorting and filtering for tax/dividend records.
- **FS-10.2**: Summary Card **[Not Started]**
  - Summary card with “Estimated Tax” and “Total Dividend”.
- **FS-10.3**: Lambda Tax Logic **[Not Started]**
  - Lambda function for tax calculation.
- **FS-10.4**: Transaction Storage **[Not Started]**