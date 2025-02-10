const gridContainer = document.getElementById("gridContainer");
const columnsInput = document.getElementById("columns");
const rowsInput = document.getElementById("rows");
const gapInput = document.getElementById("gap");
const generateCodeButton = document.getElementById("generateCode");
const resetGridButton = document.getElementById("resetGrid");
const codeContainer = document.getElementById("codeContainer");
const generatedCode = document.getElementById("generatedCode");

let currentDrag = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let currentResize = null;
let resizeStartX = 0;
let resizeStartY = 0;
let originalColSpan = 1;
let originalRowSpan = 1;

// --- Grid Update (without wiping out grid items) ---
function updateGrid() {
  const columns = parseInt(columnsInput.value);
  const rows = parseInt(rowsInput.value);
  const gap = parseInt(gapInput.value);

  // Update container styles
  gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridContainer.style.gap = `${gap}px`;

  // Remove any existing add buttons (they will be re-added)
  const addButtons = gridContainer.querySelectorAll(".add-item");
  addButtons.forEach((btn) => btn.remove());

  // Determine which grid cells are occupied by grid items.
  let occupied = new Set();
  const gridItems = gridContainer.querySelectorAll(".grid-item");
  gridItems.forEach((item) => {
    const colStart = parseInt(item.dataset.colStart);
    const rowStart = parseInt(item.dataset.rowStart);
    const colSpan = parseInt(item.dataset.colSpan);
    const rowSpan = parseInt(item.dataset.rowSpan);
    for (let r = rowStart; r < rowStart + rowSpan; r++) {
      for (let c = colStart; c < colStart + colSpan; c++) {
        occupied.add(`${c},${r}`);
      }
    }
  });

  // Loop over each cell (by row & column) and if it's empty, add an add-button.
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= columns; c++) {
      if (!occupied.has(`${c},${r}`)) {
        const addButton = document.createElement("div");
        addButton.classList.add("add-item");
        addButton.textContent = "+";
        addButton.style.gridColumn = `${c} / span 1`;
        addButton.style.gridRow = `${r} / span 1`;
        // Compute an index (for naming) from cell coordinates
        const index = (r - 1) * columns + c;
        addButton.addEventListener("click", () =>
          addGridItemFromCell(addButton, c, r, index)
        );
        gridContainer.appendChild(addButton);
      }
    }
  }
}

// Create a new grid item in the given cell (col, row)
function addGridItemFromCell(button, col, row, index) {
  const gridItem = document.createElement("div");
  gridItem.classList.add("grid-item");
  gridItem.dataset.colStart = col;
  gridItem.dataset.rowStart = row;
  gridItem.dataset.colSpan = "1";
  gridItem.dataset.rowSpan = "1";
  gridItem.style.gridColumn = `${col} / span 1`;
  gridItem.style.gridRow = `${row} / span 1`;

  // Create a remove button (cross) at the top-right
  const removeButton = document.createElement("button");
  removeButton.classList.add("remove-button");
  removeButton.innerHTML = "&times;";
  removeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    gridItem.remove();
    updateGrid();
  });
  gridItem.appendChild(removeButton);

  // Create an editable label
  const label = document.createElement("div");
  label.classList.add("grid-label");
  label.contentEditable = true;
  label.textContent = "Item " + index;
  gridItem.appendChild(label);

  // Create a resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.classList.add("resize-handle");
  gridItem.appendChild(resizeHandle);

  // Add drag events (skip label, resize handle, and remove button)
  gridItem.addEventListener("mousedown", dragStart);
  label.addEventListener("mousedown", (e) => e.stopPropagation());
  resizeHandle.addEventListener("mousedown", resizeStartHandler);
  removeButton.addEventListener("mousedown", (e) => e.stopPropagation());

  gridContainer.replaceChild(gridItem, button);
  // Refresh the grid to re-add missing add-buttons.
  updateGrid();
}

// --- Drag and Drop Functionality ---
function dragStart(e) {
  if (
    e.target.classList.contains("grid-label") ||
    e.target.classList.contains("resize-handle") ||
    e.target.classList.contains("remove-button")
  ) {
    return;
  }
  currentDrag = e.currentTarget;
  const rect = currentDrag.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  currentDrag.style.zIndex = 1000;
  // Temporarily remove grid positioning to drag freely
  currentDrag.style.position = "absolute";
  document.addEventListener("mousemove", dragging);
  document.addEventListener("mouseup", dragEnd);
}

function dragging(e) {
  if (!currentDrag) return;
  const containerRect = gridContainer.getBoundingClientRect();
  let x = e.clientX - containerRect.left - dragOffsetX;
  let y = e.clientY - containerRect.top - dragOffsetY;
  currentDrag.style.transform = `translate(${x}px, ${y}px)`;
}

