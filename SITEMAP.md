# V-FACE Application Site Map

## 📱 Application Structure

### 1. **Dashboard**
   - **Landing Page** → Entry point with wallet connection
     - Hero Section
     - Call-to-Action (Connect Wallet)
     - Feature Overview
   
   - **Dashboard Main** → Analytics & Statistics
     - Total Registrations
     - Verification Success Rate
     - Network Status
     - Recent Activity

### 2. **Playground (Interactive Testing)**
   - **Register Tab**
     - Face Capture (Webcam)
     - Fingerprint Generation
     - Wallet Signature
     - Identity Registration
   
   - **Verify Tab**
     - Face Capture (Webcam)
     - Fingerprint Lookup
     - Similarity Search
     - Match Results
   
   - **Consent Tab**
     - Identity Selection
     - Consent Management
     - Token Issuance
     - Permission Settings
   
   - **Inspect Tab**
     - Token Details
     - Identity Information
     - Fingerprint Data
     - Transaction History

### 3. **Navigation Structure**

```
Home (Landing)
├── Dashboard
│   ├── Overview
│   ├── Analytics
│   └── Settings
│
└── Playground
    ├── Register
    ├── Verify
    ├── Consent
    └── Inspect
```

### 4. **Key Components**

#### Global
- **Navbar** - Navigation with wallet connection
- **Layout** - Main container with responsive structure
- **AnimatedBackground** - Visual enhancement

#### Dashboard-Specific
- **Dashboard** - Main statistics panel
- **FaceScanner** - Camera interface
- **VerificationModal** - Verification results display

#### Playground-Specific
- **Register** - Face registration workflow
- **Verify** - Face verification workflow  
- **Consent** - Consent and permission management
- **Inspect** - Token and identity inspection

### 5. **User Flows**

#### Registration Flow
```
Landing → Connect Wallet → Playground → Register Tab
       → Capture Face → Generate Fingerprint → Sign Message
       → Register Identity → Success
```

#### Verification Flow
```
Verify Tab → Capture Face → Generate Fingerprint
         → Search Registry → Similarity Match → Results
```

#### Token Issuance Flow
```
Consent Tab → Select Identity → Set Permissions
          → Generate Token → Transaction → Inspect Tab
```

### 6. **API Endpoints & Services**

- **Face Registration** - `/api/register`
- **Face Verification** - `/api/verify`
- **Consent Management** - `/api/consent`
- **Token Inspection** - `/api/inspect`
- **Wallet Connection** - MetaMask/Web3 integration

### 7. **Context & State Management**

- **WalletContext** - Blockchain wallet state
  - Account
  - Signer
  - Connected status
  - SDK instance

- **Local State** (per component)
  - Capture state
  - Loading states
  - Error handling
  - Results display

### 8. **Responsive Breakpoints**

- **Mobile** - < 768px (md breakpoint)
- **Tablet** - 768px - 1024px
- **Desktop** - > 1024px

## 📊 User Journey Map

### New User
1. Land on home page
2. View features & benefits
3. Connect wallet
4. Navigate to playground
5. Register face for first time
6. Receive identity confirmation

### Returning User
1. Land on home page
2. Connect wallet (if disconnected)
3. Access dashboard
4. Verify face or issue token
5. View transaction history

### Developer
1. Access documentation
2. Review API specifications
3. Integrate SDK
4. Test with playground
5. Deploy to production

## 🎨 Design System

### Color Palette
- **Primary** - Cyan (#06B6D4, #00D9FF)
- **Secondary** - Purple (#A855F7, #D946EF)
- **Background** - Gray-900 (#111827)
- **Surface** - Gray-800 (#1F2937)
- **Text** - Gray-100 (#F3F4F6)
- **Accent** - Green (#22C55E) for success

### Typography
- **Headlines** - Bold, tracking-tight
- **Body** - Regular, readable font
- **Monospace** - For technical data (fingerprints, hashes)

### Spacing Scale
- **xs** - 4px
- **sm** - 8px
- **md** - 16px
- **lg** - 24px
- **xl** - 32px

### Component Patterns
- **Buttons** - Gradient backgrounds, hover effects
- **Cards** - Bordered containers with padding
- **Inputs** - Dark themed with clear focus states
- **Modals** - Animated overlays with backdrop blur

---

**Last Updated:** February 18, 2026
