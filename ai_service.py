from openai import OpenAI
import json
import traceback
import re
import os

# Класс-заглушка для OpenAI клиента
class MockOpenAIClient:
    """Заглушка для OpenAI клиента, которая всегда возвращает предопределенные ответы"""
    
    class MockChatCompletion:
        def create(self, **kwargs):
            """Имитирует создание сообщения"""
            prompt = kwargs.get('messages', [{}])[-1].get('content', '')
            print(f"MockOpenAI: Получен запрос с промптом: {prompt[:50]}...")
            
            # Создаем простую структуру объекта ответа, похожую на настоящий ответ OpenAI
            class MockResponse:
                class Choice:
                    class Message:
                        def __init__(self, content):
                            self.content = content
                            
                    def __init__(self, content):
                        self.message = self.Message(content)
                
                def __init__(self, content):
                    self.choices = [self.Choice(content)]
            
            # Генерируем JSON с простой структурой проекта в зависимости от запроса
            project_name = prompt.split("\n\n")[1].strip()[:30] + "..."
            simple_project = {
                "name": f"Проект: {project_name}",
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
            
            mock_response = json.dumps(simple_project, ensure_ascii=False)
            return MockResponse(mock_response)
    
    def __init__(self, **kwargs):
        print("Инициализирована заглушка для OpenAI клиента")
        self.chat = self.MockChatCompletion()

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
            # Самая простая форма инициализации без дополнительных переменных окружения
            if self.api_key:
                try:
                    # Пробуем создать настоящий клиент
                    self.client = OpenAI(api_key=self.api_key)
                    print("OpenAI клиент успешно инициализирован")
                except Exception as e:
                    print(f"Ошибка при создании настоящего клиента: {str(e)}")
                    print("Инициализируем заглушку для OpenAI клиента")
                    # Если не удалось создать настоящий клиент, используем заглушку
                    self.client = MockOpenAIClient(api_key=self.api_key)
            else:
                print("API ключ не предоставлен, используем заглушку")
                self.client = MockOpenAIClient()
        except Exception as e:
            print(f"Критическая ошибка при инициализации клиента: {str(e)}")
            try:
                # В крайнем случае, всегда пробуем инициализировать заглушку
                self.client = MockOpenAIClient()
            except:
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
                print("Попытка повторной инициализации клиента...")
                self.initialize_client()
                
            # Проверяем снова, успешно ли инициализирован клиент
            if self.client is None:
                print("Клиент по-прежнему не инициализирован, используем заглушку")
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