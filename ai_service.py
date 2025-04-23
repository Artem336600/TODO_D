from openai import OpenAI
import json
import traceback
import re
import os

class AIProjectGenerator:
    def __init__(self, api_key=None):
        # Получаем API ключ из переданного параметра или из переменных окружения
        api_key = api_key or os.environ.get('OPENAI_API_KEY', "sk-abc70a4d8ead416da1f0789918533921")
        self.client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
        
    def generate_project_structure(self, prompt):
        """
        Генерирует структуру проекта на основе запроса пользователя
        
        Args:
            prompt (str): Запрос пользователя, описывающий нужный проект
            
        Returns:
            dict: Структура проекта в формате JSON
        """
        try:
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
            
            print(f"Отправка запроса к DeepSeek API с промптом: {prompt[:50]}...")
            
            try:
                response = self.client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": enhanced_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=3000,
                    stream=False
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
                print(f"Ошибка при обращении к DeepSeek API: {str(api_error)}")
                print("Используем заглушку в качестве запасного варианта")
                
                # Заглушка - пример структуры проекта
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
            
        except Exception as e:
            error_details = traceback.format_exc()
            print(f"Ошибка при генерации структуры проекта: {str(e)}\n{error_details}")
            return {"error": str(e), "details": error_details} 