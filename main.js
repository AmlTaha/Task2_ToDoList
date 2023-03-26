class ListAPI {
  static getItems(columnId) {
    const column = read().find((column) => column.id == columnId);

    if (!column) {
      return [];
    }

    return column.items;
  }

  static insertItem(columnId, content) {
    const data = read();
    const column = data.find((column) => column.id == columnId);
    const item = {
      id: Math.floor(Math.random() * 100000),
      content,
    };

    if (!column) {
      throw new Error("Column does not exist.");
    }

    column.items.push(item);
    save(data);

    return item;
  }

  static updateItem(itemId, newProps) {
    //update item
    const data = read();
    const [item, currentColumn] = (() => {
      for (const column of data) {
        const item = column.items.find((item) => item.id == itemId);

        if (item) {
          return [item, column];
        }
      }
    })();

    if (!item) {
      throw new Error("Item not found.");
    }

    item.content =
      newProps.content === undefined ? item.content : newProps.content;

    // Update column and position
    if (newProps.columnId !== undefined && newProps.position !== undefined) {
      const targetColumn = data.find(
        (column) => column.id == newProps.columnId
      );

      if (!targetColumn) {
        throw new Error("Target column not found.");
      }

      // Delete the item from it's current column
      currentColumn.items.splice(currentColumn.items.indexOf(item), 1);

      // Move item into it's new column and position
      targetColumn.items.splice(newProps.position, 0, item);
    }

    save(data);
  }

  static deleteItem(itemId) {
    const data = read();

    for (const column of data) {
      const item = column.items.find((item) => item.id == itemId);

      if (item) {
        column.items.splice(column.items.indexOf(item), 1);
      }
    }

    save(data);
  }
}

function read() {
  const json = localStorage.getItem("listData");

  if (!json) {
    return [
      {
        id: 1,
        items: [],
      },
      {
        id: 2,
        items: [],
      },
      {
        id: 3,
        items: [],
      },
    ];
  }

  return JSON.parse(json);
}

function save(data) {
  localStorage.setItem("listData", JSON.stringify(data));
}

class DropZone {
  static createDropZone() {
    const range = document.createRange();

    range.selectNode(document.body);

    const dropZone = range.createContextualFragment(`
              <div class="listDropzone"></div>
          `).children[0];

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("listDropzone--active");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("listDropzone--active");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("listDropzone--active");

      const columnElement = dropZone.closest(".listColumn");
      const columnId = Number(columnElement.dataset.id);
      const dropZonesInColumn = Array.from(
        columnElement.querySelectorAll(".listDropzone")
      );
      const droppedIndex = dropZonesInColumn.indexOf(dropZone);
      const itemId = Number(e.dataTransfer.getData("text/plain"));
      const droppedItemElement = document.querySelector(
        `[data-id="${itemId}"]`
      );
      const insertAfter = dropZone.parentElement.classList.contains("listItem")
        ? dropZone.parentElement
        : dropZone;

      if (droppedItemElement.contains(dropZone)) {
        return;
      }

      insertAfter.after(droppedItemElement);
      ListAPI.updateItem(itemId, {
        columnId,
        position: droppedIndex,
      });
    });

    return dropZone;
  }
}

class Item {
  constructor(id, content) {
    const bottomDropZone = DropZone.createDropZone();

    this.elements = {};
    this.elements.root = Item.createRoot();
    this.elements.input = this.elements.root.querySelector(".listItemInput");

    this.elements.root.dataset.id = id;
    this.elements.input.textContent = content;
    this.content = content;
    this.elements.root.appendChild(bottomDropZone);

    const onBlur = () => {
      const newContent = this.elements.input.textContent.trim();

      if (newContent == this.content) {
        return;
      }

      this.content = newContent;

      ListAPI.updateItem(id, {
        content: this.content,
      });
    };

    this.elements.input.addEventListener("blur", onBlur);
    this.elements.root.addEventListener("dblclick", () => {
      const check = confirm("Are you sure you want to delete this item?");

      if (check) {
        ListAPI.deleteItem(id);

        this.elements.input.removeEventListener("blur", onBlur);
        this.elements.root.parentElement.removeChild(this.elements.root);
      }
    });

    this.elements.root.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", id);
    });

    this.elements.input.addEventListener("drop", (e) => {
      e.preventDefault();
    });
  }

  static createRoot() {
    const range = document.createRange();

    range.selectNode(document.body);

    return range.createContextualFragment(`
                <div class="listItem" draggable="true">
                    <div class="listItemInput" contenteditable></div>
            
                    
                </div>
            `).children[0];
  }
}

class Column {
  constructor(id, title) {
    const topDropZone = DropZone.createDropZone();

    this.elements = {};
    this.elements.root = Column.createRoot();
    this.elements.title = this.elements.root.querySelector(".listColumnTitle");
    this.elements.items = this.elements.root.querySelector(".listColumnItems");
    this.elements.addItem = this.elements.root.querySelector(".listAdd-item");

    this.elements.root.dataset.id = id;
    this.elements.title.textContent = title;
    this.elements.items.appendChild(topDropZone);

    this.elements.addItem.addEventListener("click", () => {
      const newItem = ListAPI.insertItem(id, "");

      this.renderItem(newItem);
    });

    ListAPI.getItems(id).forEach((item) => {
      this.renderItem(item);
    });
  }

  static createRoot() {
    const range = document.createRange();

    range.selectNode(document.body);

    return range.createContextualFragment(`
                <div class="listColumn">
                    <div class="listColumnTitle"></div>
                    <div class="listColumnItems"> </div>
                    <button class="listAdd-item" type="button">+ Add</button>
                </div>
            `).children[0];
  }

  renderItem(data) {
    const item = new Item(data.id, data.content);

    this.elements.items.appendChild(item.elements.root);
  }
}

class List {
  constructor(root) {
    this.root = root;

    List.columns().forEach((column) => {
      const columnView = new Column(column.id, column.title);

      this.root.appendChild(columnView.elements.root);
    });
  }

  static columns() {
    return [
      {
        id: 1,
        title: "Not Started",
      },
      {
        id: 2,
        title: "In Progress",
      },
      {
        id: 3,
        title: "Completed",
      },
    ];
  }
}

new List(document.querySelector(".List"));
