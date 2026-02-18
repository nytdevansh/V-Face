# V-FACE Application Wireframes & Layout Guide

## 1. Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  V-FACE                          [Connect Wallet]    │  ← Navigation Header
├─────────────────────────────────────────────────────┤
│                                                      │
│                    ╔═══════════════╗                │
│                    ║   V-FACE      ║                │
│                    ║  IDENTITY     ║                │
│                    ║               ║                │
│                    ╚═══════════════╝                │
│                                                      │
│                 Immutable Identity Protocol          │
│                                                      │
│        Reclaim your biometric sovereignty...        │
│                                                      │
│              [CONNECT WALLET BUTTON]                │
│                                                      │  ← Hero Section
│          ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│          │  Shield  │  │ Blockchain           │  │
│          │  Security │  │ Immutable    │ Access │  │
│          │          │  │             │ Control │  │
│          └──────────┘  └──────────┘  └──────────┘  │
│                                                      │
│        POLYGON MAINNET | AUDITED | OPEN SOURCE      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 2. Playground Interface Layout

```
┌──────────────────────────────────────────────────────────────┐
│  V-FACE PLAYGROUND     [Register] [Verify] [Consent] [Inspect]  │
│                                                    [Wallet: 0x...]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Content Panel (Dynamic based on selected tab)               │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  Register Tab Content:                              │   │
│  │  ┌─────────────────┐    ┌─────────────────┐       │   │
│  │  │                 │    │                 │       │   │
│  │  │  Webcam View    │    │  Fingerprint    │       │   │
│  │  │     or Image    │    │   Display       │       │   │
│  │  │                 │    │                 │       │   │
│  │  └─────────────────┘    └─────────────────┘       │   │
│  │                                                     │   │
│  │  [Capture] [Register]      Status Messages        │   │
│  │                                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Result Panel (Success/Error Messages)              │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  POLYGON MAINNET | © 2024 V-FACE Protocol                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Register Tab Detailed Layout

```
Screen Width >= 1024px (Desktop):

┌────────────────────────────────────────────────────────────┐
│  LEFT PANEL (50%)      │  RIGHT PANEL (50%)              │
├────────────────────────┼──────────────────────────────────┤
│ ┌──────────────────┐   │  ┌──────────────────────────┐   │
│ │ 1. Capture Face  │   │  │ 2. Review Fingerprint    │   │
│ │                  │   │  │                          │   │
│ │ ┌──────────────┐ │   │  │ [FP Details]             │   │
│ │ │              │ │   │  │                          │   │
│ │ │   Webcam     │ │   │  │                          │   │
│ │ │   View       │ │   │  │                          │   │
│ │ │              │ │   │  │                          │   │
│ │ └──────────────┘ │   │  │                          │   │
│ │                  │   │  │                          │   │
│ │ [Capture]        │   │  │ Signing with Wallet...  │   │
│ └──────────────────┘   │  │ [Register]     [Reset]  │   │
│                        │  │                          │   │
│ ┌──────────────────┐   │  └──────────────────────────┘   │
│ │ Status Messages  │   │                                  │
│ │ Loading...       │   │                                  │
│ └──────────────────┘   │                                  │
└────────────────────────┴──────────────────────────────────┘

Mobile (< 1024px):

┌────────────────────────────────────────┐
│ 1. Capture Face                        │
│ ┌──────────────────────────────────┐  │
│ │      Webcam View                 │  │
│ └──────────────────────────────────┘  │
│                                        │
│ [Capture]                              │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 2. Review Fingerprint                  │
│ [FP Details Box]                       │
│ Signing Process...                     │
│ [Register]  [Reset]                    │
└────────────────────────────────────────┘
```

---

## 4. Verify Tab Detailed Layout

```
┌────────────────────────────────────────────────────────────┐
│  Verification Mode: [Scan] [Manual Input]                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Capture Face for Verification                       │  │
│  │                                                      │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │      Webcam Stream                             │  │  │
│  │ │                                                │  │  │
│  │ │                                                │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │ [Capture]                                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ VERIFICATION RESULT                                 │  │
│  │                                                      │  │
│  │ Status: ✓ MATCH FOUND                               │  │
│  │ Match Type: SIMILARITY                              │  │
│  │ Confidence: 95.2%                                   │  │
│  │                                                      │  │
│  │ Public Key: 0x1234...5678                          │  │
│  │ Fingerprint: abcd123456...                          │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Consent Tab Detailed Layout

