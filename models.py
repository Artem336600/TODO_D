from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json
import datetime

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Отношение один-ко-многим с проектами
    projects = db.relationship('Project', backref='owner', lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    structure = db.Column(db.Text, default='[]')  # JSON сохраняется в виде текста
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Внешний ключ для связи с пользователем
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def get_structure(self):
        """Получить структуру проекта в виде объекта Python"""
        return json.loads(self.structure)
    
    def set_structure(self, structure):
        """Сохранить структуру проекта"""
        self.structure = json.dumps(structure, ensure_ascii=False)
    
    def to_dict(self):
        """Преобразовать проект в словарь для API"""
        return {
            'id': self.id,
            'name': self.name,
            'structure': self.get_structure(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Project {self.name}>' 