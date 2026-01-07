from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
import joblib

app = Flask(__name__)
CORS(app)

# ================= LOAD MODELS =================
lstm_model = tf.keras.models.load_model("../models/lstm/lstm_model.h5")
scaler = joblib.load("../models/lstm/scaler.pkl")

iso_model = joblib.load("../models/isolation_forest/iso_forest.pkl")

rf_regressor = joblib.load(
    "../models/random_forest/aqi_random_forest_regressor.pkl"
)

# ================= LSTM AQI FORECAST =================
@app.route("/predict-aqi", methods=["POST"])
def predict_aqi():
    try:
        data = request.get_json(force=True)
        values = data["aqi"]

        if not isinstance(values, list) or len(values) != 30:
            return jsonify({"error": "Exactly 30 AQI values required"}), 400

        arr = np.array(values, dtype=float).reshape(-1, 1)
        arr_scaled = scaler.transform(arr)
        arr_scaled = arr_scaled.reshape(1, 30, 1)

        pred = lstm_model.predict(arr_scaled, verbose=0)
        predicted_aqi = float(pred[0][0] * 500)

        return jsonify({
            "predicted_aqi": round(predicted_aqi, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ================= RF AQI REGRESSION =================
@app.route("/rf-aqi", methods=["POST"])
def rf_aqi():
    try:
        data = request.get_json(force=True)
        aqi = float(data["aqi"])

        features = np.array([[aqi] * 12])
        prediction = rf_regressor.predict(features)[0]

        prediction = max(0, min(prediction, 500))

        return jsonify({
            "rf_predicted_aqi": round(float(prediction), 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400



# ================= SPIKE DETECTION =================
@app.route("/detect-spike", methods=["POST"])
def detect_spike():
    try:
        data = request.get_json(force=True)
        aqi = float(data["aqi"])

        # Avoid false spikes for very low AQI
        if aqi < 50:
            return jsonify({"spike": False})

        result = iso_model.predict([[aqi]])
        return jsonify({
            "spike": bool(result[0] == -1)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ================= HEALTH RISK (RULE-BASED) =================
@app.route("/health-risk", methods=["POST"])
def health_risk():
    try:
        data = request.get_json(force=True)
        aqi = float(data["aqi"])

        if aqi <= 50:
            risk = "Good 🟢"
        elif aqi <= 100:
            risk = "Moderate 🟡"
        elif aqi <= 150:
            risk = "Unhealthy for Sensitive Groups 🟠"
        elif aqi <= 200:
            risk = "Unhealthy 🔴"
        elif aqi <= 300:
            risk = "Very Unhealthy 🟣"
        else:
            risk = "Hazardous ☠️"

        return jsonify({
            "risk_level": risk
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ================= HEALTH CHECK =================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "Backend running"}), 200


# ================= RUN SERVER =================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