```
┌────────────────────────────────────────────────────────────┐
│  Consent Management & Token Issuance                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Selected Identity: 0x1234...5678                          │
│  Status: Ready for Consent                                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Permissions & Consent                               │  │
│  │                                                      │  │
│  │ ☑ Face Verification Access                          │  │
│  │ ☑ Identity Sharing                                  │  │
│  │ ☐ Biometric Data Storage                            │  │
│  │ ☑ Transaction Logging                               │  │
│  │                                                      │  │
│  │ Expiry: [ Select Date ]                             │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Token Preview                                       │  │
│  │                                                      │  │
│  │ Token ID: tk_abc123...                              │  │
│  │ Issuer: wallet_address                              │  │
│  │ Expires: 2025-12-31                                 │  │
│  │                                                      │  │
│  │ [Review Full Token]                                 │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Cancel]  [Issue Token]                                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Inspect Tab Detailed Layout

```
┌────────────────────────────────────────────────────────────┐
│  Token Details & Identity Information                      │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TOKEN INFORMATION                                   │  │
│  │                                                      │  │
│  │ Token ID: tk_abcd123456...                          │  │
│  │ Status: Active ✓                                    │  │
│  │ Created: 2024-02-15 10:30:45                        │  │
│  │ Expires: 2025-02-15 10:30:45                        │  │
│  │ Issuer: 0x1234...5678                              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ IDENTITY DATA                                       │  │
│  │                                                      │  │
│  │ Fingerprint: abcd123456789...                       │  │
│  │ Public Key: 0x1234...5678                          │  │
│  │ Registration Block: 15,234,567                      │  │
│  │ Last Verification: 2024-02-18 14:22:15              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TRANSACTION HISTORY                                 │  │
│  │                                                      │  │
│  │ [2024-02-18] Verified          tx: 0x5678...       │  │
│  │ [2024-02-17] Token Issued       tx: 0x1234...       │  │
│  │ [2024-02-15] Identity Created   tx: 0x9abc...       │  │
│  │                                                      │  │
│  │ [Load More]                                         │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Export Data]  [Revoke Token]  [Copy]                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Color Key Used in Wireframes

- **Blue Accent**: Cyan/Blue (`#06B6D4`)
- **Dark Background**: Charcoal/Navy (`#111827`)
- **Border**: Dark Gray (`#374151`)
- **Success**: Green (`#22C55E`)
- **Error**: Red (`#EF4444`)

---

## 8. Navigation Flow Diagram

```
┌─────────────┐
│  Landing    │ ← User lands on dashboard
│  
└──────┬──────┘
       │ Click "Connect Wallet"
       │
       ▼
┌─────────────────┐
│ Wallet Modal    │ ← MetaMask/Wallet Connection
└──────┬──────────┘
       │ Connection successful
       │
       ▼
┌──────────────────┐
│ Playground Tabs  │
├──────────────────┤
│ Register Tab     │
│ ├─ Capture       │
│ ├─ Fingerprint   │
│ └─ Register      │
│                  │
│ Verify Tab       │
│ ├─ Capture       │
│ ├─ Search        │
│ └─ Results       │
│                  │
│ Consent Tab      │
│ ├─ Permissions   │
│ └─ Issue Token   │
│                  │
│ Inspect Tab      │
│ ├─ Token Info    │
│ ├─ Identity Data │
│ └─ History       │
└──────────────────┘
```

---

## 9. Component Hierarchy

```
App
├── AnimatedBackground
├── Navbar
└── Dashboard / Playground
    ├── Layout
    │   ├── Header (Navigation)
    │   ├── Main Content
    │   │   ├── Register Component
    │   │   │   ├── WebcamCapture
    │   │   │   └── FingerprintDisplay
    │   │   ├── Verify Component
    │   │   │   ├── WebcamCapture
    │   │   │   └── ResultsPanel
    │   │   ├── Consent Component
    │   │   │   ├── PermissionsForm
    │   │   │   └── TokenPreview
    │   │   └── Inspect Component
    │   │       ├── TokenDetails
    │   │       ├── IdentityData
    │   │       └── TransactionHistory
    │   └── Footer
    └── Modals
        ├── VerificationModal
        └── ConfirmationModal
```

---

## 10. Responsive Breakpoints

```
Mobile (< 640px)
┌─────────┐
│ Header  │ Full width, stacked
├─────────┤
│Content  │ Single column, full width
│ Stack   │ Touch-friendly buttons
│ Vertical│ Optimized for thumb navigation
├─────────┤
│ Footer  │
└─────────┘

Tablet (640px - 1024px)
┌──────────────────┐
│ Header           │ More spacing, visible tabs
├──────────────────┤
│       │          │
│ Side  │  Main    │ Two-column layout
│  nav  │ Content  │
│       │          │
├──────────────────┤
│ Footer           │
└──────────────────┘

Desktop (> 1024px)
┌──────────────────────────────┐
│ Header with Full Navigation  │
├──────────────────────────────┤
│               │              │
│    Left       │   Main       │
│   Panel       │  Content     │
│  (Related)    │   Area       │
│               │              │
|───────────────|──────────────|
│              Footer           │
└──────────────────────────────┘
```

---

## 11. State Indicators & Colors

| State | Color | Example |
|-------|-------|---------|
| Loading | Blue (Cyan) | Spinner animation |
| Success | Green | ✓ Operation complete |
| Error | Red | Message display |
| Warning | Amber | Verification warning |
| Default | Gray | Normal state |
| Hover | Brighter Cyan | Button hover |
| Focus | Cyan Ring | Keyboard focus |
| Disabled | Gray/Low Opacity | Disabled button |

---

**Last Updated:** February 18, 2026
