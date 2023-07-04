// This is simple a mindmap app
const map = document.getElementById('map')!;
const notes = document.getElementById('notes')!;

if (!map || !notes) {
  throw new Error('Missing map or notes');
}

// Class for a node
class RNode {
  name: string;
  parent?: RNode;
  children: RNode[] = []
  element?: HTMLElement;

  constructor(name: string, parent?: RNode) {
    this.name = name;
    this.parent = parent;
    this.children = [];
  }

  // add a child to the node
  addChild(name: string) {
    const node = new RNode(name, this)
    this.children.push(node);
    return node;
  }
}

// Initial test data
let root!: RNode;

let focused!: RNode; // TODO
let selected: RNode | undefined; // TODO

const keyListeners = ([
  createNode,
  createTestNodes,
  renameNode,
  deleteNode,
  focusNextNode,
  focusParentNode,
  focusPreviousNode,
  focusSelectedNode,
  searchNodes,
  selectNextNode,
  selectPreviousNode,
] as EventListener[]).map(stopPropagation);

function stopPropagation(listener: EventListener) {
  return (event: Event) => {
    event.stopPropagation();
    return listener(event);
  };
}

function registerListeners() {
  map.addEventListener('click', focusedNode);
  keyListeners.forEach((listener) => {
    document.addEventListener('keydown', listener);
  });
}

function removeListeners() {
  // map.removeEventListener('click', focusedNode);
  keyListeners.forEach((listener) => {
    document.removeEventListener('keydown', listener);
  });
}

// When a node is clicked, it becomes the focused node
function focusedNode(event: MouseEvent) {
  const node = event.target as HTMLElement;
  if (node?.classList?.contains('circle')) {
    const name = node.innerHTML;
    focused = findNode(name) ?? focused;
    map.innerHTML = '';
    drawNodes();
  }
}

// When ESC or P is pressed, the focused node goes back to the parent
function focusParentNode(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'p') {
    if (focused.parent) {
      focused = focused.parent;
      selectFirstChild(focused);
      map.innerHTML = '';
      drawNodes();
    }
  }
}

// When C is pressed, a new node is added to the focused node
// An input is shown to enter the name of the node
function createNode(event: KeyboardEvent) {
  if (event.key === 'c') {
    const name = prompt('Enter name');
    if (name) {
      const created = focused.addChild(name);
      selectNode(created);
      map.innerHTML = '';
      drawNodes();
      app.onChange();
    }
  }
}

// When R is pressed, the focused node is renamed
// An input is shown to enter the new name of the node
function renameNode(event: KeyboardEvent) {
  if (event.key === 'r') {
    const target = selected ?? focused;
    const name = prompt('Enter new name', target.name);
    if (name && name != target.name) {
      target.name = name;
      map.innerHTML = '';
      drawNodes();
      app.onChange();
    }
  }
}

// When N or J is pressed, the next children is selected.
// Selecting a node means it is highlighted and the notes are updated
function selectNextNode(event: KeyboardEvent) {
  if (event.key === 'n' || event.key === 'j') {
    if (!selected) {
      return;
    }
    const index = focused.children.indexOf(selected);
    if (index === -1) {
      return;
    }
    let next;
    if (index === focused.children.length - 1) {
      next = focused.children[0];
    } else {
      next = focused.children[index + 1];
    }
    selectNode(next);
    /* updateNotes(); */
  }
}

// When J or K is pressed, the previous children is selected.
function selectPreviousNode(event: KeyboardEvent) {
  if (event.key === 'p' || event.key === 'k') {
    if (!selected) {
      return;
    }
    const index = focused.children.indexOf(selected);
    if (index === -1) {
      return;
    }
    let next;
    if (index === 0) {
      next = focused.children[focused.children.length - 1];
    } else {
      next = focused.children[index - 1];
    }
    /* updateNotes(); */
    selectNode(next);
  }
}

// When Enter is pressed, the selected node becomes the focused node
function focusSelectedNode(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    if (!selected) {
      return null;
    }
    focused = selected;
    selectFirstChild(selected);
    map.innerHTML = '';
    drawNodes();
  }
}

