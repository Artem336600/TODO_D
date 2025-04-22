document.addEventListener('DOMContentLoaded', function() {
    // Получение ссылок на элементы DOM
    const projectSelect = document.getElementById('project-select');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const projectNameInput = document.getElementById('project-name');
    const projectIdInput = document.getElementById('project-id');
    const structureContainer = document.getElementById('structure-container');
    const emptyStructure = document.getElementById('empty-structure');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const addFileBtn = document.getElementById('add-file-btn');
    const saveProjectBtn = document.getElementById('save-project-btn');
    const statusMessage = document.getElementById('status-message');
    const fileTemplate = document.getElementById('file-template');
    const folderTemplate = document.getElementById('folder-template');
    
    // Добавление обработчиков событий
    projectSelect.addEventListener('change', loadSelectedProject);
    deleteProjectBtn.addEventListener('click', deleteSelectedProject);
    addFolderBtn.addEventListener('click', () => addFolder(structureContainer));
    addFileBtn.addEventListener('click', () => addFile(structureContainer));
    saveProjectBtn.addEventListener('click', saveProject);
    
    // Загрузка списка проектов при загрузке страницы
    loadProjects();
    
    // Проверка на пустую структуру
    function checkEmptyStructure() {
        if (structureContainer.children.length === 0 || 
            (structureContainer.children.length === 1 && structureContainer.children[0].id === 'empty-structure')) {
            emptyStructure.style.display = 'block';
        } else {
            emptyStructure.style.display = 'none';
        }
    }
    
    // Функция загрузки списка проектов
    function loadProjects() {
        fetch('/api/projects')
            .then(response => response.json())
            .then(data => {
                // Очистка списка проектов
                while (projectSelect.options.length > 1) {
                    projectSelect.remove(1);
                }
                
                // Добавление проектов в список
                data.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name;
                    projectSelect.appendChild(option);
                });
                
                // Проверка на пустую структуру
                checkEmptyStructure();
            })
            .catch(error => {
                showMessage('Ошибка загрузки проектов: ' + error.message, 'error');
            });
    }
    
    // Функция загрузки выбранного проекта
    function loadSelectedProject() {
        const selectedId = projectSelect.value;
        
        if (selectedId === 'new') {
            // Очистка формы для нового проекта
            projectNameInput.value = '';
            projectIdInput.value = '';
            structureContainer.innerHTML = '';
            checkEmptyStructure();
            return;
        }
        
        fetch(`/api/projects/${selectedId}`)
            .then(response => response.json())
            .then(project => {
                projectNameInput.value = project.name;
                projectIdInput.value = project.id;
                
                // Очистка контейнера структуры
                structureContainer.innerHTML = '';
                
                // Загрузка структуры проекта
                if (project.structure && Array.isArray(project.structure)) {
                    loadProjectStructure(project.structure, structureContainer);
                } else if (project.files && Array.isArray(project.files)) {
                    // Поддержка старого формата для обратной совместимости
                    project.files.forEach(fileData => {
                        const fileItem = addFileWithData(structureContainer, fileData);
                    });
                }
                
                // Проверка на пустую структуру
                checkEmptyStructure();
            })
            .catch(error => {
                showMessage('Ошибка загрузки проекта: ' + error.message, 'error');
            });
    }
    
    // Функция для загрузки структуры проекта (рекурсивная)
    function loadProjectStructure(items, container) {
        items.forEach(item => {
            if (item.type === 'folder') {
                const folderElement = addFolderWithData(container, item);
                const folderContent = folderElement.querySelector('.folder-items');
                
                // Удаляем сообщение о пустой папке, если есть дочерние элементы
                if (item.children && Array.isArray(item.children) && item.children.length > 0) {
                    const emptyFolder = folderContent.querySelector('.empty-folder');
                    if (emptyFolder) {
                        folderContent.removeChild(emptyFolder);
                    }
                    loadProjectStructure(item.children, folderContent);
                }
            } else if (item.type === 'file') {
                addFileWithData(container, item);
            }
        });
    }
    
    // Функция удаления выбранного проекта
    function deleteSelectedProject() {
        const selectedId = projectSelect.value;
        
        if (selectedId === 'new') {
            showMessage('Нет выбранного проекта для удаления', 'error');
            return;
        }
        
        if (!confirm('Вы действительно хотите удалить этот проект?')) {
            return;
        }
        
        fetch(`/api/projects/${selectedId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Проект успешно удален', 'success');
                    loadProjects();
                    projectSelect.value = 'new';
                    loadSelectedProject();
                } else {
                    showMessage('Ошибка при удалении проекта', 'error');
                }
            })
            .catch(error => {
                showMessage('Ошибка удаления проекта: ' + error.message, 'error');
            });
    }
    
    // Функция добавления новой папки
    function addFolder(container) {
        const folderElement = document.importNode(folderTemplate.content, true);
        const folderItem = folderElement.querySelector('.folder-item');
        
        setupFolderEventHandlers(folderItem);
        
        // Проверяем наличие пустого состояния и удаляем его
        const emptyFolder = container.querySelector('.empty-folder');
        if (emptyFolder) {
            container.removeChild(emptyFolder);
        }
        
        container.appendChild(folderItem);
        checkEmptyStructure();
        return folderItem;
    }
    
    // Функция добавления папки с данными
    function addFolderWithData(container, folderData) {
        const folderItem = addFolder(container);
        folderItem.querySelector('.folder-name').value = folderData.name || '';
        return folderItem;
    }
    
    // Функция настройки обработчиков событий для папки
    function setupFolderEventHandlers(folderItem) {
        // Кнопка удаления
        const removeBtn = folderItem.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', function() {
            const parent = folderItem.parentNode;
            parent.removeChild(folderItem);
            
            // Если после удаления папка пуста, добавляем сообщение о пустой папке
            if (parent.children.length === 0 && parent.classList.contains('folder-items')) {
                const emptyFolder = document.createElement('div');
                emptyFolder.className = 'empty-folder';
                emptyFolder.textContent = 'Эта папка пуста. Добавьте файлы или подпапки.';
                parent.appendChild(emptyFolder);
            }
            
            checkEmptyStructure();
        });
        
        // Кнопка сворачивания/разворачивания
        const toggleBtn = folderItem.querySelector('.toggle-folder-btn');
        toggleBtn.addEventListener('click', function() {
            folderItem.classList.toggle('folder-collapsed');
        });
        
        // Кнопки перемещения
        const moveUpBtn = folderItem.querySelector('.move-up-btn');
        const moveDownBtn = folderItem.querySelector('.move-down-btn');
        
        moveUpBtn.addEventListener('click', function() {
            const prev = folderItem.previousElementSibling;
            if (prev && !prev.classList.contains('empty-folder')) {
                folderItem.parentNode.insertBefore(folderItem, prev);
            }
        });
        
        moveDownBtn.addEventListener('click', function() {
            const next = folderItem.nextElementSibling;
            if (next) {
                folderItem.parentNode.insertBefore(next, folderItem);
            }
        });
        
        // Кнопки добавления в папку
        const addFolderInFolderBtn = folderItem.querySelector('.add-folder-in-folder-btn');
        const addFileInFolderBtn = folderItem.querySelector('.add-file-in-folder-btn');
        const folderItemsContainer = folderItem.querySelector('.folder-items');
        
        addFolderInFolderBtn.addEventListener('click', function() {
            addFolder(folderItemsContainer);
        });
        
        addFileInFolderBtn.addEventListener('click', function() {
            addFile(folderItemsContainer);
        });
    }
    
    // Функция добавления нового файла
    function addFile(container) {
        const fileElement = document.importNode(fileTemplate.content, true);
        const fileItem = fileElement.querySelector('.file-item');
        
        setupFileEventHandlers(fileItem);
        
        // Проверяем наличие пустого состояния и удаляем его
        const emptyFolder = container.querySelector('.empty-folder');
        if (emptyFolder) {
            container.removeChild(emptyFolder);
        }
        
        container.appendChild(fileItem);
        checkEmptyStructure();
        return fileItem;
    }
    
    // Функция добавления файла с данными
    function addFileWithData(container, fileData) {
        const fileItem = addFile(container);
        
        fileItem.querySelector('.file-name').value = fileData.file_name || '';
        fileItem.querySelector('.file-description').value = fileData.description || '';
        
        const inputMock = fileItem.querySelector('.file-input-mock');
        const outputMock = fileItem.querySelector('.file-output-mock');
        
        if (fileData.input_mock) {
            inputMock.value = JSON.stringify(fileData.input_mock, null, 2);
        }
        
        if (fileData.output_mock) {
            outputMock.value = JSON.stringify(fileData.output_mock, null, 2);
        }
        
        return fileItem;
    }
    
    // Функция настройки обработчиков событий для файла
    function setupFileEventHandlers(fileItem) {
        // Кнопка удаления
        const removeBtn = fileItem.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', function() {
            const parent = fileItem.parentNode;
            parent.removeChild(fileItem);
            
            // Если после удаления папка пуста, добавляем сообщение о пустой папке
            if (parent.children.length === 0 && parent.classList.contains('folder-items')) {
                const emptyFolder = document.createElement('div');
                emptyFolder.className = 'empty-folder';
                emptyFolder.textContent = 'Эта папка пуста. Добавьте файлы или подпапки.';
                parent.appendChild(emptyFolder);
            }
            
            checkEmptyStructure();
        });
        
        // Кнопки перемещения
        const moveUpBtn = fileItem.querySelector('.move-up-btn');
        const moveDownBtn = fileItem.querySelector('.move-down-btn');
        
        moveUpBtn.addEventListener('click', function() {
            const prev = fileItem.previousElementSibling;
            if (prev && !prev.classList.contains('empty-folder')) {
                fileItem.parentNode.insertBefore(fileItem, prev);
            }
        });
        
        moveDownBtn.addEventListener('click', function() {
            const next = fileItem.nextElementSibling;
            if (next) {
                fileItem.parentNode.insertBefore(next, fileItem);
            }
        });
        
        // Добавление валидации JSON для полей ввода и вывода
        const inputMock = fileItem.querySelector('.file-input-mock');
        const outputMock = fileItem.querySelector('.file-output-mock');
        
        [inputMock, outputMock].forEach(field => {
            field.addEventListener('blur', function() {
                validateJson(field);
            });
        });
    }
    
    // Функция валидации JSON
    function validateJson(element) {
        if (!element.value.trim()) return;
        
        try {
            JSON.parse(element.value);
            element.style.borderColor = '#ddd';
        } catch (e) {
            element.style.borderColor = '#e74c3c';
            showMessage('Некорректный JSON формат', 'error');
        }
    }
    
    // Функция для сбора структуры проекта (рекурсивная)
    function collectProjectStructure(container) {
        const items = [];
        const children = container.children;
        
        for (let i = 0; i < children.length; i++) {
            const item = children[i];
            
            // Пропускаем элементы, которые не являются частью структуры
            if (item.id === 'empty-structure' || item.classList.contains('empty-folder')) {
                continue;
            }
            
            if (item.classList.contains('folder-item')) {
                const folderName = item.querySelector('.folder-name').value.trim();
                const folderItemsContainer = item.querySelector('.folder-items');
                
                if (!folderName) {
                    showMessage('Укажите имя для всех папок', 'error');
                    item.querySelector('.folder-name').focus();
                    return null;
                }
                
                const folderData = {
                    type: 'folder',
                    name: folderName,
                    children: collectProjectStructure(folderItemsContainer)
                };
                
                if (folderData.children === null) return null; // Произошла ошибка в дочерних элементах
                
                items.push(folderData);
            } else if (item.classList.contains('file-item')) {
                const fileName = item.querySelector('.file-name').value.trim();
                const description = item.querySelector('.file-description').value.trim();
                const inputMockText = item.querySelector('.file-input-mock').value.trim();
                const outputMockText = item.querySelector('.file-output-mock').value.trim();
                
                if (!fileName) {
                    showMessage('Укажите имя для всех файлов', 'error');
                    item.querySelector('.file-name').focus();
                    return null;
                }
                
                let inputMock = {}, outputMock = {};
                
                try {
                    if (inputMockText) inputMock = JSON.parse(inputMockText);
                    if (outputMockText) outputMock = JSON.parse(outputMockText);
                } catch (e) {
                    showMessage('Проверьте формат JSON данных', 'error');
                    return null;
                }
                
                const fileData = {
                    type: 'file',
                    file_name: fileName,
                    description: description,
                    input_mock: inputMock,
                    output_mock: outputMock
                };
                
                items.push(fileData);
            }
        }
        
        return items;
    }
    
    // Функция сохранения проекта
    function saveProject() {
        const projectName = projectNameInput.value.trim();
        const projectId = projectIdInput.value.trim();
        
        if (!projectName) {
            showMessage('Введите название проекта', 'error');
            projectNameInput.focus();
            return;
        }
        
        // Сбор структуры проекта
        const structure = collectProjectStructure(structureContainer);
        
        if (structure === null) return; // Произошла ошибка валидации
        
        // Если структура пуста, выводим предупреждение
        if (structure.length === 0) {
            if (!confirm('Структура проекта пуста. Вы уверены, что хотите сохранить?')) {
                return;
            }
        }
        
        // Создание объекта проекта
        const project = {
            name: projectName,
            structure: structure
        };
        
        // Добавление ID, если это существующий проект
        if (projectId) {
            project.id = projectId;
        }
        
        // Отображение индикатора загрузки
        saveProjectBtn.disabled = true;
        saveProjectBtn.innerHTML = '<span class="loading-spinner"></span> Сохранение...';
        
        // Отправка данных на сервер
        fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(project)
        })
        .then(response => response.json())
        .then(data => {
            // Восстановление кнопки
            saveProjectBtn.disabled = false;
            saveProjectBtn.innerHTML = '<svg style="width:20px;height:20px;margin-right:8px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" /></svg> Сохранить структуру';
            
            if (data.success) {
                showMessage('Структура проекта успешно сохранена', 'success');
                // Обновление списка проектов и установка текущего проекта
                loadProjects();
                
                // Обновление ID проекта в форме
                if (data.project && data.project.id) {
                    projectIdInput.value = data.project.id;
                    
                    // Выбор проекта в списке после загрузки списка
                    setTimeout(() => {
                        projectSelect.value = data.project.id;
                    }, 300);
                }
            } else {
                showMessage('Ошибка при сохранении проекта', 'error');
            }
        })
        .catch(error => {
            // Восстановление кнопки
            saveProjectBtn.disabled = false;
            saveProjectBtn.innerHTML = '<svg style="width:20px;height:20px;margin-right:8px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" /></svg> Сохранить структуру';
            showMessage('Произошла ошибка: ' + error.message, 'error');
        });
    }
    
    // Функция отображения статусного сообщения
    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.classList.add('active');
        
        // Автоматическое скрытие сообщения через 5 секунд
        setTimeout(() => {
            statusMessage.classList.remove('active');
            
            // Очистка сообщения после анимации
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = '';
            }, 400);
        }, 5000);
    }
    
    // Проверка на пустую структуру при загрузке
    checkEmptyStructure();
    
    // Добавление начальной папки или файла для нового проекта
    if (projectSelect.value === 'new' && structureContainer.children.length === 0) {
        emptyStructure.style.display = 'block';
    }
}); 