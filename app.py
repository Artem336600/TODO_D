from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import json
import os
import uuid
from models import User, Project, db
from forms import LoginForm, RegistrationForm
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Замените на случайный секретный ключ
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация базы данных
db.init_app(app)

# Инициализация Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите, чтобы получить доступ к этой странице.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Создание всех таблиц в базе данных
with app.app_context():
    db.create_all()

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
@login_required
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            flash('Вы успешно вошли в систему', 'success')
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('index'))
        else:
            flash('Неверное имя пользователя или пароль', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Проверяем, существует ли пользователь с таким именем или email
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Пользователь с таким именем уже существует', 'error')
            return render_template('register.html')
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            flash('Этот email уже зарегистрирован', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Пароли не совпадают', 'error')
            return render_template('register.html')
        
        # Создаем нового пользователя
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Регистрация успешна! Теперь вы можете войти', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы', 'info')
    return redirect(url_for('login'))

@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    # Получаем проекты текущего пользователя
    projects = Project.query.filter_by(user_id=current_user.id).all()
    projects_data = [project.to_dict() for project in projects]
    return jsonify({"projects": projects_data})

@app.route('/api/projects/<project_id>', methods=['GET'])
@login_required
def get_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    
    if project:
        return jsonify(project.to_dict())
    
    return jsonify({"error": "Проект не найден"}), 404

@app.route('/api/projects', methods=['POST'])
@login_required
def save_project():
    project_data = request.json
    
    if 'id' in project_data and project_data['id']:
        # Обновляем существующий проект
        project = Project.query.filter_by(id=project_data['id'], user_id=current_user.id).first()
        
        if not project:
            return jsonify({"error": "Проект не найден или у вас нет прав доступа"}), 403
        
        project.name = project_data['name']
        project.set_structure(project_data.get('structure', []))
    else:
        # Создаем новый проект
        project = Project(
            name=project_data['name'],
            user_id=current_user.id
        )
        project.set_structure(project_data.get('structure', []))
        db.session.add(project)
    
    db.session.commit()
    return jsonify({"success": True, "project": project.to_dict()})

@app.route('/api/projects/<project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    
    if project:
        db.session.delete(project)
        db.session.commit()
        return jsonify({"success": True})
    
    return jsonify({"error": "Проект не найден"}), 404

if __name__ == '__main__':
    app.run(debug=True) 