// When shift + N is pressed, the next sibling of the focused node is focused
// If there is no next sibling, the first sibling is focused
// If there is no sibling, show a quick message that fades away after 1 second
function focusNextNode(event: KeyboardEvent) {
  if (event.shiftKey && (event.key === 'n' || event.key === 'j')) {
    if (!focused.parent || focused.parent.children.length === 1) {
      showNotification('No siblings');
      return;
    }

    const siblings = focused.parent.children;
    const index = siblings.indexOf(focused);
    focused = (index === siblings.length - 1) ? siblings[0] : siblings[index + 1];
    // selectFirstChild(selected);
    map.innerHTML = '';
    drawNodes();
  }
}

// When shift + P is pressed, the previous sibling of the focused node is focused
// If there is no previous sibling, the last sibling is focused
// If there is no sibling, show a quick message that fades away after 1 second
function focusPreviousNode(event: KeyboardEvent) {
  if (event.shiftKey && (event.key === 'p' || event.key === 'k')) {
    if (!focused.parent || focused.parent.children.length === 1) {
      showNotification('No siblings');
      return;
    }

    const siblings = focused.parent.children;
    const index = siblings.indexOf(focused) ?? -1;
    focused = (index === 0) ? siblings[siblings.length - 1] : siblings[index - 1];
    selectFirstChild(focused);
    map.innerHTML = '';
    drawNodes();
  }
}

// when T is pressed, some fake data is added to the focused node
function createTestNodes(event: KeyboardEvent) {
  if (event.key === 't') {
    focused.addChild('fake 1');
    focused.addChild('fake 2');
    focused.addChild('fake 3');
    map.innerHTML = '';
    drawNodes();
  }
}

// when D is pressed, the focused node is deleted
function deleteNode(event: KeyboardEvent) {
  if (event.key === 'd') {
    if (focused.parent) {
      // ask for confirmation
      const confirm = window.confirm(`Are you sure you want to delete ${focused.name}?`);
      if (!confirm) {
        return;
      }

      const index = focused.parent.children.indexOf(focused);
      focused.parent.children.splice(index, 1);
      focused = focused.parent;
      map.innerHTML = '';
      drawNodes();
      app.onChange();
    } else {
      showNotification('Cannot delete root');
    }
  }
}

function selectFirstChild(node: RNode) {
  if (selected) {
    removeHighlight(selected);
  }
  if (node.children.length > 0) {
    selected = node.children[0];
    highlight(selected);
  }
}

// when F is pressed, a search input is shown
// the input provides autocomplete with the names of the nodes
// when a node is focused, it becomes the focused node
function searchNodes(event: KeyboardEvent) {
  event.preventDefault();
  if (event.key === 'f') {
    removeListeners();
    const input = document.createElement('input');
    input.classList.add('search');
    input.placeholder = 'Search';
    map.appendChild(input);
    input.focus();

    const list = document.createElement('ul');
    input.addEventListener('keyup', (event) => {
      event.stopPropagation();
      // when Enter is pressed, focus the first result
      if (event.key === 'Enter') {
        const result = document.querySelector('.results li');
        if (result) {
          const name = result.innerHTML;
          focused = findNode(name) ?? focused;
          registerListeners();
          map.innerHTML = '';
          drawNodes();
          return;
        }
      }

      // clear list
      list.innerHTML = '';

      if (!event.target) {
        return;
      }

      const value = (event.target as HTMLInputElement).value;
      const results = findNodes(value);
      list.classList.add('results');
      results.forEach((result) => {
        const item = document.createElement('li');
        item.innerHTML = result.name;
        list.appendChild(item);
      });
      map.appendChild(list);
    });
  }
}

function showNotification(message: string) {
  const messageElement = document.createElement('div');
  messageElement.innerHTML = message;
  messageElement.classList.add('notification');
  map.appendChild(messageElement);
  setTimeout(() => {
    messageElement.classList.add('fade');
  }, 1000);
  // remove div after 1 second
  setTimeout(() => {
    map.removeChild(messageElement);
  }, 2000);
}

function saveToLocalStorage() {
  const data = JSON.stringify(root, (key, value) => {
    if (key === 'parent') {
      return undefined;
    }
    return value;
  });
  console.log(`Saving to local storage: ${data}`);
  localStorage.setItem('data', data);
}

