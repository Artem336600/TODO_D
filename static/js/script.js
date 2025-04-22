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
        // Считаем реальные элементы структуры (папки и файлы), исключая служебные
        const realItemsCount = Array.from(structureContainer.children).filter(
            child => child.classList && 
                    (child.classList.contains('folder-item') || 
                     child.classList.contains('file-item'))
        ).length;
        
        if (realItemsCount === 0) {
            // Структура действительно пуста, показываем сообщение
            emptyStructure.style.display = 'block';
        } else {
            // В структуре есть реальные элементы, скрываем сообщение
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
        // Удаляем сообщение о пустой структуре, если оно есть
        if (container === structureContainer) {
            const emptyState = container.querySelector('#empty-structure');
            if (emptyState && emptyState.style.display !== 'none') {
                emptyState.style.display = 'none';
            }
        }
        
        const folderElement = document.importNode(folderTemplate.content, true);
        const folderItem = folderElement.querySelector('.folder-item');
        
        setupFolderEventHandlers(folderItem);
        
        // Проверяем наличие пустого состояния папки и удаляем его
        if (container.querySelector('.empty-folder')) {
            // Преобразуем коллекцию в массив для безопасного удаления
            const emptyFolders = Array.from(container.querySelectorAll('.empty-folder'));
            emptyFolders.forEach(emptyFolder => {
                if (emptyFolder.parentNode === container) { // Дополнительная проверка
                    container.removeChild(emptyFolder);
                }
            });
        }
        
        container.appendChild(folderItem);
        
        // Обновляем глобальный статус структуры
        if (container === structureContainer) {
            checkEmptyStructure();
        }
        
        return folderItem;
    }
    
    // Функция добавления папки с данными
    function addFolderWithData(container, folderData) {
        const folderItem = addFolder(container);
        folderItem.querySelector('.folder-name').value = folderData.name || '';
        
        // Обновляем заголовок папки
        const folderName = folderData.name || '';
        if (folderName) {
            folderItem.querySelector('.folder-header h3').textContent = `Папка: ${folderName}`;
        }
        
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
            // Проверяем, есть ли в родительском контейнере какие-либо файлы или папки
            const hasItems = Array.from(parent.children).some(child => 
                child.classList && (child.classList.contains('folder-item') || child.classList.contains('file-item'))
            );
            
            // Если нет элементов и это контейнер внутри папки, добавляем сообщение о пустой папке
            if (!hasItems && parent.classList.contains('folder-items')) {
                // Убедимся, что нет существующего сообщения о пустой папке
                if (!parent.querySelector('.empty-folder')) {
                    const emptyFolder = document.createElement('div');
                    emptyFolder.className = 'empty-folder';
                    emptyFolder.textContent = 'Эта папка пуста. Добавьте файлы или подпапки.';
                    parent.appendChild(emptyFolder);
                }
            }
            
            checkEmptyStructure();
        });
        
        // Кнопка сворачивания/разворачивания
        const toggleBtn = folderItem.querySelector('.toggle-folder-btn');
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие события
            toggleFolderCollapse(folderItem);
        });
        
        // Добавляем клик на весь заголовок для сворачивания/разворачивания
        const folderHeader = folderItem.querySelector('.folder-header');
        folderHeader.addEventListener('click', function(e) {
            // Проверяем, что клик не был на кнопках
            if (!e.target.closest('.item-actions button')) {
                toggleFolderCollapse(folderItem);
            }
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
        
        if (addFolderInFolderBtn) {
            addFolderInFolderBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Добавление подпапки');
                const newFolder = addFolder(folderItemsContainer);
                // Разворачиваем родительскую папку, если она свёрнута
                if (folderItem.classList.contains('folder-collapsed')) {
                    folderItem.classList.remove('folder-collapsed');
                }
            });
        }
        
        if (addFileInFolderBtn) {
            addFileInFolderBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Добавление файла в папку');
                const newFile = addFile(folderItemsContainer);
                // Разворачиваем родительскую папку, если она свёрнута
                if (folderItem.classList.contains('folder-collapsed')) {
                    folderItem.classList.remove('folder-collapsed');
                }
            });
        }
        
        // Обновление имени папки в заголовке при вводе
        const folderNameInput = folderItem.querySelector('.folder-name');
        const folderHeaderTitle = folderItem.querySelector('.folder-header h3');
        
        // Функция обновления заголовка
        function updateFolderHeader() {
            const folderName = folderNameInput.value.trim();
            if (folderName) {
                folderHeaderTitle.textContent = `Папка: ${folderName}`;
            } else {
                folderHeaderTitle.textContent = 'Папка';
            }
        }
        
        // Слушатель для обновления заголовка при вводе
        folderNameInput.addEventListener('input', updateFolderHeader);
        folderNameInput.addEventListener('change', updateFolderHeader);
        
        // Вызываем функцию сразу, чтобы установить начальное значение
        updateFolderHeader();
    }
    
    // Функция для сворачивания/разворачивания папки
    function toggleFolderCollapse(folderItem) {
        folderItem.classList.toggle('folder-collapsed');
    }
    
    // Функция добавления нового файла
    function addFile(container) {
        // Удаляем сообщение о пустой структуре, если оно есть
        if (container === structureContainer) {
            const emptyState = container.querySelector('#empty-structure');
            if (emptyState && emptyState.style.display !== 'none') {
                emptyState.style.display = 'none';
            }
        }
        
        const fileElement = document.importNode(fileTemplate.content, true);
        const fileItem = fileElement.querySelector('.file-item');
        
        // Добавляем класс свёрнутого файла по умолчанию
        fileItem.classList.add('file-collapsed');
        
        setupFileEventHandlers(fileItem);
        
        // Проверяем наличие пустого состояния папки и удаляем его
        if (container.querySelector('.empty-folder')) {
            // Преобразуем коллекцию в массив для безопасного удаления
            const emptyFolders = Array.from(container.querySelectorAll('.empty-folder'));
            emptyFolders.forEach(emptyFolder => {
                if (emptyFolder.parentNode === container) { // Дополнительная проверка
                    container.removeChild(emptyFolder);
                }
            });
        }
        
        container.appendChild(fileItem);
        
        // Обновляем глобальный статус структуры
        if (container === structureContainer) {
            checkEmptyStructure();
        }
        
        return fileItem;
    }
    
    // Функция добавления файла с данными
    function addFileWithData(container, fileData) {
        const fileItem = addFile(container);
        fileItem.querySelector('.file-name').value = fileData.file_name || '';
        fileItem.querySelector('.file-description').value = fileData.description || '';
        
        // Добавляем класс свёрнутого файла по умолчанию
        fileItem.classList.add('file-collapsed');
        
        // Обработка пар ввод-вывод
        const ioPairsContainer = fileItem.querySelector('.io-pairs');
        // Удаляем первую пустую пару, которая создалась автоматически
        ioPairsContainer.innerHTML = '';
        
        if (fileData.io_pairs && Array.isArray(fileData.io_pairs)) {
            // Если существует массив пар, добавляем каждую из них
            fileData.io_pairs.forEach((pairData, index) => {
                addPairWithData(ioPairsContainer, pairData, index + 1);
            });
        } else if (fileData.input_mocks && fileData.output_mocks && 
                   Array.isArray(fileData.input_mocks) && Array.isArray(fileData.output_mocks)) {
            // Обратная совместимость с раздельными массивами входных и выходных данных
            const maxPairs = Math.max(fileData.input_mocks.length, fileData.output_mocks.length);
            
            for (let i = 0; i < maxPairs; i++) {
                const pairData = {
                    input: fileData.input_mocks[i] || {},
                    output: fileData.output_mocks[i] || {}
                };
                addPairWithData(ioPairsContainer, pairData, i + 1);
            }
        } else if (fileData.input_mock || fileData.output_mock) {
            // Обратная совместимость с одиночными моками
            const pairData = {
                input: fileData.input_mock || {},
                output: fileData.output_mock || {}
            };
            addPairWithData(ioPairsContainer, pairData, 1);
        } else {
            // Если нет моков, добавляем пустую пару
            addPair(ioPairsContainer);
        }
        
        // Обновляем заголовок файла
        updateFileHeaderInfo(fileItem);
        
        return fileItem;
    }
    
    // Функция добавления пары с данными
    function addPairWithData(container, pairData, index) {
        const pairItem = document.createElement('div');
        pairItem.className = 'mock-pair';
        
        pairItem.innerHTML = `
            <div class="mock-header">
                <div class="mock-header-actions">
                    <button type="button" class="remove-pair-btn btn-icon">✖</button>
                </div>
            </div>
            <div class="mock-io-container">
                <div class="mock-io-item">
                    <label>Вход:</label>
                    <textarea class="file-input-mock">${formatJsonData(pairData.input)}</textarea>
                </div>
                <div class="mock-io-arrow">→</div>
                <div class="mock-io-item">
                    <label>Выход:</label>
                    <textarea class="file-output-mock">${formatJsonData(pairData.output)}</textarea>
                </div>
            </div>
        `;
        
        container.appendChild(pairItem);
        
        // Подключение обработчика для кнопки удаления
        const removeBtn = pairItem.querySelector('.remove-pair-btn');
        removeBtn.addEventListener('click', function() {
            if (container.querySelectorAll('.mock-pair').length <= 1) return;
            container.removeChild(pairItem);
        });
        
        // Валидация JSON в текстовых полях
        pairItem.querySelectorAll('.file-input-mock, .file-output-mock').forEach(textarea => {
            textarea.addEventListener('blur', function() {
                validateJson(this);
            });
        });
        
        return pairItem;
    }
    
    // Форматирование данных JSON
    function formatJsonData(data) {
        if (!data) return '';
        
        try {
            if (typeof data === 'string') {
                return data;
            } else {
                return JSON.stringify(data, null, 2);
            }
        } catch (e) {
            return JSON.stringify({});
        }
    }
    
    // Функция добавления новой пары
    function addPair(container) {
        const pairCount = container.querySelectorAll('.mock-pair').length + 1;
        const pairItem = addPairWithData(container, { input: {}, output: {} }, pairCount);
        
        // Обновляем заголовок файла, если добавление пары было успешным
        const fileItem = container.closest('.file-item');
        if (fileItem) {
            updateFileHeaderInfo(fileItem);
        }
        
        return pairItem;
    }
    
    // Функция обновления нумерации вариантов
    function updatePairNumbers(container) {
        // Функция больше не требуется, так как нумерация удалена
    }
    
    // Функция валидации JSON
    function validateJson(element) {
        const text = element.value.trim();
        
        if (!text) return; // Пустое поле допустимо
        
        try {
            const parsed = JSON.parse(text);
            
            // Форматируем JSON и обновляем текстовое поле
            element.value = JSON.stringify(parsed, null, 2);
            
            // Убираем класс ошибки, если он был
            element.classList.remove('error');
        } catch (e) {
            // Устанавливаем класс ошибки
            element.classList.add('error');
            
            // Показываем сообщение об ошибке в консоли
            console.error(`Ошибка JSON в поле: ${e.message}`);
        }
    }
    
    // Функция обновления заголовка файла
    function updateFileHeaderInfo(fileItem) {
        const fileNameInput = fileItem.querySelector('.file-name');
        const fileHeaderTitle = fileItem.querySelector('.file-header h3');
        
        const fileName = fileNameInput.value.trim();
        
        let headerText = 'Файл';
        if (fileName) {
            headerText = `Файл: ${fileName}`;
        }
        
        fileHeaderTitle.textContent = headerText;
    }
    
    // Функция настройки обработчиков событий для файла
    function setupFileEventHandlers(fileItem) {
        // Кнопка удаления
        const removeBtn = fileItem.querySelector('.remove-item-btn');
        removeBtn.addEventListener('click', function() {
            const parent = fileItem.parentNode;
            parent.removeChild(fileItem);
            
            // Проверяем, есть ли в родительском контейнере какие-либо файлы или папки
            const hasItems = Array.from(parent.children).some(child => 
                child.classList && (child.classList.contains('folder-item') || child.classList.contains('file-item'))
            );
            
            // Если нет элементов и это контейнер внутри папки, добавляем сообщение о пустой папке
            if (!hasItems && parent.classList.contains('folder-items')) {
                // Убедимся, что нет существующего сообщения о пустой папке
                if (!parent.querySelector('.empty-folder')) {
                    const emptyFolder = document.createElement('div');
                    emptyFolder.className = 'empty-folder';
                    emptyFolder.textContent = 'Эта папка пуста. Добавьте файлы или подпапки.';
                    parent.appendChild(emptyFolder);
                }
            }
            
            checkEmptyStructure();
        });
        
        // Кнопки перемещения вверх/вниз
        const moveUpBtn = fileItem.querySelector('.move-up-btn');
        const moveDownBtn = fileItem.querySelector('.move-down-btn');
        
        moveUpBtn.addEventListener('click', function() {
            const parent = fileItem.parentNode;
            const prev = fileItem.previousElementSibling;
            if (prev && !prev.classList.contains('empty-folder')) {
                parent.insertBefore(fileItem, prev);
            }
        });
        
        moveDownBtn.addEventListener('click', function() {
            const parent = fileItem.parentNode;
            const next = fileItem.nextElementSibling;
            if (next) {
                parent.insertBefore(next, fileItem);
            }
        });
        
        // Кнопка для сворачивания/разворачивания файла
        const toggleBtn = fileItem.querySelector('.toggle-file-btn');
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Предотвращаем всплытие события
            toggleFileCollapse(fileItem);
        });
        
        // Добавляем клик на весь заголовок для сворачивания/разворачивания
        const fileHeaderElement = fileItem.querySelector('.file-header');
        fileHeaderElement.addEventListener('click', function(e) {
            // Проверяем, что клик не был на кнопках
            if (!e.target.closest('.item-actions button')) {
                toggleFileCollapse(fileItem);
            }
        });
        
        // Кнопка добавления новой пары
        const addPairBtn = fileItem.querySelector('.add-pair-btn');
        const ioPairsContainer = fileItem.querySelector('.io-pairs');
        
        addPairBtn.addEventListener('click', function() {
            addPair(ioPairsContainer);
            updateFileHeaderInfo(fileItem);
        });
        
        // Подключение обработчиков для кнопок удаления пар
        const removePairBtns = fileItem.querySelectorAll('.remove-pair-btn');
        removePairBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const pairItem = this.closest('.mock-pair');
                const pairsContainer = pairItem.parentNode;
                
                // Если это единственная пара, не удаляем её
                if (pairsContainer.querySelectorAll('.mock-pair').length <= 1) {
                    return;
                }
                
                pairsContainer.removeChild(pairItem);
                
                // Обновляем заголовок с новым количеством пар
                updateFileHeaderInfo(fileItem);
            });
        });
        
        // Валидация JSON в текстовых полях
        fileItem.querySelectorAll('.file-input-mock, .file-output-mock').forEach(textarea => {
            textarea.addEventListener('blur', function() {
                validateJson(this);
            });
        });
        
        // Обновление имени файла в заголовке при вводе
        const fileNameInput = fileItem.querySelector('.file-name');
        
        // Слушатель для обновления заголовка при вводе
        fileNameInput.addEventListener('input', function() {
            updateFileHeaderInfo(fileItem);
        });
        fileNameInput.addEventListener('change', function() {
            updateFileHeaderInfo(fileItem);
        });
        
        // Вызываем функцию сразу, чтобы установить начальное значение
        updateFileHeaderInfo(fileItem);
    }
    
    // Функция для сворачивания/разворачивания файла
    function toggleFileCollapse(fileItem) {
        fileItem.classList.toggle('file-collapsed');
    }
    
    // Функция сбора структуры проекта
    function collectProjectStructure(container) {
        const items = [];
        
        container.childNodes.forEach(element => {
            // Пропускаем текстовые узлы и элемент пустого состояния
            if (element.nodeType !== Node.ELEMENT_NODE || element.id === 'empty-structure' || element.classList.contains('empty-folder')) {
                return;
            }
            
            if (element.classList.contains('file-item')) {
                const fileItem = {
                    type: 'file',
                    file_name: element.querySelector('.file-name').value,
                    description: element.querySelector('.file-description').value
                };
                
                // Получение пар ввод-вывод
                const ioPairs = [];
                element.querySelectorAll('.io-pairs .mock-pair').forEach(pairItem => {
                    const inputMock = pairItem.querySelector('.file-input-mock');
                    const outputMock = pairItem.querySelector('.file-output-mock');
                    
                    const inputText = inputMock.value.trim();
                    const outputText = outputMock.value.trim();
                    
                    const pairData = {};
                    
                    if (inputText) {
                        try {
                            pairData.input = JSON.parse(inputText);
                        } catch (e) {
                            // Если данные не в формате JSON, сохраняем как строку
                            pairData.input = inputText;
                        }
                    }
                    
                    if (outputText) {
                        try {
                            pairData.output = JSON.parse(outputText);
                        } catch (e) {
                            // Если данные не в формате JSON, сохраняем как строку
                            pairData.output = outputText;
                        }
                    }
                    
                    if (Object.keys(pairData).length > 0) {
                        ioPairs.push(pairData);
                    }
                });
                
                if (ioPairs.length > 0) {
                    fileItem.io_pairs = ioPairs;
                    
                    // Для обратной совместимости
                    if (ioPairs[0].input) {
                        fileItem.input_mock = ioPairs[0].input;
                    }
                    if (ioPairs[0].output) {
                        fileItem.output_mock = ioPairs[0].output;
                    }
                    
                    // Еще для обратной совместимости отдельные массивы
                    fileItem.input_mocks = ioPairs.map(pair => pair.input).filter(Boolean);
                    fileItem.output_mocks = ioPairs.map(pair => pair.output).filter(Boolean);
                }
                
                items.push(fileItem);
            } else if (element.classList.contains('folder-item')) {
                const folderItem = {
                    type: 'folder',
                    name: element.querySelector('.folder-name').value,
                    children: []
                };
                
                // Рекурсивно получаем содержимое папки
                const folderContent = element.querySelector('.folder-items');
                folderItem.children = collectProjectStructure(folderContent);
                
                items.push(folderItem);
            }
        });
        
        return items;
    }
    
    // Функция сохранения проекта
    function saveProject() {
        const projectName = projectNameInput.value.trim();
        const projectId = projectIdInput.value.trim();
        
        if (!projectName) {
            showMessage('Укажите название проекта', 'error');
            projectNameInput.focus();
            return;
        }
        
        // Проверка на валидность всех JSON полей
        const invalidJsonFields = document.querySelectorAll('textarea.file-input-mock.error, textarea.file-output-mock.error');
        if (invalidJsonFields.length > 0) {
            showMessage('Проверьте корректность формата JSON во всех полях', 'error');
            invalidJsonFields[0].focus();
            return;
        }
        
        // Проверка на заполненность имен файлов (только если нужно)
        const fileInputs = document.querySelectorAll('.file-item .file-name');
        const emptyFileNames = Array.from(fileInputs).filter(input => !input.value.trim());
        if (emptyFileNames.length > 0) {
            showMessage('Укажите имена для всех файлов', 'error');
            emptyFileNames[0].focus();
            return;
        }
        
        // Проверка на заполненность имен папок (только если нужно)
        const folderInputs = document.querySelectorAll('.folder-item .folder-name');
        const emptyFolderNames = Array.from(folderInputs).filter(input => !input.value.trim());
        if (emptyFolderNames.length > 0) {
            showMessage('Укажите имена для всех папок', 'error');
            emptyFolderNames[0].focus();
            return;
        }
        
        // Собираем структуру проекта
        const projectStructure = collectProjectStructure(structureContainer);
        
        const projectData = {
            name: projectName,
            structure: projectStructure
        };
        
        if (projectId) {
            projectData.id = projectId;
        }
        
        // Сохраняем проект через API
        fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('Проект успешно сохранен', 'success');
                    
                    // Обновляем ID проекта в скрытом поле
                    projectIdInput.value = data.project.id;
                    
                    // Обновляем список проектов
                    loadProjects();
                    
                    // Выбираем сохраненный проект в списке
                    setTimeout(() => {
                        projectSelect.value = data.project.id;
                    }, 500);
                } else {
                    showMessage('Ошибка при сохранении проекта', 'error');
                }
            })
            .catch(error => {
                showMessage('Ошибка сохранения проекта: ' + error.message, 'error');
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