from openai import OpenAI
import json
import traceback
import re
import os

class AIProjectGenerator:
    def __init__(self, api_key=None):
        # Получаем API ключ из переданного параметра или из переменных окружения
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        # Инициализируем клиент как None, будем создавать его при каждом запросе
        self.client = None
        self.initialize_client()
        
    def initialize_client(self):
        """Инициализирует клиент OpenAI с безопасными настройками"""
        try:
            # Самая простая форма инициализации
            if self.api_key:
                # Передаем только API ключ, никаких дополнительных параметров
                self.client = OpenAI(api_key=self.api_key)
                print("OpenAI клиент успешно инициализирован")
            else:
                print("API ключ не предоставлен")
                self.client = None
        except Exception as e:
            print(f"Ошибка при инициализации OpenAI клиента: {str(e)}")
            self.client = None
        
    def generate_project_structure(self, prompt):
        """
        Генерирует структуру проекта на основе запроса пользователя
        
        Args:
            prompt (str): Запрос пользователя, описывающий нужный проект
            
        Returns:
            dict: Структура проекта в формате JSON
        """
        try:
            # Если клиент не инициализирован, попробуем инициализировать его снова
            if self.client is None:
                print("Попытка повторной инициализации OpenAI клиента...")
                self.initialize_client()
                
            # Проверяем снова, успешно ли инициализирован клиент
            if self.client is None:
                print("OpenAI клиент по-прежнему не инициализирован, используем заглушку")
                return self._get_sample_project(prompt)
                
            system_message = """
            Ты - ассистент, который помогает создавать структуру проектов. 
            Твоя задача - создать JSON-объект с подробной структурой проекта на основе запроса пользователя.
            
            Структура JSON должна соответствовать следующему формату:
            {
              "name": "Название проекта",
              "structure": [
                {
                  "type": "folder",
                  "name": "имя_папки",
                  "children": [
                    {
                      "type": "file",
                      "file_name": "имя_файла.py",
                      "description": "Описание файла",
                      "io_pairs": [
                        {
                          "input": { "пример": "входных данных" },
                          "output": { "пример": "выходных данных" }
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "file",
                  "file_name": "имя_файла",
                  "description": "Описание файла",
                  "io_pairs": []
                }
              ]
            }
            
            Твори полные, логичные и реалистичные файловые структуры для разных типов проектов.
            Генерируй правильные имена файлов с соответствующими расширениями для языка программирования.
            Создавай осмысленные пары входных/выходных данных для файлов, где это уместно.
            Возвращай ТОЛЬКО корректный JSON без дополнительных пояснений.
            """
            
            enhanced_prompt = f"""
            Создай подробную структуру проекта для следующего запроса:
            
            {prompt}
            
            Пожалуйста, создай полную файловую структуру с папками и файлами, включая:
            - Логическое разделение файлов по папкам
            - Осмысленные имена файлов с правильными расширениями
            - Краткое, но информативное описание каждого файла
            - Примеры входных и выходных данных (где применимо)
            
            Убедись, что структура соответствует формату JSON, описанному в инструкции системы.
            """
            
            print(f"Отправка запроса к API с промптом: {prompt[:50]}...")
            
            try:
                # Упрощенный вызов API с минимумом параметров
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": enhanced_prompt}
                    ],
                    temperature=0.7
                )
                
                result = response.choices[0].message.content
                print(f"Получен ответ от API: {result[:100]}...")
                
                # Пробуем распарсить JSON-ответ
                try:
                    project_data = json.loads(result)
                    return project_data
                except json.JSONDecodeError as e:
                    # Если ответ не удалось распарсить как JSON, извлекаем JSON из текста
                    json_match = re.search(r'```json\s*(.*?)\s*```', result, re.DOTALL)
                    if json_match:
                        try:
                            project_data = json.loads(json_match.group(1))
                            return project_data
                        except json.JSONDecodeError:
                            raise ValueError(f"Не удалось распарсить JSON из ответа: {result}")
                    else:
                        raise ValueError(f"Ответ не содержит валидный JSON: {result}")
            except Exception as api_error:
                print(f"Ошибка при обращении к API: {str(api_error)}")
                print("Используем заглушку в качестве запасного варианта")
                return self._get_sample_project(prompt)
            
        except Exception as e:
            error_details = traceback.format_exc()
            print(f"Ошибка при генерации структуры проекта: {str(e)}\n{error_details}")
            return {"error": str(e), "details": error_details}
    
    def _get_sample_project(self, prompt):
        """Возвращает пример структуры проекта"""
        sample_project = {
            "name": f"Проект: {prompt[:30]}...",
            "structure": [
                {
                    "type": "folder",
                    "name": "src",
                    "children": [
                        {
                            "type": "file",
                            "file_name": "main.py",
                            "description": "Основной файл приложения",
                            "io_pairs": [
                                {
                                    "input": {"command": "start"},
                                    "output": {"status": "running"}
                                }
                            ]
                        },
                        {
                            "type": "file",
                            "file_name": "utils.py",
                            "description": "Вспомогательные функции",
                            "io_pairs": [
                                {
                                    "input": {"data": "example"},
                                    "output": {"processed": "result"}
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "folder",
                    "name": "tests",
                    "children": [
                        {
                            "type": "file",
                            "file_name": "test_main.py",
                            "description": "Тесты для основного модуля",
                            "io_pairs": []
                        }
                    ]
                },
                {
                    "type": "file",
                    "file_name": "README.md",
                    "description": "Документация проекта",
                    "io_pairs": []
                }
            ]
        }
        
        return sample_project 