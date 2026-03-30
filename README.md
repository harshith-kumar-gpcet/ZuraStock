# ZuraStock — AI-Powered Stock Analytics Platform

ZuraStock is a premium, full-stack Fintech application designed to provide traders and investors with deep algorithmic insights and comprehensive financial data. It combines a stunning modern user interface with powerful backend analytics to help users make informed decisions.

---

## 🚀 Key Features

### 1. **Premium Fintech Interface**
- **Glassmorphism Design**: High-end aesthetic using semi-transparent layers, backdrop blurring, and subtle borders.
- **Interactive Micro-animations**: Real-time price pulsing, smooth hover transitions, and dynamic chart rendering.
- **Optimized Layout**: Centered **1100px compact view** for a stable, high-end desktop experience.

### 2. **AI-Driven Algorithmic Analysis**
- **Smart Signals**: Real-time "BUY", "SELL", or "HOLD" recommendations based on technical indicators.
- **Confidence Meter**: Visual representation of the model's certainty.
- **Pros & Cons Breakdown**: Detailed technical justification (RSI, Moving Averages, Momentum).

### 3. **Market Hub & Intelligence**
- **Market News Shorts**: Way2News-style concise news cards in a horizontal slider with full modal summaries.
- **Market Calendar**: Integrated sidebar calendar showing trading days, market holidays, and current status.
- **Smart Company Profiles**: redsigned profile section with "Read More" toggles and structured identity cards.

### 4. **Real-time Data Infrastructure**
- **WebSocket Integration**: Live price streams that update without page refreshes.
- **Universal Search**: Fast lookups for any NSE stock symbol.
- **Deep Fundamentals**: 4-year financial growth charts (Revenue vs Net Income) and core health metrics.

---

## 🛠️ Tech Stack

### **Frontend**
- **HTML5 & Vanilla JavaScript (ES6+)**: Core structure and dynamic logic.
- **Tailwind CSS**: Utility-first styling for a custom, professional UI.
- **Chart.js**: High-performance data visualization for price and growth trends.
- **FontAwesome**: High-quality vector icons.

### **Backend**
- **FastAPI (Python)**: High-performance, modern web framework.
- **yfinance**: Reliable market data extraction from Yahoo Finance.
- **TA-Lib (ta library)**: Technical analysis indicators.
- **Pandas**: Structured data processing.
- **Uvicorn**: ASGI server for low-latency performance.

---

## 📂 Project Structure

```text
stockmarketproject/
├── backend/
│   ├── main.py             # FastAPI Server & AI Logic
│   ├── requirements.txt    # Python Dependencies
│   └── venv/               # Virtual Environment
├── dashboard.html          # Main Market Overview
├── stock.html              # Individual Stock Analysis & Trading
├── login.html              # Secure Authentication
├── register.html           # User Onboarding
└── README.md               # Project Documentation
```

---

## 🏁 Getting Started

### **Step 1: Backend Setup**
1. Open a terminal in the `backend/` folder.
2. Ensure you have the dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python main.py
   ```
   *The server will run at `http://localhost:8000`*

### **Step 2: Frontend Launch**
1. Simply open `dashboard.html` or `stock.html` in any modern web browser.
2. Make sure the backend terminal is running in the background to see live data and AI insights.

---

## 💡 Usage Notes
- **Searching**: Use the search bar in the dashboard to find any stock (e.g., "TCS", "INFY", "AAPL").
- **Predicting**: Click on the "Predict" button to open the detailed analysis page with Glassmorphism UI.
- **Real-time Status**: Look for the "Live Stream Connected" badge in the header to ensure you're receiving real-time updates.

---

## 🏆 Project Highlight
This project stands out by bridging the gap between raw data and actionable insight. By combining **Technical Analysis** (Moving Averages, RSI) with **Fundamental Metrics** (Growth trends), it provides a holistic view of stock performance suitable for both short-term traders and long-term investors.

how to run project
1. Start the ML Backend (FastAPI)
# 1. Navigate to backend
cd backend

# 2. Activate Virtual Environment (if not active)
.\venv\Scripts\activate

# 3. Install Dependencies (first time only)
pip install -r requirements.txt

# 4. Launch the Server
python main.py

2. Launch the Frontend
The frontend consists of static HTML/CSS/JS files. You can run it in two ways:

Option A (Recommended): Use the Live Server extension in VS Code. Right-click dashboard.html and select "Open with Live Server".
Option B: Simply double-click dashboard.html in your file explorer to open it in your browser.
