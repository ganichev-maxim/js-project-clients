(function() {
  //содержимое таблицы
  let dataContainer;
  //Значение поискового фильтра
  let filter;
  //Данные для отображения в таблице
  let clientsForView;
  //Поле для сортировки
  let sortProperty = 'id';
  //Направление сортировки
  let sortAsc = true;

  async function onDelete(clientId) {
    const onConfirm = async function() {
      await fetch(`http://localhost:3000/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      loadClientsTable();
    }
    confirmDelete(onConfirm);
  }

  document.addEventListener("DOMContentLoaded", async function (event) {
    dataContainer = document.getElementById("dataContainer");
    //Кнопка для добавления нового клиента
    const handlers = {
      async onSave(formData, clientId) {
        const request = collectClientDataForRequest(formData);
        try {
          const response = await fetch('http://localhost:3000/api/clients', {
            method: 'POST',
            body: JSON.stringify(request),
            headers: {
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            loadClientsTable();
          } else {
            return getMessageFromError(await response.json())
          }
        }
        catch (error) {
          return getMessageFromError();
        }
      }
    }
    document.getElementById("addClientButton").addEventListener ("click", function (event) {
      openEditClientPopup(handlers);
    });
    //Сортировка данных
    document.querySelectorAll('[data-sort-prop]').forEach(header => header.addEventListener('click', function (event) {
      if (this.dataset.sortProp === sortProperty) {
        sortAsc = !sortAsc;
      } else {
        sortAsc = true;
        sortProperty = this.dataset.sortProp;
      }
      fillTableBody(dataContainer, buildTableRows(clientsForView));
    }));
    //Поиск
    var searchTimer;
    document.getElementById('searchFilter').addEventListener('input', function (event) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filter = this.value;
        loadClientsTable();
      }, 300);
    })
    //Закрытие кастомных селектов
    document.addEventListener("click", closeAllSelect);
    //Открытие карточки изменения клиента при изменении хеша
    window.addEventListener('hashchange', function (event) {
      if (this.location.hash.startsWith('#clientCard')) {
        openModalByHash();
      }
    });
    //Обновление данных с сервера
    await loadClientsTable();
    //Открытие карточки изменения клиента при первичной загрузке страницы
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  //Трансформация данных формы в json
  function collectClientDataForRequest(formData) {
    const request = {
      name: formData.get('firstName'),
      lastName: formData.get('middleName'),
      surname: formData.get('lastName')
    }
    const contacts = [];
    for (let i = 0; i < formData.getAll('contactType').length; i++) {
      contacts.push({
        type: formData.getAll('contactType')[i],
        value: formData.getAll('contactValue')[i]
      })
    }
    if (contacts.length > 0) {
      request.contacts = contacts;
    }
    return request;
  }
  //Обновление данных клиентов с сервера
  async function loadClientsTable() {
    const loading = showLoading(dataContainer);
    const clients = await getFromServer(filter);
    clientsForView = prepareForForView(clients);
    const clientsItems = buildTableRows(clientsForView);
    loading.remove();
    fillTableBody(dataContainer, clientsItems);
  }
  //Значок загрузки при получении данных клиентов с сервера
  function showLoading(container) {
    container.innerHTML = '';
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('loading');
    container.append(loadingElement);
    const loadingImg = document.createElement('div');
    loadingImg.classList.add('loading__spinner');
    loadingElement.append(loadingImg);
    return loadingElement;
  }
  //Получение данных о клиентов с сервера
  async function getFromServer(filter) {
    const response = await fetch('http://localhost:3000/api/clients' + (filter ? `?search=${filter}` : ''));
    return await response.json();
  }
  //Преобразование данных с сервера для отображения в таблице
  function prepareForForView(clients) {
    let result = [];
    for (const client of clients) {
      const clientCopy = {...client}
      clientCopy.fullName = `${client.surname} ${client.name} ${client.lastName}`;
      clientCopy.createdAt = new Date(client.createdAt);
      clientCopy.updatedAt = new Date(client.updatedAt);
      result.push(clientCopy);
    }
    return result;
  }
  //Получение текста ошибки
  function getMessageFromError(response) {
    let message = 'Что-то пошло не так...';
    try {
      let temp = ''
      for (const error of response.errors) {
        temp += `${error.message}\n`;
      }
      message = temp;
    } catch {
    }
    return message;
  }
  //Карточка редактирование клиента
  function openEditClientPopup({onSave, onDelete}, client) {
    const modal = createModal();
    const content = document.createElement('div');
    content.classList.add('edit-client');
    modal.contentContainer.append(content);

    const title = document.createElement('h1');
    title.classList.add('modal__title', 'edit-client__title');
    title.innerText = client ? 'Изменить данные' : 'Новый клиент';
    content.append(title);
    if (client) {
      const clientIdElement = document.createElement('span');
      clientIdElement.classList.add('edit-client__id');
      clientIdElement.innerText = `ID: ${client.id}`;
      title.append(clientIdElement);
    }

    const form = document.createElement('form');
    form.classList.add('edit-client__form');
    form.noValidate = true;
    form.append(createFormTextInput({id: 'lastName', label: 'Фамилия', required: true, classToAdd: 'edit-client__lastName', value: client ? client.surname : null}));
    form.append(createFormTextInput({id: 'firstName', label: 'Имя', required: true, value: client ? client.name : null}));
    form.append(createFormTextInput({id: 'middleName', label: 'Отчество', classToAdd: 'edit-client__middleName', value: client ? client.lastName : null}));
    form.append(createContactsBlock(client));

    const errorBlock = document.createElement('p');
    errorBlock.classList.add('edit-client__errors');
    form.append(errorBlock);

    const saveButton = document.createElement('button')
    saveButton.classList.add('modal__btn-primary', 'btn', 'btn-primary');
    saveButton.innerText = 'Сохранить';
    saveButton.type = 'submit';
    form.append(saveButton);

    const cancelButton = document.createElement('button')
    cancelButton.classList.add('modal__btn-secondary', 'btn', 'btn-simple');
    cancelButton.type = 'button';
    if (!client) {
      cancelButton.innerText = 'Отмена';
      cancelButton.addEventListener('click', function (event) {
        modal.overlayElement.remove();
      });
    } else {
      cancelButton.innerText = 'Удалить клиента';
      cancelButton.addEventListener('click', function (event) {
        onDelete(client.id);
        modal.overlayElement.remove();
      });
    }
    form.append(cancelButton);

    form.addEventListener('submit', async function (event) {
      event.preventDefault()
      resetValidationResult(this);
      const validationResult = validateAddForm(this);
      const isFormValid = this.checkValidity();
      this.classList.add('form-group_validated');
      if (!isFormValid || validationResult) {
        showValidationMessage(this, errorBlock, validationResult);
        event.stopPropagation();
      } else {
        const loadingSign = document.createElement('div');
        loadingSign.classList.add('btn__spinner');
        saveButton.prepend(loadingSign);
        const formData = new FormData(this);
        disableForm(this, true);
        const errorText = await onSave(formData, client ? client.id : null);
        if (errorText) {
          errorBlock.innerText = errorText;
          errorBlock.style.display = 'block';
          loadingSign.remove();
        } else {
          modal.overlayElement.remove();
        }
        disableForm(this, false);
      }
    })

    content.append(form);
    addModalAnimation(modal.modalElement);
  }
  //Создание шаблона для модального окна
  function createModal() {
    const overlayElement = document.createElement('div');
    overlayElement.classList.add('overlay');
    overlayElement.addEventListener('click', function (event) {
      if (event.target !== this) return;
      this.remove();
    })
    const modalElement = document.createElement('div');
    modalElement.classList.add('modal');
    const closeWindow = document.createElement('button');
    closeWindow.classList.add('modal__btn-close', 'btn');
    closeWindow.addEventListener('click', function (event) {
      overlayElement.remove();
    })
    //modelElement.append(closeWindow);
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal__content');
    modalContent.append(closeWindow);
    modalElement.append (modalContent);
    overlayElement.append(modalElement);
    document.body.append(overlayElement);
    return {contentContainer : modalContent, overlayElement, modalElement};
  }
  //Создание поля для ввода
  function createFormTextInput({id, label, required, classToAdd, value}) {
    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group');
    if (classToAdd) {
      formGroup.classList.add(classToAdd);
    }

    const inputElement = document.createElement('input');
    inputElement.classList.add('form-group__input');
    inputElement.id = id;
    inputElement.name = id;
    inputElement.type = 'text';
    inputElement.required = !!required;
    inputElement.addEventListener('focusout', function (event) {
      this.classList.toggle('has-value', this.value);
    })
    if (value) {
      inputElement.value = value;
      inputElement.classList.add('has-value');
    }
    formGroup.append(inputElement);

    const labelElement = document.createElement('label');
    labelElement.classList.add('form-group__label')
    labelElement.htmlFor = id;
    labelElement.innerText = label
    formGroup.append(labelElement);
    return formGroup;
  }
  //Блок для ввода контактов клиента
  function createContactsBlock(client) {
    const contactsElement = document.createElement('div');
    contactsElement.classList.add('edit-client__contacts');
    const buttonWithIcon = document.createElement('div');
    buttonWithIcon.classList.add('edit-client__btn-add-group');
    const icon = `<svg class="edit-client__btn-add-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <g clip-path="url(#clip0_224_8628)">
                      <path class="edit-client__btn-add-icon_defult" d="M7.99998 4.66659C7.63331 4.66659 7.33331 4.96659 7.33331 5.33325V7.33325H5.33331C4.96665 7.33325 4.66665 7.63325 4.66665 7.99992C4.66665 8.36659 4.96665 8.66659 5.33331 8.66659H7.33331V10.6666C7.33331 11.0333 7.63331 11.3333 7.99998 11.3333C8.36665 11.3333 8.66665 11.0333 8.66665 10.6666V8.66659H10.6666C11.0333 8.66659 11.3333 8.36659 11.3333 7.99992C11.3333 7.63325 11.0333 7.33325 10.6666 7.33325H8.66665V5.33325C8.66665 4.96659 8.36665 4.66659 7.99998 4.66659ZM7.99998 1.33325C4.31998 1.33325 1.33331 4.31992 1.33331 7.99992C1.33331 11.6799 4.31998 14.6666 7.99998 14.6666C11.68 14.6666 14.6666 11.6799 14.6666 7.99992C14.6666 4.31992 11.68 1.33325 7.99998 1.33325ZM7.99998 13.3333C5.05998 13.3333 2.66665 10.9399 2.66665 7.99992C2.66665 5.05992 5.05998 2.66659 7.99998 2.66659C10.94 2.66659 13.3333 5.05992 13.3333 7.99992C13.3333 10.9399 10.94 13.3333 7.99998 13.3333Z" fill="#9873FF"/>
                      <path class="edit-client__btn-add-icon_action" fill-rule="evenodd" clip-rule="evenodd" d="M1.33331 8.00016C1.33331 4.32016 4.31998 1.3335 7.99998 1.3335C11.68 1.3335 14.6666 4.32016 14.6666 8.00016C14.6666 11.6802 11.68 14.6668 7.99998 14.6668C4.31998 14.6668 1.33331 11.6802 1.33331 8.00016ZM7.33329 5.33366C7.33329 4.96699 7.63329 4.66699 7.99996 4.66699C8.36663 4.66699 8.66663 4.96699 8.66663 5.33366V7.33366H10.6666C11.0333 7.33366 11.3333 7.63366 11.3333 8.00033C11.3333 8.36699 11.0333 8.66699 10.6666 8.66699H8.66663V10.667C8.66663 11.0337 8.36663 11.3337 7.99996 11.3337C7.63329 11.3337 7.33329 11.0337 7.33329 10.667V8.66699H5.33329C4.96663 8.66699 4.66663 8.36699 4.66663 8.00033C4.66663 7.63366 4.96663 7.33366 5.33329 7.33366H7.33329V5.33366Z" fill="#9873FF"/>
                    </g>
                  </svg>`;
    buttonWithIcon.innerHTML = icon;

    const addButton = document.createElement('button');
    addButton.classList.add('edit-client__btn-add', 'btn', 'btn-simple');
    addButton.innerText = 'Добавить контакт';
    addButton.type = 'button';

    let contactsList = document.createElement('ul');
    contactsList.classList.add('edit-client__contacts-list');
    contactsElement.prepend(contactsList);
    const showHideAddButton = function() {
      if (contactsList.childElementCount >= 10) {
        buttonWithIcon.style.display = 'none';
      } else {
        buttonWithIcon.style.display = '';
      }
    }
    if (client) {
      for (const contact of client.contacts) {
        contactsList.append(createContactLine({onDelete: showHideAddButton}, contact));
      }
      showHideAddButton();
    }
    addButton.addEventListener('click', function (event) {
      contactsList.append(createContactLine({onDelete: showHideAddButton}));
      showHideAddButton();
    })
    buttonWithIcon.append(addButton)
    contactsElement.append(buttonWithIcon);
    return contactsElement;
  }

  function disableForm(form, isDisabled) {
    let formElements = form.querySelectorAll('select, input, button, .custom-select');
    formElements.forEach(elem => elem.disabled = isDisabled);
    formElements = form.querySelectorAll('.custom-select');
    formElements.forEach(elem => elem.classList.toggle('custom-select_disabled', isDisabled));
  }
  //Сброс данных о валидации формы
  function resetValidationResult(form) {
    let inputs = form.querySelectorAll('input');
    for (const input of inputs) {
      input.setCustomValidity("");
      input.classList.remove('invalid');
    }
  }

  function validateAddForm(form) {
    const contactsValueElements = form.querySelectorAll('.edit-client__contact-value');
    let isValid = true;
    for (const contactsValueElement of contactsValueElements) {
      if (!contactsValueElement.value) {
        contactsValueElement.classList.add('invalid');
        isValid = false;
      }
    }
    return isValid ? null : "Все контакты должны быть заполнены";
  }

  function showValidationMessage(form, errorBlock, validationResult) {
    let errorText = 'Ошибка:\n';
    const inputs = form.querySelectorAll('input');
    for (const input of inputs) {
      if (!input.validity.valid) {
        const inputLabel = document.querySelector('label[for=\'' + input.id + '\']');
        if (inputLabel) {
          errorText += `${inputLabel.textContent}: ${input.validationMessage}\n`;
        } else {
          errorText += `${input.validationMessage}\n`;
        }
      }
    }
    errorBlock.innerText = errorText;
    if (validationResult) {
      errorBlock.append(validationResult);
    }
    errorBlock.style.display = 'block';
  }
  //Анимация всплывающего окна
  function addModalAnimation(modalElement) {
    modalElement.classList.add('md-slide-in');
    setTimeout(() => {
      modalElement.classList.add('md-show');
    }, 100);
  }
  //Обновление таблицы переданными строками
  function fillTableBody(tableBody, items) {
    tableBody.innerHTML = '';
    if (items) {
      for (const clientElement of items) {
        tableBody.append(clientElement);
      }
    }
  }
  //Подготовка для постоения строк таблицы
  function buildTableRows(clients) {
    if (sortProperty) {
      clients = sortData(clients, sortProperty, sortAsc);
      renderSortTableHeader(sortProperty, sortAsc);
    }

    const onChange = function (hash) {
      if (location.hash === hash) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }
    return getClientsRows(clientsForView, {onChange, onDelete});
  }
  //сортировка
  function sortData(data, prop, asc = true) {
    return data.sort((s1, s2) => {
      return (asc ? s1[prop] < s2[prop] : s1[prop] > s2[prop]) ? -1 : 1;
    })
  }
  //Отображение столбцов сортировки
  function renderSortTableHeader(sortProperty, sortAsc) {
    const sotrableHeaders = document.querySelectorAll('[data-sort-prop]');

    for (const header of sotrableHeaders) {
      const headerClassList = header.classList;
      for(var i=headerClassList.length-1 ; i>=0;i--){
        if (headerClassList[i].endsWith("-asc") || headerClassList[i].endsWith("-desc")){
          headerClassList.remove(headerClassList[i]);
        }
      }
    }
    const columnHeader = document.querySelector(`[data-sort-prop = '${sortProperty}']`);
    if (columnHeader && columnHeader.classList.contains('clients__table-header_sortable')) {
      if (columnHeader.classList.contains('clients__table-header_sortable-str')) {
        renderSortIcon(columnHeader, sortAsc, 'clients__table-header_sortable-str-asc', 'clients__table-header_sortable-str-desc');
      } else {
        renderSortIcon(columnHeader, sortAsc, 'clients__table-header_sortable-asc', 'clients__table-header_sortable-desc');
      }
    }
  }

  function renderSortIcon(columnHeader, sortAsc, ascClass, descClass) {
    columnHeader.classList.toggle(ascClass, !!sortAsc);
    columnHeader.classList.toggle(descClass, sortAsc !== null && !sortAsc);
  }

  //Подтверждение удаления
  function confirmDelete(onConfirm) {
    const modal = createModal();
    const content = document.createElement('div');
    content.classList.add('delete-client');
    modal.contentContainer.append(content);

    const title = document.createElement('h1');
    title.classList.add('modal__title', 'delete-client__title');
    title.innerText = 'Удалить клиента';
    content.append(title);

    const confirmText = document.createElement('div');
    confirmText.classList.add('delete-client__text');
    confirmText.innerText = 'Вы действительно хотите удалить данного клиента?';
    content.append(confirmText);

    const deleteButton = document.createElement('button')
    deleteButton.classList.add('modal__btn-primary', 'btn', 'btn-primary');
    deleteButton.innerText = 'Удалить';
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', function (event) {
      onConfirm();
      modal.overlayElement.remove();
    })
    content.append(deleteButton);

    const cancelButton = document.createElement('button')
    cancelButton.classList.add('modal__btn-secondary', 'btn', 'btn-simple');
    cancelButton.type = 'button';
    cancelButton.innerText = 'Отмена';
    cancelButton.addEventListener('click', function (event) {
        modal.overlayElement.remove();
    });
    content.append(cancelButton);
    addModalAnimation(modal.modalElement);
  }
  //Открытие карточки клиента по hash
  async function openModalByHash() {
    if (this.location.hash) {
      let target = this.document.querySelector(`[href = '${this.location.hash}']`);
      if (target) {
        const anotherModal = document.querySelector('.overlay');
        if (anotherModal) {
          anotherModal.remove();
        }
        target.classList.add('clients__button_loading');
        const response = await fetch(`http://localhost:3000/api/clients/${target.dataset.clientId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const client = await response.json();
        const handlers = {
          async onSave(formData, clientId) {
            const request = collectClientDataForRequest(formData);
            try {
              const response = await fetch(`http://localhost:3000/api/clients/${clientId}`, {
                method: 'PATCH',
                body: JSON.stringify(request),
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              if (response.ok) {
                loadClientsTable();
              } else {
                return getMessageFromError(await response.json())
              }
            }
            catch (error) {
              return getMessageFromError();
            }
          },
          onDelete
        }
        target.classList.remove('clients__button_loading');
        openEditClientPopup(handlers, client);
      }
    }
  }

  function createContractTypeSelect(value) {
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('edit-client__contact-type', 'custom-select');
    const contactType = document.createElement('select');
    contactType.name = 'contactType';
    selectContainer.append(contactType);
    contactType.append(createOption('telephone', 'Телефон'));
    contactType.append(createOption('email', 'Email'));
    contactType.append(createOption('facebook', 'Facebook'));
    contactType.append(createOption('vk', 'Vk'));
    contactType.append(createOption('other', 'Другое'));
    if (value) {
      contactType.value = value;
    }
    transformToCustomSelect(selectContainer);
    return selectContainer;
  }
  //Кастомный селект
  function transformToCustomSelect(selectContainer) {
    const selectableElements = [];
    const selectElement = selectContainer.getElementsByTagName("select")[0];
    const optionsLength = selectElement.length;
    const selectedOption = document.createElement('div');
    selectedOption.tabIndex = 0;
    selectedOption.classList.add('custom-select__selected');
    selectedOption.innerHTML = selectElement.options[selectElement.selectedIndex].innerHTML;
    selectedOption.dataset.value = selectElement.options[selectElement.selectedIndex].value;
    selectContainer.append(selectedOption);
    selectableElements.push(selectedOption);
    const selectItems = document.createElement('div');
    selectItems.classList.add('custom-select__select-items', 'custom-select__select-hide');
    for (let i = 0; i < optionsLength; i++) {
      const selectOption = document.createElement('div');
      selectOption.innerHTML = selectElement.options[i].innerHTML;
      selectOption.dataset.value = selectElement.options[i].value;
      selectOption.tabIndex = 0;
      selectOption.addEventListener('click', function (event) {
        for (let j = 0; j < optionsLength; j++) {
          if (selectElement.options[j].value === this.dataset.value) {
            selectElement.selectedIndex = j;
            selectedOption.innerHTML = this.innerHTML;
            selectedOption.dataset.value = this.dataset.value;
            let sameAsSelect = selectItems.getElementsByClassName("custom-select__same-as-selected");
            for (k = 0; k < sameAsSelect.length; k++) {
              sameAsSelect[k].classList.remove('custom-select__same-as-selected');
            }
            this.classList.add('custom-select__same-as-selected');
            break;
          }
        }
        selectedOption.click();
      });
      selectOption.addEventListener('keydown', function (event) {
        if (event.code === 'Enter' || event.code === 'Space') {
          event.preventDefault();
          selectOption.dispatchEvent(new Event("click"));
        }
      });
      selectOption.addEventListener('focusout', function (event) {
        event.stopPropagation();
        event.preventDefault();
        if (!selectableElements.includes(event.relatedTarget)) {
          closeAllSelect();
        }
      });
      selectItems.append(selectOption);
      selectableElements.push(selectOption);
    }
    selectContainer.append(selectItems);
    selectedOption.addEventListener('click', function (event) {
      event.stopPropagation();
      closeAllSelect(this);
      selectItems.classList.toggle('custom-select__select-hide');
      this.classList.toggle("custom-select__selected_active");
    });
    selectedOption.addEventListener('keydown', function (event) {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        selectedOption.dispatchEvent(new Event("click"));
      }
    });
    selectedOption.addEventListener('focusout', function (event) {
      event.stopPropagation();
      event.preventDefault();
      if (!selectableElements.includes(event.relatedTarget)) {
        closeAllSelect();
      }
    });
  }

  function closeAllSelect(elmnt) {
    const arrNo = [];
    const selectItemsList = document.getElementsByClassName("custom-select__select-items");
    const selectedList = document.getElementsByClassName("custom-select__selected");
    for (let i = 0; i < selectedList.length; i++) {
      if (elmnt == selectedList[i]) {
        arrNo.push(i)
      } else {
        selectedList[i].classList.remove("custom-select__selected_active");
      }
    }
    for (i = 0; i < selectItemsList.length; i++) {
      if (arrNo.indexOf(i)) {
        selectItemsList[i].classList.add("custom-select__select-hide");
      }
    }
  }

  function createOption(value, name) {
    const optionElement = document.createElement('option');
    optionElement.value = value;
    optionElement.innerText = name;
    return optionElement;
  }

  function createContactLine({onDelete}, contact) {
    const contactLine = document.createElement('li');
    contactLine.classList.add('edit-client__contacts-item');
    const contactType = createContractTypeSelect(contact ? contact.type : null);
    contactLine.append(contactType);
    const contactValue = document.createElement('input');
    contactValue.classList.add('edit-client__contact-value');
    contactValue.placeholder = 'Введите данные контакта';
    contactValue.name = 'contactValue';
    if (contact) {
      contactValue.value = contact.value;
    }
    contactValue.addEventListener('input', function (event) {
      this.classList.remove('invalid');
    })
    contactLine.append(contactValue);
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('btn', 'edit-client__contact-delete', 'tooltip');
    deleteButton.type = 'button';
    const deleteImg = document.createElement('div');
    deleteImg.classList.add('close-sign');
    deleteButton.append(deleteImg);
    const tooltipText = document.createElement('div');
    tooltipText.classList.add('tooltip__text');
    tooltipText.innerHTML = 'Удалить контакт';
    deleteButton.addEventListener('click', function (event) {
      contactLine.remove();
      onDelete();
    })
    deleteButton.append(tooltipText);
    contactLine.append(deleteButton);
    return contactLine;
  }

  function createDataCell() {
    const cell = document.createElement('div');
    cell.classList.add('clients__table-cell', 'clients__table-data-cell');
    return cell;
  }

  function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
  }

  function createDateDataCell(dateData) {
    const dateElement = createDataCell();
    dateElement.innerHTML = `${pad(dateData.getDate(), 2)}.${pad(dateData.getMonth() + 1, 2)}.${dateData.getFullYear()}`;
    const timeElement = document.createElement('span');
    timeElement.classList.add('clients__table-data-time');
    timeElement.innerHTML = `${pad(dateData.getHours(), 2)}:${pad(dateData.getMinutes(), 2)}`;
    dateElement.append(timeElement);
    return dateElement;
  }

  function getContactIcon(type) {
    let icon;
    switch (type) {
      case 'vk':
        icon = `<svg class="clients__contact-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g>
                  <path d="M8 0C3.58187 0 0 3.58171 0 8C0 12.4183 3.58187 16 8 16C12.4181 16 16 12.4183 16 8C16 3.58171 12.4181 0 8 0ZM12.058 8.86523C12.4309 9.22942 12.8254 9.57217 13.1601 9.97402C13.3084 10.1518 13.4482 10.3356 13.5546 10.5423C13.7065 10.8371 13.5693 11.1604 13.3055 11.1779L11.6665 11.1776C11.2432 11.2126 10.9064 11.0419 10.6224 10.7525C10.3957 10.5219 10.1853 10.2755 9.96698 10.037C9.87777 9.93915 9.78382 9.847 9.67186 9.77449C9.44843 9.62914 9.2543 9.67366 9.1263 9.90707C8.99585 10.1446 8.96606 10.4078 8.95362 10.6721C8.93577 11.0586 8.81923 11.1596 8.43147 11.1777C7.60291 11.2165 6.81674 11.0908 6.08606 10.6731C5.44147 10.3047 4.94257 9.78463 4.50783 9.19587C3.66126 8.04812 3.01291 6.78842 2.43036 5.49254C2.29925 5.2007 2.39517 5.04454 2.71714 5.03849C3.25205 5.02817 3.78697 5.02948 4.32188 5.03799C4.53958 5.04143 4.68362 5.166 4.76726 5.37142C5.05633 6.08262 5.4107 6.75928 5.85477 7.38684C5.97311 7.55396 6.09391 7.72059 6.26594 7.83861C6.45582 7.9689 6.60051 7.92585 6.69005 7.71388C6.74734 7.57917 6.77205 7.43513 6.78449 7.29076C6.82705 6.79628 6.83212 6.30195 6.75847 5.80943C6.71263 5.50122 6.53929 5.30218 6.23206 5.24391C6.07558 5.21428 6.0985 5.15634 6.17461 5.06697C6.3067 4.91245 6.43045 4.81686 6.67777 4.81686L8.52951 4.81653C8.82136 4.87382 8.88683 5.00477 8.92645 5.29874L8.92808 7.35656C8.92464 7.47032 8.98521 7.80751 9.18948 7.88198C9.35317 7.936 9.4612 7.80473 9.55908 7.70112C10.0032 7.22987 10.3195 6.67368 10.6029 6.09801C10.7279 5.84413 10.8358 5.58142 10.9406 5.31822C11.0185 5.1236 11.1396 5.02785 11.3593 5.03112L13.1424 5.03325C13.195 5.03325 13.2483 5.03374 13.3004 5.04274C13.6009 5.09414 13.6832 5.22345 13.5903 5.5166C13.4439 5.97721 13.1596 6.36088 12.8817 6.74553C12.5838 7.15736 12.2661 7.55478 11.9711 7.96841C11.7001 8.34652 11.7215 8.53688 12.058 8.86523Z"/>
                  </g>
                </svg>`;
        break;
      case 'facebook':
        icon = `<svg class="clients__contact-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g>
                    <path d="M7.99999 0C3.6 0 0 3.60643 0 8.04819C0 12.0643 2.928 15.3976 6.75199 16V10.3775H4.71999V8.04819H6.75199V6.27309C6.75199 4.25703 7.94399 3.14859 9.77599 3.14859C10.648 3.14859 11.56 3.30121 11.56 3.30121V5.28514H10.552C9.55999 5.28514 9.24799 5.90362 9.24799 6.53815V8.04819H11.472L11.112 10.3775H9.24799V16C11.1331 15.7011 12.8497 14.7354 14.0879 13.2772C15.3261 11.819 16.0043 9.96437 16 8.04819C16 3.60643 12.4 0 7.99999 0Z"/>
                  </g>
                </svg>`;
        break;
      case 'telephone':
        icon = `<svg class="clients__contact-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g>
                    <circle cx="8" cy="8" r="8"/>
                    <path d="M11.56 9.50222C11.0133 9.50222 10.4844 9.41333 9.99111 9.25333C9.83556 9.2 9.66222 9.24 9.54222 9.36L8.84444 10.2356C7.58667 9.63556 6.40889 8.50222 5.78222 7.2L6.64889 6.46222C6.76889 6.33778 6.80444 6.16444 6.75556 6.00889C6.59111 5.51556 6.50667 4.98667 6.50667 4.44C6.50667 4.2 6.30667 4 6.06667 4H4.52889C4.28889 4 4 4.10667 4 4.44C4 8.56889 7.43556 12 11.56 12C11.8756 12 12 11.72 12 11.4756V9.94222C12 9.70222 11.8 9.50222 11.56 9.50222Z" fill="white"/>
                  </g>
                </svg>`;
        break;
      case 'email':
        icon = `<svg class="clients__contact-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM4 5.75C4 5.3375 4.36 5 4.8 5H11.2C11.64 5 12 5.3375 12 5.75V10.25C12 10.6625 11.64 11 11.2 11H4.8C4.36 11 4 10.6625 4 10.25V5.75ZM8.424 8.1275L11.04 6.59375C11.14 6.53375 11.2 6.4325 11.2 6.32375C11.2 6.0725 10.908 5.9225 10.68 6.05375L8 7.625L5.32 6.05375C5.092 5.9225 4.8 6.0725 4.8 6.32375C4.8 6.4325 4.86 6.53375 4.96 6.59375L7.576 8.1275C7.836 8.28125 8.164 8.28125 8.424 8.1275Z"/>
                </svg>`;
        break;
      default:
        icon = `<svg class="clients__contact-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13C5.24 13 3 10.76 3 8ZM9.5 6C9.5 5.17 8.83 4.5 8 4.5C7.17 4.5 6.5 5.17 6.5 6C6.5 6.83 7.17 7.5 8 7.5C8.83 7.5 9.5 6.83 9.5 6ZM5 9.99C5.645 10.96 6.75 11.6 8 11.6C9.25 11.6 10.355 10.96 11 9.99C10.985 8.995 8.995 8.45 8 8.45C7 8.45 5.015 8.995 5 9.99Z"/>
                  </g>
                </svg>`;
    }
    return icon;
  }

  function getTypeText(type) {
    let text;
    switch (type) {
      case 'vk':
        text = 'Vk';
        break;
      case 'facebook':
        text = 'Facebook';
        break;
      case 'telephone':
        text = 'Телефон';
        break;
      case 'email':
        text = 'Email';
        break;
      default:
        text = '';
    }
    return text;
  }

  function createChangeButton(clientId, onChange) {
    const changeButton = document.createElement('a');
    const hash = `#clientCard${clientId}`;
    changeButton.href = hash;
    changeButton.dataset.clientId = clientId;
    changeButton.dataset.hash = hash;
    changeButton.classList.add('clients__button', 'clients__change-button', 'btn', 'btn-simple');
    changeButton.innerHTML = 'Изменить';
    changeButton.addEventListener('click', async function (event) {
      onChange(this.dataset.hash);
    });
    return changeButton;
  }

  function showContactsBlock(contacts, short = true) {
    const contactsBlockElement = createDataCell();
    const maxItems = short ? 4 : contacts.length;
    let currentCount = 0;
    for (const contact of contacts) {
      if (currentCount >= maxItems) {
        break;
      }
      const contactElement = document.createElement('div');
      contactElement.classList.add('clients__contact', 'tooltip');
      contactElement.innerHTML = getContactIcon(contact.type);

      const tooltipElement = document.createElement('span');
      tooltipElement.classList.add('clients__contact-text', 'tooltip__text')
      contactElement.append(tooltipElement);

      const contactTypeElement = document.createElement('span');
      contactTypeElement.classList.add('clients__contact-type');
      const typeText = getTypeText(contact.type);
      if (typeText) {
        contactTypeElement.innerHTML = typeText + ': ';
      }
      tooltipElement.append(contactTypeElement);
      tooltipElement.append(contact.value);

      contactsBlockElement.append(contactElement);
      currentCount++;
    }
    const itemsLeftCount = contacts.length - currentCount;
    if (itemsLeftCount > 0 && short) {
      const moreElement = document.createElement('div');
      moreElement.classList.add('clients__contact', 'clients__contact-more', 'btn');
      moreElement.innerHTML = '+' + itemsLeftCount;
      moreElement.addEventListener('click', function (event) {
        contactsBlockElement.innerHTML = '';
        const allContactsElementBlock = showContactsBlock(contacts, false);
        for (let i = 0; i < allContactsElementBlock.children.length; i++) {
          const element = allContactsElementBlock.children[i];
          contactsBlockElement.append(element.cloneNode(true));
        }
      });
      contactsBlockElement.append(moreElement);
    }
    return contactsBlockElement;
  }

  function renderClientItem (client, {onChange, onDelete}) {
    const clientElement = document.createElement('div');
    clientElement.classList.add('clients__table-row', 'clients__table-data-row');

    const clientIdElement = createDataCell();
    clientIdElement.innerHTML = client.id;
    clientElement.append(clientIdElement);

    const clientNameElement = createDataCell();
    clientNameElement.innerHTML = client.fullName;
    clientElement.append(clientNameElement);

    clientElement.append(createDateDataCell(client.createdAt));
    clientElement.append(createDateDataCell(client.updatedAt));
    clientElement.append(showContactsBlock(client.contacts));

    const buttonGroupElement = createDataCell();
    buttonGroupElement.append(createChangeButton(client.id, onChange));
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('clients__button', 'clients__delete-button', 'btn', 'btn-simple');
    deleteButton.innerHTML = 'Удалить';
    deleteButton.addEventListener('click', function (event) {
      onDelete(client.id);
    })
    buttonGroupElement.append(deleteButton);
    clientElement.append(buttonGroupElement);

    return clientElement;
  }

  function getClientsRows(clients, {onChange, onDelete}) {
    const clientElements = []
    for (const client of clients) {
      clientElements.push(renderClientItem(client, {onChange, onDelete}))
    }
    return clientElements
  }
})();
