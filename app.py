from flask import Flask, render_template, request, jsonify
import json
import os
import uuid

app = Flask(__name__)

DATA_FILE = 'data.json'

# Инициализация файла данных, если он не существует
def init_data_file():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump({"projects": []}, f, ensure_ascii=False, indent=2)

# Загрузка данных из файла
def load_data():
    init_data_file()
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Сохранение данных в файл
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/projects', methods=['GET'])
def get_projects():
    data = load_data()
    return jsonify(data)

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    data = load_data()
    
    for project in data['projects']:
        if project['id'] == project_id:
            return jsonify(project)
    
    return jsonify({"error": "Проект не найден"}), 404

@app.route('/api/projects', methods=['POST'])
def save_project():
    data = load_data()
    project_data = request.json
    
    # Генерация ID для нового проекта, если его нет
    if 'id' not in project_data:
        project_data['id'] = str(uuid.uuid4())
    
    # Проверка существования проекта и обновление или добавление
    project_exists = False
    for i, project in enumerate(data['projects']):
        if project['id'] == project_data['id']:
            data['projects'][i] = project_data
            project_exists = True
            break
    
    if not project_exists:
        data['projects'].append(project_data)
    
    save_data(data)
    return jsonify({"success": True, "project": project_data})

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    data = load_data()
    
    for i, project in enumerate(data['projects']):
        if project['id'] == project_id:
            del data['projects'][i]
            save_data(data)
            return jsonify({"success": True})
    
    return jsonify({"error": "Проект не найден"}), 404

if __name__ == '__main__':
    init_data_file()
    app.run(debug=True) 