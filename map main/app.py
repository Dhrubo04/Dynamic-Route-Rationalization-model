from flask import Flask, request, jsonify
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)

# Load the machine learning model
model = joblib.load('traffic_model (1).pkl')


@app.route('/api/get_routes', methods=['POST'])
def get_routes():
    data = request.json
    routes = data['routes']

    # Create DataFrame from routes data
    df = pd.DataFrame(routes)

    # Predict congestion for new data
    df_scaled = scaler.transform(df[['distance', 'duration', 'duration_in_traffic']])
    df['predicted_congestion'] = model.predict(df_scaled)

    # Convert DataFrame to dictionary and send back
    response = df.to_dict(orient='records')
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
