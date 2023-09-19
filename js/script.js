(function() {
  function createModal(onClose) {
    const modalElement = document.createElement('div');
    modalElement.classList.add('overlay');
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('modal');
    const closeWindow = document.createElement('button');
    closeWindow.classList.add('modal__btn-close', 'btn');
    closeWindow.addEventListener('click', function (event) {
      onClose(modalElement);
    })
    contentContainer.append(closeWindow);
    modalElement.append(contentContainer);
    document.body.append(modalElement);
    return {contentContainer, modalElement};
  }

  function transformToCustomSelect(selectContainer) {
    const selectElement = selectContainer.getElementsByTagName("select")[0];
    const optionsLength = selectElement.length;
    const selectedOption = document.createElement('div');
    selectedOption.classList.add('custom-select__selected');
    selectedOption.innerHTML = selectElement.options[selectElement.selectedIndex].innerHTML;
    selectedOption.dataset.value = selectElement.options[selectElement.selectedIndex].value;
    selectContainer.append(selectedOption);
    const selectItems = document.createElement('div');
    selectItems.classList.add('custom-select__select-items', 'custom-select__select-hide');
    for (let i = 0; i < optionsLength; i++) {
      const selectOption = document.createElement('div');
      selectOption.innerHTML = selectElement.options[i].innerHTML;
      selectOption.dataset.value = selectElement.options[i].value;
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
      selectItems.append(selectOption);
    }
    selectContainer.append(selectItems);
    selectedOption.addEventListener('click', function (event) {
      event.stopPropagation();
      closeAllSelect(this);
      selectItems.classList.toggle('custom-select__select-hide');
      this.classList.toggle("custom-select__selected_active");
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

  function createFormTextInput({id, label, required, classToAdd}) {
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
    formGroup.append(inputElement);

    const labelElement = document.createElement('label');
    labelElement.classList.add('form-group__label')
    labelElement.for = id;
    labelElement.innerText = label
    formGroup.append(labelElement);
    return formGroup;
  }

  function createOption(value, name) {
    const optionElement = document.createElement('option');
    optionElement.value = value;
    optionElement.innerText = name;
    return optionElement;
  }

  function createContractTypeSelect() {
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('edit-client__contact-type', 'custom-select');
    const contactType = document.createElement('select');
    selectContainer.append(contactType);
    contactType.append(createOption('telephone', 'Телефон'));
    contactType.append(createOption('email', 'Email'));
    contactType.append(createOption('facebook', 'Facebook'));
    contactType.append(createOption('vk', 'Vk'));
    contactType.append(createOption('other', 'Другое'));
    transformToCustomSelect(selectContainer);
    return selectContainer;
  }

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
    addButton.addEventListener('click', function (event) {
      const contactsListId = 'contactsList'
      let contactsList = document.getElementById(contactsListId);
      if (!contactsList) {
        contactsList = document.createElement('ul');
        contactsList.id = contactsListId;
        contactsList.classList.add('edit-client__contacts-list');
        contactsElement.prepend(contactsList);
      }
      const contactLine = document.createElement('li');
      contactLine.classList.add('edit-client__contacts-item');
      const contactType = createContractTypeSelect();
      contactLine.append(contactType);
      const contactValue = document.createElement('input');
      contactValue.classList.add('edit-client__contact-value');
      contactLine.append(contactValue);
      const deleteButton = document.createElement('button');
      deleteButton.classList.add('btn', 'edit-client__contact-delete');
      contactLine.append(deleteButton);
      contactsList.append(contactLine);
    })
    buttonWithIcon.append(addButton)
    contactsElement.append(buttonWithIcon);
    return contactsElement;
  }

  function openEditClientPopup({onSave, onClose}, client) {
    const modal = createModal(onClose);
    const content = document.createElement('div');
    content.classList.add('edit-client');
    modal.contentContainer.append(content);

    const title = document.createElement('h1');
    title.classList.add('modal__title', 'edit-client__title');
    title.innerText = client ? 'Изменить данные' : 'Новый клиент';
    content.append(title);

    const form = document.createElement('form');
    form.classList.add('edit-client__form');
    form.append(createFormTextInput({id: 'lastName', label: 'Фамилия', required: true, classToAdd: 'edit-client__lastName'}));
    form.append(createFormTextInput({id: 'firstName', label: 'Имя', required: true}));
    form.append(createFormTextInput({id: 'middleName', label: 'Отчество', classToAdd: 'edit-client__middleName'}));
    form.append(createContactsBlock(client));

    const errorBlock = document.createElement('p');
    errorBlock.classList.add('edit-client__errors');
    form.append(errorBlock);

    const saveButton = document.createElement('button')
    saveButton.classList.add('edit-client__btn-save', 'btn', 'btn-primary');
    saveButton.innerText = 'Сохранить';
    saveButton.type = 'submit';
    form.append(saveButton);

    const cancelButton = document.createElement('button')
    cancelButton.classList.add('edit-client__btn-cancel', 'btn', 'btn-simple');
    cancelButton.innerText = 'Отмена';
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', function (event) {
      onClose(modal.modalElement);
    })
    form.append(cancelButton);

    content.append(form);
  }

  document.addEventListener("DOMContentLoaded", function (event) {
    const handlers = {
      onSave(modalElement) {
        modalElement.remove();
      },
      onClose(modalElement) {
        modalElement.remove();
      }
    }

    document.getElementById("addClientButton").addEventListener ("click", function (event) {
      openEditClientPopup(handlers);
    });

    document.addEventListener("click", closeAllSelect);
  })
})();
