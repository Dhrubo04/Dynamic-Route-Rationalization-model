from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Load the trained model
model = joblib.load('duration_predictor_model.joblib')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_predicted_duration', methods=['GET'])
def get_predicted_duration():
    data = request.json
    hour = data['hour']
    day_of_week = data['day_of_week']
    distance = data['distance']
    duration_in_traffic = data['duration_in_traffic']
    
    # Prepare the feature vector
    features = [[distance, duration_in_traffic, hour, day_of_week]]
    
    # Predict the duration
    predicted_duration = model.predict(features)[0]
    
    return jsonify({'predicted_duration': predicted_duration})

if __name__ == '__main__':
    app.run(debug=True)
