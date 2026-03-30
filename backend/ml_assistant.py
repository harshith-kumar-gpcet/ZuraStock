import random

class MLAssistant:
    """
    Handles natural language generation for the ZuraAI Assistant using 
    real-time market data and AI signals.
    """
    
    COMPLIMENTS = [
        "That's a great question!",
        "I was just looking at that myself.",
        "Excellent choice of stock to analyze.",
        "Let me dive into the data for you."
    ]

    @staticmethod
    def generate_response(query: str, context: dict):
        """
        Generates a natural language response based on user query and available meta-data.
        context: {
            "symbol": str,
            "price": float,
            "changePercent": float,
            "signal": str,
            "confidence": float,
            "insights": {"pros": [], "cons": []},
            "sentiment": str
        }
        """
        query = query.lower()
        symbol = context.get("symbol", "the market")
        price = context.get("price", 0)
        signal = context.get("signal", "HOLD")
        confidence = context.get("confidence", 0)
        
        # 1. Check for specific intent
        if "buy" in query or "sell" in query or "should i" in query:
            return MLAssistant._get_recommendation_text(symbol, signal, confidence, context.get("insights", {}))
            
        if "price" in query or "how much" in query:
            return f"The current price of {symbol} is ₹{price:,.2f}. It has moved {context.get('changePercent', 0):+.2f}% recently."
            
        if "sentiment" in query or "mood" in query:
            return f"The overall market mood for {symbol} is looking {context.get('sentiment', 'NEUTRAL')}. Social and news signals are mostly {context.get('sentiment', 'neutral')}."
            
        if "pros" in query or "why" in query or "strength" in query:
            pros = context.get("insights", {}).get("pros", ["Stable performance"])
            return f"The main strengths for {symbol} right now are: " + ", ".join(pros[:2]) + "."

        # Default fallback: General overview
        compliment = random.choice(MLAssistant.COMPLIMENTS)
        return f"{compliment} For {symbol}, my AI ensemble is currently showing a **{signal}** signal with **{confidence}% confidence**. The technicals suggest the trend is { 'bullish' if signal == 'BUY' else 'bearish' if signal == 'SELL' else 'neutral' }."

    @staticmethod
    def _get_recommendation_text(symbol, signal, confidence, insights):
        if signal == "BUY":
            pros = insights.get("pros", [])
            reason = pros[0] if pros else "strong momentum"
            return f"Based on my analysis, {symbol} is a **BUY**. We have high confidence ({confidence}%) due to {reason}. However, always manage your risk!"
        elif signal == "SELL":
            cons = insights.get("cons", [])
            reason = cons[0] if cons else "weak technicals"
            return f"Currently, I'm seeing a **SELL** signal for {symbol} ({confidence}% confidence). The primary concern is {reason}. It might be wise to wait for a better entry point."
        else:
            return f"I'm currently neutral on {symbol}. The technical indicators are mixed (Signals: **HOLD**). It's best to keep this on your watchlist for now."

    @staticmethod
    def get_greeting():
        return random.choice([
            "Hello! I'm Zura, your AI financial assistant. How can I help you with the market today?",
            "Hey there! Ready to discover some smart investment opportunities? Ask me anything about NSE stocks.",
            "Welcome back! I've been crunching the latest market data. What's on your mind?"
        ])