function dragEnd(e) {
  if (!currentDrag) return;
  const containerRect = gridContainer.getBoundingClientRect();
  const columns = parseInt(columnsInput.value);
  const rows = parseInt(rowsInput.value);
  const gap = parseInt(gapInput.value);
  // Calculate cell dimensions based on fixed grid container
  const totalGapX = gap * (columns - 1);
  const totalGapY = gap * (rows - 1);
  const cellWidth = (gridContainer.clientWidth - totalGapX) / columns;
  const cellHeight = (gridContainer.clientHeight - totalGapY) / rows;

  const dropX = e.clientX - containerRect.left;
  const dropY = e.clientY - containerRect.top;

  let newCol = Math.floor(dropX / (cellWidth + gap)) + 1;
  let newRow = Math.floor(dropY / (cellHeight + gap)) + 1;
  newCol = Math.max(1, Math.min(newCol, columns));
  newRow = Math.max(1, Math.min(newRow, rows));

  // Update dataset and reposition the grid item
  currentDrag.dataset.colStart = newCol;
  currentDrag.dataset.rowStart = newRow;
  currentDrag.style.gridColumn = `${newCol} / span ${currentDrag.dataset.colSpan}`;
  currentDrag.style.gridRow = `${newRow} / span ${currentDrag.dataset.rowSpan}`;
  // Reset temporary styles
  currentDrag.style.position = "";
  currentDrag.style.transform = "";
  currentDrag.style.zIndex = "";
  currentDrag = null;
  document.removeEventListener("mousemove", dragging);
  document.removeEventListener("mouseup", dragEnd);
  updateGrid(); // Refresh add buttons
}

// --- Resizing Functionality (adjust grid span without moving the start cell) ---
function resizeStartHandler(e) {
  e.stopPropagation();
  currentResize = e.currentTarget.parentElement;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  originalColSpan = parseInt(currentResize.dataset.colSpan) || 1;
  originalRowSpan = parseInt(currentResize.dataset.rowSpan) || 1;
  document.addEventListener("mousemove", resizing);
  document.addEventListener("mouseup", resizeEnd);
}

function resizing(e) {
  if (!currentResize) return;
  const columns = parseInt(columnsInput.value);
  const rows = parseInt(rowsInput.value);
  const gap = parseInt(gapInput.value);
  const totalGapX = gap * (columns - 1);
  const totalGapY = gap * (rows - 1);
  const cellWidth = (gridContainer.clientWidth - totalGapX) / columns;
  const cellHeight = (gridContainer.clientHeight - totalGapY) / rows;

  const deltaX = e.clientX - resizeStartX;
  const deltaY = e.clientY - resizeStartY;
  let deltaCols = Math.round(deltaX / (cellWidth + gap));
  let deltaRows = Math.round(deltaY / (cellHeight + gap));
  const newColSpan = Math.max(1, originalColSpan + deltaCols);
  const newRowSpan = Math.max(1, originalRowSpan + deltaRows);

  currentResize.dataset.colSpan = newColSpan;
  currentResize.dataset.rowSpan = newRowSpan;
  currentResize.style.gridColumn = `${currentResize.dataset.colStart} / span ${newColSpan}`;
  currentResize.style.gridRow = `${currentResize.dataset.rowStart} / span ${newRowSpan}`;
}

function resizeEnd(e) {
  currentResize = null;
  document.removeEventListener("mousemove", resizing);
  document.removeEventListener("mouseup", resizeEnd);
  updateGrid(); // Refresh add buttons after resizing
}

// --- Code Generation Functionality ---
function generateCode() {
  const columns = parseInt(columnsInput.value);
  const rows = parseInt(rowsInput.value);
  const gap = parseInt(gapInput.value);
  let itemsCode = "";
  const gridItems = gridContainer.querySelectorAll(".grid-item");
  gridItems.forEach((item, index) => {
    const colStart = item.dataset.colStart;
    const rowStart = item.dataset.rowStart;
    const colSpan = item.dataset.colSpan;
    const rowSpan = item.dataset.rowSpan;
    const label = item.querySelector(".grid-label")
      ? item.querySelector(".grid-label").innerText.trim()
      : "Item " + (index + 1);
    itemsCode += `<div class="grid-item" style="grid-column: ${colStart} / span ${colSpan}; grid-row: ${rowStart} / span ${rowSpan};">${label}</div>\n`;
  });
  const cssCode = `display: grid;\ngrid-template-columns: repeat(${columns}, 1fr);\ngrid-template-rows: repeat(${rows}, 1fr);\ngap: ${gap}px;\nwidth: 800px;`;
  generatedCode.textContent = `<div class="grid-container">\n${itemsCode}</div>\n\n<style>\n.grid-container {\n  ${cssCode}\n}\n.grid-item {\n  /* Add your grid item styles here */\n}\n</style>`;
  codeContainer.style.display = "block";
}

// Auto-update grid when grid parameters change
columnsInput.addEventListener("input", updateGrid);
rowsInput.addEventListener("input", updateGrid);
gapInput.addEventListener("input", updateGrid);

resetGridButton.addEventListener("click", () => {
  gridContainer.innerHTML = "";
  updateGrid();
});
generateCodeButton.addEventListener("click", generateCode);

updateGrid(); // Initial grid setup
// </script>
