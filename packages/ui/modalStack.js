let modalBaseZIndex = 1000;
let modalStack = [];

function getNextModalZIndex() {
  modalBaseZIndex += 1;
  return modalBaseZIndex;
}

function bringModalToFront(modalElement) {
  if (!modalElement) {
    return;
  }

  modalElement.style.zIndex = String(getNextModalZIndex());
}

function openModal(modalElement) {
  if (!modalElement) {
    return;
  }

  modalStack = modalStack.filter(function(item) {
    return item !== modalElement;
  });
  modalStack.push(modalElement);
  modalElement.classList.remove("hidden");
  if (modalElement.classList.contains("items-center")) {
    modalElement.classList.add("flex");
  }
  bringModalToFront(modalElement);
}

function closeModal(modalElement) {
  if (!modalElement) {
    return;
  }

  modalStack = modalStack.filter(function(item) {
    return item !== modalElement;
  });
  modalElement.classList.add("hidden");
  modalElement.classList.remove("flex");
}

export { bringModalToFront, closeModal, getNextModalZIndex, openModal };
