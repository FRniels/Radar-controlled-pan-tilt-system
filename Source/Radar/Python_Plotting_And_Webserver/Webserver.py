from flask import Flask, render_template, jsonify
import random
import time

app = Flask(__name__)

# Simulate point cloud data
def generate_fake_data():
    points = [{'x': random.uniform(0, 5), 'y': random.uniform(0, 5)} for _ in range(10)]
    clusters = [{'cx': sum(p['x'] for p in points)/len(points), 'cy': sum(p['y'] for p in points)/len(points)}]
    return {'points': points, 'clusters': clusters, 'timestamp': time.time()}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def data():
    return jsonify(generate_fake_data())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
