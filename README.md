# 💳 AutoPay Manager – Smart Subscription Tracker

**A full-stack application designed to automate subscription management, track global expenses with real-time currency conversion, and provide financial insights through an interactive dashboard.**

---

## 🚀 Core Features

- **Automated Email Notifications:** Integrated with **Resend API** to send automated payment receipts and "Low Balance" alerts.
- **Multi-Currency Intelligence:** Real-time conversion (USD/EUR/GBP to INR) using **ExchangeRate-API** to track international subscription costs accurately.
- **Dynamic Analytics:** Interactive spending visualization featuring monthly trends and category-wise breakdowns.
- **Secure Authentication:** OTP-based mobile login via SMS (2factor.in) with a structured Node.js backend.
- **Auto-Deduction Engine:** Processes due payments automatically on login with balance protection and failure alerts.
- **Dark Mode Support:** A sleek, fully-responsive UI with sidebar navigation.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS, HTML, Tailwind CSS, Chart.js
- **Backend:** Node.js (built-in `http` module)
- **APIs:** Resend (Email), ExchangeRate-API (Currency), 2factor.in (SMS OTP)
- **Storage:** localStorage (client-side)
- **Android:** Mobile-ready architecture with secure Kotlin/Retrofit API handling

---

## ⚙️ Setup & Installation

### 1. Clone the Repo

```bash
git clone https://github.com/Swatii2810/AutoPay-Manager.git
cd AutoPay-Manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your keys — see `.env.example` for all required variables.

### 4. Run the App

```bash
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🔒 Security First

This project follows industry-standard security practices:

- **Environment Isolation:** All sensitive API keys are handled via `.env` and `android/local.properties` — both gitignored.
- **Zero Hardcoding:** A full security sweep was performed to ensure no credentials exist in the source code.
- **Server-Side Proxy:** All third-party API calls are proxied through `server.js` so keys are never exposed to the browser.

---

## 📁 Project Structure

```
autopay-manager/
├── public/             # Frontend — HTML + JS (served by server.js)
│   ├── index.html
│   └── app.js
├── android/            # Android mobile app (Kotlin)
├── docs/               # Design specs and archived prototypes
├── server.js           # Node.js HTTP server + API proxy
├── .env.example        # Environment variable template
├── package.json
└── README.md
```