function loadFromLocalStorage() {
  const data = localStorage.getItem('data');
  if (!data) {
    return null;
  }
  try {
    const parsed = JSON.parse(data);
    console.log(`Reading from local storage: ${JSON.stringify(parsed, null, 2)}`);
    return unmarshallNodes(parsed);
  } catch (error) {
    console.error(error);
    return null;
  }
}

// marshall root node into a RNode
function unmarshallNodes(root: any, parent?: RNode): RNode {
  const node = new RNode(root.name, parent);
  node.children = root.children.map((child: string) => unmarshallNodes(child, node));
  return node;
}

function findNode(name: string, node: RNode = root): RNode | null {
  if (node.name === name) {
    return node;
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const found = findNode(name, child);
    if (found) {
      return found;
    }
  }
  return null;
}

function findNodes(partialName: string) {
  const results: RNode[] = [];
  function find(node: RNode) {
    if (node.name.includes(partialName)) {
      if (node !== root) {
        results.push(node);
      }
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      find(child);
    }
  }
  find(root);
  return results;
}

/* Draw nodes as circles
   Root node is in the center
   Children are drawn in a circle around the parent
   Children of children are not drawn
   When a children is focused, it goes to the center
 */
function drawNodes() {
  drawNode(focused);
  // drawn children
  focused.children.forEach((child, index) => {
    // find parent x,y based on screen size
    const parentX = window.innerWidth / 2;
    const parentY = window.innerHeight / 2;

    let angle = (index / focused.children.length) * 2 * Math.PI;
    // update the angle so the first child is on top
    angle -= Math.PI / 2;
    const x = parentX + 200 * Math.cos(angle);
    const y = parentY + 200 * Math.sin(angle);

    drawNode(child, x, y);
    drawLine({ x: parentX, y: parentY }, { x, y }, angle);
  });
}

function selectNode(node: RNode) {
  if (selected) {
    removeHighlight(selected);
  }
  selected = node;
  highlight(selected);
}

function removeHighlight(node: RNode) {
  if (node.element) {
    node.element.classList.remove('selected');
  }
}

function highlight(node: RNode) {
  if (node.element) {
    node.element.classList.add('selected');
  }
}

function drawNode(node: RNode, x?: number, y?: number) {
  const nodeElement = document.createElement('div');
  nodeElement.classList.add('circle');
  if (node === focused) {
    nodeElement.classList.add('focused');
  }
  else if (node === selected) {
    nodeElement.classList.add('selected');
  }
  nodeElement.innerHTML = node.name;
  if (x && y) {
    nodeElement.style.left = x + 'px';
    nodeElement.style.top = y + 'px';
  }
  map.appendChild(nodeElement);
  node.element = nodeElement;
}

// draw an angled line between two nodes
function drawLine(from: { x: number, y: number }, to: { x: number, y: number }, angle: number) {
  const lineElement = document.createElement('div');
  const left = (from.x + to.x) / 2 - 50 * Math.cos(angle);
  const top = (from.y + to.y) / 2 - 50 * Math.sin(angle);
  lineElement.style.position = 'absolute';
  lineElement.style.left = left + 'px';
  lineElement.style.top = top + 'px';
  lineElement.style.width = '100px';
  lineElement.style.height = '1px';
  lineElement.style.backgroundColor = 'black';
  lineElement.style.transformOrigin = '0 0';
  lineElement.style.transform = `rotate(${angle}rad)`;
  map.appendChild(lineElement);
}

class MapSection {
  el: HTMLElement;
  constructor() {
    this.el = document.getElementById('map')!;
  }
}

class NotesSection {
  el: HTMLElement;
  constructor() {
    this.el = document.getElementById('notes')!;
  }

  updateNotes(notes: string) {
    this.el.innerHTML = notes;
  }
}

class App {
  map = new MapSection();
  notes = new NotesSection();

  init() {
    root = loadFromLocalStorage() ?? new RNode('root');
    focused = root;
    selected = root.children[0];
    drawNodes();
    registerListeners();
    this.notes.updateNotes('Press C to add a node, ESC to go back to the parent, N to focus the next sibling, P to focus the previous sibling, D to delete the focused node, T to add some test nodes, F to search for a node');
  }

  onChange() {
    saveToLocalStorage();
  }
}

const app = new App();
app.init();
