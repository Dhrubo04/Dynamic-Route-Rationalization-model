from flask import Flask, render_template, request, jsonify
import json

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_data', methods=['GET'])
def get_data():
    # Example endpoint to return data if needed by your JavaScript
    data = {
        "example": "data"
    }
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
