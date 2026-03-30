import numpy as np
import pandas as pd
from textblob import TextBlob
import math

class MLEngine:
    @staticmethod
    def get_ensemble_signal(technicals, sentiment_score, fundamentals):
        """
        Combines multiple modalities into a single weighted signal.
        """
        # 1. Technical Weight (Base 40%)
        tech_score = 0
        if technicals.get('rsi', 50) < 30: tech_score += 1.0
        elif technicals.get('rsi', 50) > 70: tech_score -= 1.0
        
        price_vs_sma20 = technicals.get('price', 0) / technicals.get('sma_20', 1)
        tech_score += (price_vs_sma20 - 1) * 10 # Reward being above SMA
        
        # 2. Sentiment Weight (Base 35%)
        sent_weight = sentiment_score * 2 # Normalize -1 to 1 to a larger impact
        
        # 3. Fundamental Weight (Base 25%)
        fund_score = 0
        roe = fundamentals.get('roe', 0)
        pe = fundamentals.get('peRatio', 20)
        
        if roe is None: roe = 0
        if pe is None: pe = 20
        
        if roe > 15: fund_score += 0.5
        if pe < 25: fund_score += 0.5
        
        # Weighted Ensemble
        # total_score = (tech * 0.4) + (sent * 0.35) + (fund * 0.25)
        raw_score = (tech_score * 0.4) + (sent_weight * 0.35) + (fund_score * 0.25)
        
        # Softmax-like Confidence
        confidence = min(100, max(0, int((abs(raw_score) / 0.8) * 100)))
        if raw_score > 0.15: signal = "BUY"
        elif raw_score < -0.15: signal = "SELL"
        else: signal = "HOLD"
        
        # Insights Generation (Pros/Cons)
        insights = {"pros": [], "cons": []}
        
        # Tech Insights
        if technicals.get('rsi', 50) < 35: insights["pros"].append("RSI shows Oversold (Rebound Potential)")
        elif technicals.get('rsi', 50) > 65: insights["cons"].append("RSI shows Overbought (Pullback Risk)")
        
        if price_vs_sma20 > 1.02: insights["pros"].append("Strong bullish momentum above 20-day SMA")
        elif price_vs_sma20 < 0.98: insights["cons"].append("Trading below major average (Bearish Trend)")
        
        # Sentiment Insights
        if sentiment_score > 0.2: insights["pros"].append("Highly positive market sentiment & news")
        elif sentiment_score < -0.2: insights["cons"].append("Negative sentiment spike detected")
        
        # Fundamental Insights
        if roe > 15: insights["pros"].append("Strong Capital Efficiency (High ROE)")
        if pe < 20: insights["pros"].append("Valuation is Attractive (Low P/E)")
        elif pe > 40: insights["cons"].append("Stock may be Overvalued (High P/E)")

        return {
            "signal": signal,
            "confidence": int(confidence),
            "weights": {
                "technical": round(float(abs(tech_score * 0.4)), 2),
                "sentiment": round(float(abs(sent_weight * 0.35)), 2),
                "fundamental": round(float(abs(fund_score * 0.25)), 2)
            },
            "insights": insights,
            "raw_score": float(raw_score)
        }

    @staticmethod
    def generate_forecast(history_data, days=7):
        """
        Generates a 7-day price probability zone using trend and volatility.
        """
        if not history_data or len(history_data) < 5:
            return []

        prices = np.array(history_data)
        last_price = prices[-1]
        
        # Simple Linear Trend
        try:
            x = np.arange(len(prices))
            slope, intercept = np.polyfit(x, prices, 1)
        except:
            slope = 0 # Fallback to no trend
            
        # Volatility (Std Dev of returns)
        returns = np.diff(prices) / prices[:-1]
        returns = returns[~np.isnan(returns) & ~np.isinf(returns)]
        volatility = np.std(returns) if len(returns) > 0 else 0.02
        
        forecast = []
        for i in range(1, days + 1):
            projected_trend = last_price + (slope * i)
            # Confidence interval grows over time (Square root of time Rule)
            upper_bound = projected_trend * (1 + (volatility * math.sqrt(i) * 1.5))
            lower_bound = projected_trend * (1 - (volatility * math.sqrt(i) * 1.5))
            
            forecast.append({
                "day": i,
                "projected": round(float(projected_trend), 2),
                "upper": round(float(upper_bound), 2),
                "lower": round(float(lower_bound), 2)
            })
            
        return forecast

    @staticmethod
    def detect_anomalies(history_data, volumes):
        """
        Identifies 'Whale Activity' using Z-Score on volume.
        """
        if not volumes or len(volumes) < 10:
            return False
        
        vols = np.array(volumes)
        mean_vol = np.mean(vols)
        std_vol = np.std(vols)
        
        if std_vol == 0: return False
        
        last_vol = vols[-1]
        z_score = (last_vol - mean_vol) / std_vol
        
        # Z-Score > 2.5 is a significant anomaly
        return bool(z_score > 2.5)
