"""
Скрипт для инициализации базы данных.
Запускается один раз при первом развертывании на Railway.
"""
from app import app, db
from models import User, Project

def init_db():
    """Инициализирует базу данных."""
    with app.app_context():
        print("Создание таблиц...")
        db.create_all()
        print("Таблицы созданы!")
        
        # Проверка на наличие дефолтного пользователя
        default_user = User.query.filter_by(username='admin').first()
        if not default_user:
            print("Создание дефолтного пользователя...")
            admin = User(username='admin', email='admin@example.com')
            admin.set_password('changeme123')  # Изменить после первого входа
            db.session.add(admin)
            db.session.commit()
            print("Дефолтный пользователь создан!")
        else:
            print("Дефолтный пользователь уже существует.")

if __name__ == '__main__':
    init_db() 