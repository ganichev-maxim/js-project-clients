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
    buildSearchBlock();
    document.addEventListener('click', closeSearchResults);
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
    //Закгрыте модального окна с клавиатуры
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        const modal = document.querySelector('.overlay');
        if (modal) {
          modal.remove();
        }
      }
    });
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
    const icon = Icons.addContact;
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
        icon = Icons.vk;
        break;
      case 'facebook':
        icon = Icons.facebook;
        break;
      case 'telephone':
        icon = Icons.telephone;
        break;
      case 'email':
        icon = Icons.email;
        break;
      default:
        icon = Icons.contactInfo;
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
    clientElement.id = `client${client.id}`;

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

  function buildSearchBlock() {
    var searchTimer;
    const searchFilterBlockElement = document.getElementById('searchFilterBlock');
    const searchFilterInputElement = document.getElementById('searchFilter');
    searchFilterInputElement.addEventListener('click', function (event) {
      event.stopPropagation();
    })
    searchFilterInputElement.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const selectedElement = searchFilterBlockElement.querySelector('.header__auto-complete-list-item:not(:last-child).active');
        if (selectedElement) {
          selectedElement.classList.remove('active');
          selectedElement.nextSibling.classList.add('active');
        }
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const selectedElement = searchFilterBlockElement.querySelector('.header__auto-complete-list-item:not(:first-child).active');
        if (selectedElement) {
          selectedElement.classList.remove('active');
          selectedElement.previousSibling.classList.add('active');
        }
      }
      if (event.key === 'Enter') {
        const selectedElement = searchFilterBlockElement.querySelector('.header__auto-complete-list-item.active > .header__auto-complete-list-item-link');
        if (selectedElement) {
          selectedElement.click();
        } else {
          var cells = document.getElementsByClassName("clients__table-data-cell");
          for (var i = 0; i < cells.length; i++) {
            if (cells[i].textContent.includes(this.value)) {
              createClientSearchLink(`${cells[i].parentElement.id}`).click();
            }
          }
        }
      }
    })
    searchFilterInputElement.addEventListener('click', async function (event) {
      const searchValue = this.value;
      const serchResultsElement = document.getElementById('searchResults');
      if (searchValue && !serchResultsElement) {
        const searchResults = await performSearch(searchValue);
        if (searchResults) {
          searchFilterBlockElement.append(searchResults);
        }
      }
    })
    searchFilterInputElement.addEventListener('input', function (event) {
      clearTimeout(searchTimer);
      const searchValue = this.value;
      let serchResultsElement = document.getElementById('searchResults');
      if (serchResultsElement) {
        serchResultsElement.remove();
      }
      searchTimer = setTimeout(async function() {
        if (searchValue) {
          const searchResults = await performSearch(searchValue);
          if (searchResults) {
            searchFilterBlockElement.append(searchResults);
          }
        }
      }, 300);
    });
  }

  async function performSearch(searchValue) {
    const MAX_SEARCH_RESULT = 10;
    const clients = await getFromServer(searchValue);
    if (clients.length > 0) {
      serchResultsElement = document.createElement('ul');
      serchResultsElement.id = 'searchResults';
      serchResultsElement.classList.add('header__auto-complete-list');
      let count = 0;
      for (const client of clients) {
        if (count >= MAX_SEARCH_RESULT) {
          break;
        }
        const searchItemElement = document.createElement('li');
        searchItemElement.classList.add('header__auto-complete-list-item');
        searchItemElement.classList.toggle('active', count === 0);
        serchResultsElement.append(searchItemElement);
        const clientRefElement = createClientSearchLink(`client${client.id}`);
        clientRefElement.innerText = `${client.name} ${client.surname}`;
        clientRefElement.classList.add('header__auto-complete-list-item-link');
        clientRefElement.tabIndex = -1;
        searchItemElement.append(clientRefElement);
        count++;
      }
      return serchResultsElement;
    }
  }

  function createClientSearchLink(clientHref) {
    const clientRefElement = document.createElement('a');
    clientRefElement.href = `#${clientHref}`;
    clientRefElement.addEventListener('click', function (event) {
      for (const row of document.getElementsByClassName('clients__table-data-row')) {
        row.classList.remove('active');
      }
      const selectedRow = document.getElementById(this.href.substring(this.href.indexOf('#') + 1));
      selectedRow.classList.add('active');
    });
    return clientRefElement;
  }

  function closeSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.remove();
    }
  }
})();
